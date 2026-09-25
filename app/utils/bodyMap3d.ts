import * as THREE from 'three'

/*
 * A procedural adult human for the 3D body map: smooth lofted torso, shaped head, arms with
 * hands and fingers, legs with feet, standing in a relaxed pose.
 *
 * The figure is modelled in real units (metres, soles at y = 0, crown at 1.72 m) and then scaled
 * into the scene space the body map has always used (soles at -0.29, crown at 2.14), so pins
 * saved against the earlier mannequin still land on the body.
 *
 * Orientation: +y up, +z is the patient's front (facing the camera), +x is the patient's LEFT.
 */

export const FIGURE_SCALE = 2.43 / 1.72
export const FIGURE_OFFSET_Y = -0.29
/** Scene-space centre of the figure, used as the orbit target. */
export const FIGURE_CENTER = new THREE.Vector3(0, FIGURE_OFFSET_Y + 0.9 * FIGURE_SCALE, 0)

export type BodyPart = 'head' | 'neck' | 'torso' | 'arm_L' | 'arm_R' | 'leg_L' | 'leg_R'

/** Medium warm skin tone; soft sheen instead of plastic shine. */
export function createSkinMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd2a07e,
    roughness: 0.62,
    metalness: 0,
    sheen: 0.35,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(0xffc4a8),
    clearcoat: 0.04,
    clearcoatRoughness: 0.6
  })
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

/** Piecewise profile with smooth (smoothstep) blending between keyframes [t, value]. */
function profile(keys: Array<[number, number]>): (t: number) => number {
  return (t: number) => {
    if (t <= keys[0]![0]) return keys[0]![1]
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i]!
      const [t0, v0] = keys[i - 1]!
      if (t <= t1) {
        const u = (t - t0) / (t1 - t0)
        const s = u * u * (3 - 2 * u)
        return v0 + (v1 - v0) * s
      }
    }
    return keys[keys.length - 1]![1]
  }
}

interface Ring {
  /** height */ y: number
  /** half width (x) */ w: number
  /** depth to the front */ zf: number
  /** depth to the back */ zb: number
  /** forward offset of the ring centre (posture) */ zc: number
}

/**
 * Lofts horizontal super-elliptic rings into a closed, seamless surface. The front and back
 * depths differ, which gives the chest, belly, shoulder blades and buttocks their shape.
 */
