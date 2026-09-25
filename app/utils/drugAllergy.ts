/**
 * Returns the allergy (or allergy family) a medicine conflicts with, or null.
 * Name-based only: it catches the common families, it is not a full drug-interaction check.
 */
export function checkDrugAllergy(medName: string, allergies: string[]): string | null {
  if (!allergies || allergies.length === 0 || !medName) return null
  const m = medName.toLowerCase().trim()
  for (const allergy of allergies) {
    const a = allergy.toLowerCase().trim()
    if (!a) continue

    // Direct match
    if (m.includes(a) || a.includes(m)) return allergy

    // Penicillin family
    if (a.includes('penicillin') || a.includes('amox') || a.includes('ampic')) {
      if (
        m.includes('penicillin') || m.includes('amox') || m.includes('ampic')
        || m.includes('augmentin') || m.includes('cloxacillin') || m.includes('piperacillin')
      ) {
        return `${allergy} (ក្រុមប៉េនីស៊ីលីន / Penicillin Family)`
      }
    }

    // Cephalosporins
    if (a.includes('cef') || a.includes('ceph')) {
      if (m.includes('cef') || m.includes('ceph')) {
        return `${allergy} (ក្រុមសេហ្វាឡូស្ប៉ូរីន / Cephalosporin Family)`
      }
    }

    // NSAIDs
    if (a.includes('aspirin') || a.includes('ibuprofen') || a.includes('nsaid')) {
      if (
        m.includes('aspirin') || m.includes('ibuprofen') || m.includes('diclofenac')
        || m.includes('naproxen') || m.includes('ketoprofen') || m.includes('meloxicam')
        || m.includes('mefenamic')
      ) {
        return `${allergy} (ក្រុមបំបាត់ការឈឺចាប់ NSAID)`
      }
    }

    // Sulfa
    if (a.includes('sulfa')) {
      if (m.includes('sulfa') || m.includes('bactrim') || m.includes('cotrimoxazole') || m.includes('septra')) {
        return `${allergy} (ក្រុមស៊ុលហ្វា / Sulfonamide Family)`
      }
    }

    // Quinolones
    if (a.includes('cipro') || a.includes('quinolone')) {
      if (m.includes('cipro') || m.includes('levofloxacin') || m.includes('ofloxacin') || m.includes('norfloxacin')) {
        return `${allergy} (ក្រុម Fluoroquinolone)`
      }
    }

    // Paracetamol
    if (a.includes('paracetamol') || a.includes('acetaminophen')) {
      if (m.includes('paracetamol') || m.includes('acetaminophen') || m.includes('panadol') || m.includes('tylenol')) {
        return `${allergy} (ប៉ារ៉ាសេតាមុល / Paracetamol)`
      }
    }
  }
  return null
}