function loftRings(rings: Ring[], radial = 56, sub = 6, exponent = 2.35, capBottom = true): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const pick = (i: number) => rings[Math.max(0, Math.min(rings.length - 1, i))]!
  const rows: Ring[] = []
  for (let i = 0; i < rings.length - 1; i++) {
    for (let s = 0; s < sub; s++) {
      const t = s / sub
      const a = pick(i - 1)
      const b = pick(i)
      const c = pick(i + 1)
      const d = pick(i + 2)
      rows.push({
        y: catmullRom(a.y, b.y, c.y, d.y, t),
        w: catmullRom(a.w, b.w, c.w, d.w, t),
        zf: catmullRom(a.zf, b.zf, c.zf, d.zf, t),
        zb: catmullRom(a.zb, b.zb, c.zb, d.zb, t),
        zc: catmullRom(a.zc, b.zc, c.zc, d.zc, t)
      })
    }
  }
  rows.push(rings[rings.length - 1]!)

  const e = 2 / exponent
  for (const r of rows) {
    for (let k = 0; k < radial; k++) {
      const th = (k / radial) * Math.PI * 2
      const c = Math.cos(th)
      const s = Math.sin(th)
      const x = r.w * Math.sign(c) * Math.abs(c) ** e
      const z = r.zc + (s >= 0 ? r.zf : r.zb) * Math.sign(s) * Math.abs(s) ** e
      positions.push(x, r.y, z)
    }
  }
  for (let j = 0; j < rows.length - 1; j++) {
    for (let k = 0; k < radial; k++) {
      const a = j * radial + k
      const b = j * radial + ((k + 1) % radial)
      const c = (j + 1) * radial + k
      const d = (j + 1) * radial + ((k + 1) % radial)
      indices.push(a, c, b, b, c, d)
    }
  }
  if (capBottom) {
    const first = rows[0]!
    const centre = positions.length / 3
    positions.push(0, first.y, first.zc)
    for (let k = 0; k < radial; k++) indices.push(centre, k, (k + 1) % radial)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/**
 * Sweeps an elliptical cross-section along a smooth path. The section's "front" axis follows
 * world +z, so a limb never twists the way Frenet frames can on a near-straight path.
 */
function sweep(
  points: THREE.Vector3[],
  radius: (t: number) => number,
  lateral: (t: number) => number,
  tubular = 48,
  radial = 28
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const positions: number[] = []
  const indices: number[] = []
  const front = new THREE.Vector3(0, 0, 1)
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular
    const p = curve.getPointAt(t)
    const tan = curve.getTangentAt(t)
    const n = front.clone().sub(tan.clone().multiplyScalar(tan.dot(front))).normalize()
    const b = new THREE.Vector3().crossVectors(tan, n).normalize()
    const r = radius(t)
    const kx = lateral(t)
    for (let k = 0; k < radial; k++) {
      const a = (k / radial) * Math.PI * 2
      const v = p.clone()
        .addScaledVector(b, Math.cos(a) * r * kx)
        .addScaledVector(n, Math.sin(a) * r)
      positions.push(v.x, v.y, v.z)
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let k = 0; k < radial; k++) {
      const a = i * radial + k
      const b = i * radial + ((k + 1) % radial)
      const c = (i + 1) * radial + k
      const d = (i + 1) * radial + ((k + 1) % radial)
      indices.push(a, c, b, b, c, d)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/** A unit sphere reshaped vertex by vertex. */
function sculptedSphere(
  widthSegments: number,
  heightSegments: number,
  shape: (v: THREE.Vector3) => void
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, widthSegments, heightSegments)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    shape(v)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

// ---------------------------------------------------------------------------
// Body parts (real units)
// ---------------------------------------------------------------------------

const TORSO_RINGS: Ring[] = [
  { y: 0.74, w: 0.110, zf: 0.055, zb: 0.065, zc: 0.000 }, // crotch, hidden between the thighs
  { y: 0.80, w: 0.152, zf: 0.078, zb: 0.094, zc: 0.000 },
  { y: 0.86, w: 0.172, zf: 0.085, zb: 0.118, zc: 0.000 }, // buttocks
  { y: 0.93, w: 0.176, zf: 0.090, zb: 0.112, zc: 0.000 }, // hips
  { y: 0.99, w: 0.163, zf: 0.095, zb: 0.094, zc: 0.004 }, // iliac crest
  { y: 1.05, w: 0.138, zf: 0.092, zb: 0.082, zc: 0.006 }, // waist
  { y: 1.12, w: 0.144, zf: 0.095, zb: 0.086, zc: 0.006 },
  { y: 1.20, w: 0.160, zf: 0.104, zb: 0.092, zc: 0.006 }, // lower ribs
  { y: 1.28, w: 0.176, zf: 0.116, zb: 0.098, zc: 0.004 }, // nipple line
  { y: 1.35, w: 0.172, zf: 0.106, zb: 0.098, zc: 0.000 }, // armpits
  { y: 1.40, w: 0.168, zf: 0.086, zb: 0.090, zc: -0.004 }, // shoulders
  { y: 1.43, w: 0.148, zf: 0.070, zb: 0.076, zc: -0.005 },
  { y: 1.455, w: 0.104, zf: 0.058, zb: 0.062, zc: -0.006 }, // trapezius slope
  { y: 1.475, w: 0.062, zf: 0.052, zb: 0.052, zc: -0.004 } // neck base
]

function createHead(): THREE.BufferGeometry {
  // Cranium, then a narrower jaw and a chin brought slightly forward.
  const geo = sculptedSphere(56, 40, (v) => {
    const { x, y, z } = v
    let X = x * 0.079
    const Y = y * 0.115
    let Z = z * 0.098
    if (y < 0) {
      const k = (-y) ** 1.5
      X *= 1 - 0.36 * k
      Z *= 1 - 0.22 * k
      Z += 0.012 * k
    }
    if (y > 0.25) X *= 1 - 0.07 * (y - 0.25)
    if (z < 0 && y > -0.3) Z *= 1.07 // occiput
    v.set(X, Y, Z)
  })
  geo.translate(0, 1.605, 0.012)
  return geo
}

function createNose(): THREE.BufferGeometry {
  const geo = sculptedSphere(20, 16, (v) => {
    const k = v.y < 0 ? 1 : 1 - 0.45 * v.y // narrower at the bridge
    v.set(v.x * 0.012 * k, v.y * 0.028, v.z * 0.017)
  })
  geo.rotateX(-0.18)
  geo.translate(0, 1.596, 0.106)
  return geo
}

function createEar(side: 1 | -1): THREE.BufferGeometry {
  const geo = sculptedSphere(16, 12, v => v.set(v.x * 0.009, v.y * 0.028, v.z * 0.018))
  geo.rotateY(side * 0.35)
  geo.translate(side * 0.08, 1.604, -0.004)
  return geo
}

function createNeck(): THREE.BufferGeometry {
  return loftRings([
    { y: 1.44, w: 0.062, zf: 0.054, zb: 0.054, zc: -0.004 },
    { y: 1.50, w: 0.054, zf: 0.052, zb: 0.050, zc: 0.000 },
    { y: 1.56, w: 0.052, zf: 0.050, zb: 0.048, zc: 0.006 }
  ], 40, 4, 2.2, false)
}

function createArm(side: 1 | -1): THREE.Group {
  const group = new THREE.Group()
  const shoulder = new THREE.Vector3(side * 0.178, 1.395, -0.004)
  const elbow = new THREE.Vector3(side * 0.222, 1.11, -0.024)
  const wrist = new THREE.Vector3(side * 0.248, 0.865, 0.018)

  const radius = profile([[0, 0.05], [0.12, 0.049], [0.32, 0.043], [0.48, 0.035], [0.6, 0.039], [0.8, 0.031], [1, 0.024]])
  // Upper arm is round, the forearm flatter from side to side toward the wrist.
  const lateral = profile([[0, 1], [0.5, 1], [0.75, 0.82], [1, 0.72]])
  const armGeo = sweep([shoulder, elbow, wrist], radius, lateral)
  group.add(new THREE.Mesh(armGeo))

  // Deltoid cap over the shoulder joint.
  // Deltoid: a teardrop that blends from the shoulder slope into the upper arm.
  const deltoid = sculptedSphere(28, 20, v => v.set(v.x * 0.054, v.y * (v.y > 0 ? 0.05 : 0.085), v.z * 0.055))
  deltoid.translate(shoulder.x + side * 0.004, shoulder.y - 0.018, shoulder.z)
  group.add(new THREE.Mesh(deltoid))

  group.add(createHand(side, elbow, wrist))
  return group
}

function createHand(side: 1 | -1, elbow: THREE.Vector3, wrist: THREE.Vector3): THREE.Group {
  const hand = new THREE.Group()
  const dir = wrist.clone().sub(elbow).normalize()
  hand.position.copy(wrist)
  hand.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir)

  // Palm faces the thigh: thin along x, broad along z.
  const palm = new THREE.CapsuleGeometry(0.03, 0.045, 6, 16)
  palm.scale(0.5, 1, 1.25)
  palm.translate(0, -0.05, 0)
  hand.add(new THREE.Mesh(palm))

  const fingerLengths = [0.046, 0.052, 0.049, 0.04]
  fingerLengths.forEach((len, i) => {
    const finger = new THREE.CapsuleGeometry(0.0085, len, 4, 10)
    finger.translate(0, -len / 2, 0)
    finger.rotateX((i - 1.5) * 0.06)
    finger.rotateZ(side * 0.08)
    finger.translate(-side * 0.002, -0.088, 0.028 - i * 0.0185)
    hand.add(new THREE.Mesh(finger))
  })

  const thumb = new THREE.CapsuleGeometry(0.0105, 0.034, 4, 10)
  thumb.translate(0, -0.017, 0)
  thumb.rotateX(-0.75)
  thumb.translate(-side * 0.004, -0.03, 0.03)
  hand.add(new THREE.Mesh(thumb))
  return hand
}

function createLeg(side: 1 | -1): THREE.Group {
  const group = new THREE.Group()
  const hip = new THREE.Vector3(side * 0.085, 0.93, 0.004)
  const knee = new THREE.Vector3(side * 0.096, 0.5, 0.014)
  const ankle = new THREE.Vector3(side * 0.094, 0.085, -0.012)

  const radius = profile([[0, 0.084], [0.1, 0.092], [0.2, 0.086], [0.4, 0.066], [0.5, 0.05], [0.6, 0.056], [0.68, 0.058], [0.85, 0.04], [1, 0.03]])
  const lateral = profile([[0, 1.05], [0.45, 1], [0.5, 1.05], [0.62, 0.95], [1, 0.9]])
  group.add(new THREE.Mesh(sweep([hip, knee, ankle], radius, lateral, 56, 30)))

  // Kneecap
  const patella = sculptedSphere(16, 12, v => v.set(v.x * 0.03, v.y * 0.034, v.z * 0.018))
  patella.translate(knee.x, knee.y + 0.01, knee.z + 0.042)
  group.add(new THREE.Mesh(patella))

  group.add(new THREE.Mesh(createFoot(side, ankle)))
  return group
}

function createFoot(side: 1 | -1, ankle: THREE.Vector3): THREE.BufferGeometry {
  const geo = sculptedSphere(36, 22, (v) => {
    let X = v.x * 0.046
    let Y = v.y * 0.045
    const Z = v.z * 0.128
    if (v.z > 0) X *= 1 - 0.18 * v.z // toes narrow
    if (v.z > 0.2) Y *= 1 - 0.5 * (v.z - 0.2) // instep slopes down to the toes
    if (Y < -0.03) Y = -0.03 // flat sole
    v.set(X, Y, Z)
  })
  geo.translate(ankle.x + side * 0.004, 0.03, ankle.z + 0.07)
  return geo
}

/** Builds the whole figure in scene space; every mesh is tagged with its body part. */
export function createHumanFigure(material: THREE.Material): THREE.Group {
  const figure = new THREE.Group()
  const add = (object: THREE.Object3D, part: BodyPart) => {
    object.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh
        mesh.material = material
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.userData.part = part
      }
    })
    figure.add(object)
  }

  add(new THREE.Mesh(loftRings(TORSO_RINGS)), 'torso')
  add(new THREE.Mesh(createNeck()), 'neck')
  const head = new THREE.Group()
  head.add(new THREE.Mesh(createHead()), new THREE.Mesh(createNose()), new THREE.Mesh(createEar(1)), new THREE.Mesh(createEar(-1)))
  add(head, 'head')
  add(createArm(1), 'arm_L')
  add(createArm(-1), 'arm_R')
  add(createLeg(1), 'leg_L')
  add(createLeg(-1), 'leg_R')

  figure.scale.setScalar(FIGURE_SCALE)
  figure.position.y = FIGURE_OFFSET_Y
  return figure
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

/**
 * The anatomical region (a code from data/anatomyData.ts) under a point on the skin.
 * `local` is in the figure's real units; +x is the patient's left, +z the front.
 */
export function regionAt(local: THREE.Vector3, part: BodyPart): string {
  const { x, y, z } = local
  const left = x > 0
  switch (part) {
    case 'head': return 'BRAIN'
    case 'neck': return z >= 0 ? 'THYROID' : 'SPINE_CERVICAL'
    case 'arm_L': return 'SHOULDER_L'
    case 'arm_R': return 'SHOULDER_R'
    case 'leg_L': return y > 0.3 ? 'KNEE_L' : 'ANKLE_L'
    case 'leg_R': return y > 0.3 ? 'KNEE_R' : 'ANKLE_R'
  }

  const ax = Math.abs(x)
  if (z < 0) {
    // Back
    if (y >= 1.2) return 'SPINE_THORACIC'
    if (y >= 1.0) return ax > 0.06 && y > 1.02 && y < 1.16 ? (left ? 'KIDNEY_L' : 'KIDNEY_R') : 'SPINE_LUMBAR'
    return 'GLUTEAL'
  }

  // Front and sides
  if (y >= 1.22) {
    if (y < 1.37 && x > -0.02 && x < 0.11) return 'HEART'
    if (y > 1.24 && y < 1.33 && ax > 0.07 && ax < 0.16) return left ? 'BREAST_L' : 'BREAST_R'
    return left ? 'LUNG_L' : 'LUNG_R'
  }
  if (ax > 0.13 && y > 1.02) return left ? 'KIDNEY_L' : 'KIDNEY_R' // flank
  if (y >= 1.1) {
    if (x < -0.05 && x > -0.1 && y < 1.15) return 'GALLBLADDER'
    if (x < -0.04) return 'LIVER'
    if (x >= 0 && x < 0.08 && y < 1.14) return 'PANCREAS'
    return 'STOMACH'
  }
  if (y >= 0.99) return ax < 0.07 ? 'INTESTINE_SMALL' : 'COLON'
  if (y >= 0.92) return ax < 0.06 ? 'UTERUS_OVARIES' : 'COLON'
  if (ax < 0.08) return 'BLADDER'
  return y > 0.86 ? 'UTERUS_OVARIES' : 'GLUTEAL'
}

/** Camera positions for the view presets, around FIGURE_CENTER. */
export const CAMERA_PRESETS = {
  front: new THREE.Vector3(0, 0.2, 5.6),
  back: new THREE.Vector3(0, 0.2, -5.6),
  left: new THREE.Vector3(5.6, 0.2, 0),
  right: new THREE.Vector3(-5.6, 0.2, 0)
} as const

export type CameraPreset = keyof typeof CAMERA_PRESETS
