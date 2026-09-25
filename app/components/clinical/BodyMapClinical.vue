<template>
  <div class="font-khmer bg-default border border-default rounded-2xl overflow-hidden shadow-sm transition-all">
    <!-- Header Toolbar -->
    <div class="p-3 bg-muted/90 border-b border-default flex flex-wrap items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center font-bold shadow-sm">
          <UIcon name="i-lucide-activity" class="w-4 h-4" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-highlighted text-sm">
              គំនូសរាងកាយកាយវិភាគសាស្ត្រ (Clinical Interactive Body Map)
            </span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold" :class="markers.length > 0 ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300' : 'bg-elevated text-toned'">
              {{ markers.length }} ចំណុចសម្គាល់
            </span>
          </div>
          <p class="text-[11px] text-muted">
            ចុចផ្ទាល់លើសរីរាង្គ ឬដោតចំណុចឈឺចាប់ របួស និងរោគសញ្ញា
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Layer Selector (Organs / Bones / Skin) -->
        <div v-if="viewMode === '2d'" class="flex items-center bg-accented/80 p-0.5 rounded-lg text-[11px] font-medium">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5"
            :class="anatomicalLayer === 'organs' ? 'bg-default text-primary font-bold shadow-xs' : 'text-toned hover:text-highlighted'"
            @click="anatomicalLayer = 'organs'"
            title="បង្ហាញសរីរាង្គខាងក្នុង (Internal Organs)"
          >
            <UIcon name="i-lucide-heart-pulse" class="w-3.5 h-3.5 text-rose-500" />
            សរីរាង្គក្នុង (Organs)
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5"
            :class="anatomicalLayer === 'skeletal' ? 'bg-default text-primary font-bold shadow-xs' : 'text-toned hover:text-highlighted'"
            @click="anatomicalLayer = 'skeletal'"
            title="បង្ហាញឆ្អឹង និងសន្លាក់ (Skeletal Frame)"
          >
            <UIcon name="i-lucide-bone" class="w-3.5 h-3.5 text-muted" />
            គ្រោងឆ្អឹង (Skeleton)
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5"
            :class="anatomicalLayer === 'surface' ? 'bg-default text-primary font-bold shadow-xs' : 'text-toned hover:text-highlighted'"
            @click="anatomicalLayer = 'surface'"
            title="បង្ហាញរូបរាងកាយក្រៅ/សើស្បែក (Skin / Surface)"
          >
            <UIcon name="i-lucide-user" class="w-3.5 h-3.5 text-amber-500" />
            សើស្បែក (Surface)
          </button>
        </div>

        <!-- 2D View Switcher (Front/Back) -->
        <div v-if="viewMode === '2d'" class="flex items-center bg-accented/80 p-0.5 rounded-lg text-[11px] font-medium">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1"
            :class="twoDView === 'anterior' ? 'bg-default text-primary font-bold shadow-xs' : 'text-toned hover:text-highlighted'"
            @click="twoDView = 'anterior'"
          >
            <UIcon name="i-lucide-arrow-right-circle" class="w-3 h-3" />
            ខាងមុខ (Anterior)
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1"
            :class="twoDView === 'posterior' ? 'bg-default text-primary font-bold shadow-xs' : 'text-toned hover:text-highlighted'"
            @click="twoDView = 'posterior'"
          >
            <UIcon name="i-lucide-arrow-left-circle" class="w-3 h-3" />
            ខាងក្រោយ (Posterior)
          </button>
        </div>

        <!-- 2D / 3D Toggle -->
        <div class="flex items-center bg-accented/80 p-0.5 rounded-lg text-[11px] font-medium">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1"
            :class="viewMode === '2d' ? 'bg-default text-primary shadow-xs font-bold' : 'text-toned hover:text-highlighted'"
            @click="switchViewMode('2d')"
          >
            <UIcon name="i-lucide-layers" class="w-3.5 h-3.5" />
            2D Anatomy Map
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md transition-all flex items-center gap-1"
            :class="viewMode === '3d' ? 'bg-default text-primary shadow-xs font-bold' : 'text-toned hover:text-highlighted'"
            @click="switchViewMode('3d')"
          >
            <UIcon name="i-lucide-box" class="w-3.5 h-3.5" />
            3D Orbit
          </button>
        </div>

        <!-- Camera Snapshot Button for Print -->
        <UButton
          icon="i-lucide-camera"
          color="neutral"
          variant="soft"
          size="xs"
          label="ថតរូប (Snapshot)"
          title="ថតរូបគំនូសរាងកាយសម្រាប់បោះពុម្ពវេជ្ជបញ្ជា/របាយការណ៍"
          @click="captureSnapshot"
        />

        <!-- 3D view presets -->
        <div v-if="viewMode === '3d'" class="flex items-center bg-accented/80 p-0.5 rounded-lg text-[11px] font-medium">
          <button
            v-for="preset in threeDPresets"
            :key="preset.value"
            type="button"
            class="px-2 py-1 rounded-md transition-all"
            :class="activePreset === preset.value ? 'bg-default text-primary font-bold shadow-xs' : 'text-toned hover:text-highlighted'"
            @click="setCameraPreset(preset.value)"
          >
            {{ preset.label }}
          </button>
        </div>

        <!-- Reset 3D camera button -->
        <UButton
          v-if="viewMode === '3d'"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          size="xs"
          title="កំណត់ទិដ្ឋភាពឡើងវិញ"
          @click="resetCamera"
        />
      </div>
    </div>

    <!-- Main Layout: 3-column Grid (Organ Quick-Picker | Anatomy Canvas | Markers & Diagnosis) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 min-h-[560px] relative divide-y lg:divide-y-0 lg:divide-x divide-default">
      
      <!-- Column 1: Organ Checklist / Quick-Select (3 Cols) -->
      <div class="lg:col-span-3 p-3 bg-muted/50 flex flex-col justify-between overflow-hidden">
        <div class="space-y-2.5 flex-1 flex flex-col">
          <!-- Search Organ -->
          <div class="relative">
            <UInput
              v-model="organSearchQuery"
              icon="i-lucide-search"
              size="xs"
              placeholder="ស្វែងរកសរីរាង្គ (ឧ. ក្រពះ, សួត, ស្បូន)..."
              class="w-full text-xs"
              trailing
            />
            <button
              v-if="organSearchQuery"
              class="absolute right-2 top-2 text-dimmed hover:text-toned"
              @click="organSearchQuery = ''"
            >
              <UIcon name="i-lucide-x" class="w-3 h-3" />
            </button>
          </div>

          <!-- System Filter Chips -->
          <div class="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
            <button
              type="button"
              class="px-2 py-0.5 rounded-full shrink-0 transition-colors"
              :class="selectedSystemFilter === 'all' ? 'bg-primary-600 text-white font-bold' : 'bg-accented text-default hover:bg-gray-300'"
              @click="selectedSystemFilter = 'all'"
            >
              ទាំងអស់
            </button>
            <button
              v-for="grp in ORGAN_SYSTEM_GROUPS"
              :key="grp.id"
              type="button"
              class="px-2 py-0.5 rounded-full shrink-0 transition-colors flex items-center gap-1"
              :class="selectedSystemFilter === grp.id ? 'bg-primary-600 text-white font-bold' : 'bg-accented text-default hover:bg-gray-300'"
              @click="selectedSystemFilter = grp.id"
            >
              <UIcon :name="grp.icon" class="w-2.5 h-2.5" />
              <span>{{ grp.nameKh }}</span>
            </button>
          </div>

          <!-- Organ List with Tick/Checkboxes -->
          <div class="flex-1 overflow-y-auto max-h-[420px] space-y-1.5 pr-1 text-xs">
            <div
              v-for="organ in filteredOrgans"
              :key="organ.id"
              class="p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2"
              :class="isOrganSelected(organ.code)
                ? 'bg-primary-50 dark:bg-primary-950/80 border-primary-400 dark:border-primary-600 shadow-xs'
                : hoveredOrganCode === organ.code
                  ? 'bg-elevated border-accented'
                  : 'bg-default border-default hover:border-primary-300'"
              @mouseenter="hoveredOrganCode = organ.code"
              @mouseleave="hoveredOrganCode = null"
              @click="toggleOrganTick(organ)"
            >
              <div class="flex items-center gap-2">
                <!-- Checkbox Tick Icon -->
                <div
                  class="w-4 h-4 rounded flex items-center justify-center transition-colors border"
                  :class="isOrganSelected(organ.code)
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'border-accented bg-default'"
                >
                  <UIcon v-if="isOrganSelected(organ.code)" name="i-lucide-check" class="w-3 h-3 stroke-2" />
                </div>
                <div class="leading-tight">
                  <div class="font-bold text-highlighted text-[11px] flex items-center gap-1">
                    <span>{{ organ.nameKh }}</span>
                    <span v-if="organ.view === 'posterior'" class="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      ខាងក្រោយ
                    </span>
                  </div>
                  <div class="text-[10px] text-muted font-sans">
                    {{ organ.nameEn }}
                  </div>
                </div>
              </div>

              <!-- Quick action icon -->
              <button
                type="button"
                class="p-1 rounded text-dimmed hover:text-primary-600"
                title="កែសម្រួលព័ត៌មានលម្អិតសរីរាង្គនេះ"
                @click.stop="triggerOrganMarkerModal(organ)"
              >
                <UIcon name="i-lucide-edit-3" class="w-3.5 h-3.5" />
              </button>
            </div>

            <div v-if="filteredOrgans.length === 0" class="py-6 text-center text-dimmed text-xs">
              រកមិនឃើញសរីរាង្គដែលត្រូវនឹងពាក្យស្វែងរកឡើយ
            </div>
          </div>
        </div>

        <!-- Quick Summary Bar in Column 1 -->
        <div class="pt-2 border-t border-default text-[11px] text-muted flex items-center justify-between">
          <span>{{ filteredOrgans.length }} សរីរាង្គ</span>
          <span class="text-primary-600 font-semibold cursor-pointer hover:underline" @click="clearAllMarkers">
            កំណត់ឡើងវិញ
          </span>
        </div>
      </div>

      <!-- Column 2: Visual Anatomy Canvas Area (6 Cols) -->
      <div class="lg:col-span-6 bg-gradient-to-b from-slate-100 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative flex flex-col items-center justify-center p-3 overflow-hidden select-none min-h-[500px]">
        
        <!-- 3D Canvas Container -->
        <div
          v-show="viewMode === '3d'"
          ref="canvasContainer"
          class="w-full h-full min-h-[500px] cursor-grab active:cursor-grabbing flex items-center justify-center"
          @click="handle3DClick"
        />

        <!-- Region under the pointer in the 3D view -->
        <div
          v-if="viewMode === '3d' && hoverRegion"
          class="absolute top-3 left-3 pointer-events-none rounded-lg bg-default/90 ring ring-default shadow-sm px-3 py-1.5 font-khmer"
        >
          <p class="text-xs font-semibold text-highlighted">
            {{ hoverRegion.nameKh }}
          </p>
          <p class="text-[11px] text-muted">
            {{ hoverRegion.nameEn }}
          </p>
        </div>

        <!-- 2D High-Definition Anatomical SVG Map Container -->
        <div
          v-show="viewMode === '2d'"
          ref="svgWrapper"
          class="relative w-full max-w-md h-[520px] flex items-center justify-center"
          @click="handleFreePinClick"
        >
          <!-- Tooltip on Hover -->
          <div
            v-if="hoveredOrgan"
            class="absolute top-2 left-2 z-30 pointer-events-none bg-gray-900/90 text-white px-3 py-1.5 rounded-xl text-xs backdrop-blur-md shadow-lg border border-gray-700 animate-in fade-in zoom-in-95 duration-150"
          >
            <div class="font-bold text-emerald-400">{{ hoveredOrgan.nameKh }}</div>
            <div class="text-[10px] text-dimmed">{{ hoveredOrgan.nameEn }}</div>
            <div v-if="hoveredOrgan.commonComplaintsKh.length > 0" class="text-[10px] text-amber-300 mt-0.5">
              • {{ hoveredOrgan.commonComplaintsKh[0] }}
            </div>
          </div>

          <!-- ========================================================= -->
          <!-- 2D ANTERIOR (FRONT VIEW) ANATOMY SVG                      -->
          <!-- ========================================================= -->
          <svg
            v-if="twoDView === 'anterior'"
            viewBox="0 0 400 800"
            class="w-full h-full drop-shadow-xl cursor-crosshair transition-all"
          >
            <defs>
              <!-- Body Silhouette Gradient -->
              <linearGradient id="bodySkinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fdf4ef" stop-opacity="0.95" />
                <stop offset="50%" stop-color="#fae8dc" stop-opacity="0.9" />
                <stop offset="100%" stop-color="#f3d5c2" stop-opacity="0.95" />
              </linearGradient>
              <linearGradient id="lungGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#38bdf8" />
                <stop offset="100%" stop-color="#0284c7" />
              </linearGradient>
              <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ef4444" />
                <stop offset="100%" stop-color="#b91c1c" />
              </linearGradient>
              <linearGradient id="liverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#b45309" />
                <stop offset="100%" stop-color="#78350f" />
              </linearGradient>
              <linearGradient id="stomachGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fb923c" />
                <stop offset="100%" stop-color="#ea580c" />
              </linearGradient>
              <linearGradient id="uterusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f43f5e" />
                <stop offset="100%" stop-color="#be123c" />
              </linearGradient>
              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- 1. TRANSLUCENT BODY OUTLINE / SILHOUETTE (FEMALE ANATOMY) -->
            <path
              d="
                M 200 40
                C 170 40 150 70 150 100
                C 150 120 160 140 180 148
                L 180 165
                C 150 170 120 185 100 215
                C 85 240 70 290 55 350
                C 45 390 35 440 25 470
                C 20 485 30 495 40 485
                C 50 470 65 410 75 365
                L 85 300
                C 95 245 110 220 125 210
                L 135 220
                C 125 260 125 310 135 350
                C 140 375 145 400 135 435
                C 120 480 110 540 115 610
                C 120 650 125 700 125 750
                C 125 765 145 770 155 765
                C 165 750 165 700 165 650
                C 165 600 170 540 180 475
                L 200 460
                L 220 475
                C 230 540 235 600 235 650
                C 235 700 235 750 245 765
                C 255 770 275 765 275 750
                C 275 700 280 650 285 610
                C 290 540 280 480 265 435
                C 255 400 260 375 265 350
                C 275 310 275 260 265 220
                L 275 210
                C 290 220 305 245 315 300
                L 325 365
                C 335 410 350 470 360 485
                C 370 495 380 485 375 470
                C 365 440 355 390 345 350
                C 330 290 315 240 300 215
                C 280 185 250 170 220 165
                L 220 148
                C 240 140 250 120 250 100
                C 250 70 230 40 200 40 Z
              "
              fill="url(#bodySkinGradient)"
              stroke="#cbd5e1"
              stroke-width="2"
              class="transition-colors"
            />

            <!-- 2. SKELETAL LAYER (WHEN SKELETAL OR ORGANS LAYER ACTIVE) -->
            <g v-if="anatomicalLayer === 'skeletal' || anatomicalLayer === 'organs'" class="opacity-40 pointer-events-none">
              <!-- Rib Cage outline -->
              <path
                d="
                  M 175 200 C 150 210 145 240 150 260
                  M 225 200 C 250 210 255 240 250 260
                  M 175 220 C 145 235 140 265 145 285
                  M 225 220 C 255 235 260 265 255 285
                  M 180 240 C 155 255 150 285 155 310
                  M 220 240 C 245 255 250 285 245 310
                  M 185 265 C 165 280 160 305 165 330
                  M 215 265 C 235 280 240 305 235 330
                "
                stroke="#94a3b8"
                stroke-width="3"
                stroke-linecap="round"
                fill="none"
              />
              <!-- Sternum -->
              <line x1="200" y1="185" x2="200" y2="280" stroke="#94a3b8" stroke-width="4" stroke-linecap="round" />
              <!-- Clavicles -->
              <path d="M 180 165 C 150 160 130 175 115 185" stroke="#94a3b8" stroke-width="3" fill="none" />
              <path d="M 220 165 C 250 160 270 175 285 185" stroke="#94a3b8" stroke-width="3" fill="none" />
              <!-- Pelvic Bone -->
              <path
                d="M 150 410 C 140 440 160 465 200 465 C 240 465 260 440 250 410"
                stroke="#94a3b8"
                stroke-width="3.5"
                fill="none"
              />
            </g>

            <!-- 3. INTERNAL ORGANS LAYER (INTERACTIVE CLICKABLE SHAPES) -->
            <g v-if="anatomicalLayer === 'organs'" class="transition-all duration-200">
              <!-- BRAIN (ខួរក្បាល) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('BRAIN')"
                @click.stop="onOrganSvgClick('BRAIN')"
                @mouseenter="hoveredOrganCode = 'BRAIN'"
                @mouseleave="hoveredOrganCode = null"
              >
                <path
                  d="M 175 90 C 165 65 185 50 200 50 C 215 50 235 65 225 90 C 220 105 210 110 200 110 C 190 110 180 105 175 90 Z"
                  fill="#f472b6"
                  fill-opacity="0.85"
                  stroke="#db2777"
                  stroke-width="2"
                />
                <!-- Brain folds -->
                <path d="M 185 70 Q 200 65 215 70 M 180 85 Q 200 80 220 85 M 190 98 Q 200 95 210 98" stroke="#be185d" stroke-width="1.5" fill="none" />
              </g>

              <!-- TRACHEA & THYROID (បំពង់ខ្យល់ & ទីរ៉ូអ៊ីត) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('THYROID')"
                @click.stop="onOrganSvgClick('THYROID')"
                @mouseenter="hoveredOrganCode = 'THYROID'"
                @mouseleave="hoveredOrganCode = null"
              >
                <!-- Trachea rings -->
                <rect x="194" y="140" width="12" height="35" rx="3" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5" />
                <!-- Butterfly Thyroid -->
                <path d="M 188 150 C 185 145 192 140 196 148 C 200 148 204 148 204 148 C 208 140 215 145 212 150 C 210 156 200 158 188 150 Z" fill="#fb7185" stroke="#e11d48" stroke-width="1.5" />
              </g>

              <!-- RIGHT LUNG (សួតស្តាំ - Viewer's left) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('LUNG_R')"
                @click.stop="onOrganSvgClick('LUNG_R')"
                @mouseenter="hoveredOrganCode = 'LUNG_R'"
                @mouseleave="hoveredOrganCode = null"
              >
                <path
                  d="M 188 180 C 170 185 150 200 145 230 C 140 260 145 295 160 305 C 175 310 185 290 188 280 L 188 180 Z"
                  fill="url(#lungGrad)"
                  fill-opacity="0.8"
                  stroke="#0284c7"
                  stroke-width="2"
                />
              </g>

              <!-- LEFT LUNG (សួតឆ្វេង - Viewer's right) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('LUNG_L')"
                @click.stop="onOrganSvgClick('LUNG_L')"
                @mouseenter="hoveredOrganCode = 'LUNG_L'"
                @mouseleave="hoveredOrganCode = null"
              >
                <path
                  d="M 212 180 C 230 185 250 200 255 230 C 260 260 255 295 240 305 C 225 310 215 290 212 280 L 212 180 Z"
                  fill="url(#lungGrad)"
                  fill-opacity="0.8"
                  stroke="#0284c7"
                  stroke-width="2"
                />
              </g>

              <!-- HEART (បេះដូង) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('HEART')"
                @click.stop="onOrganSvgClick('HEART')"
                @mouseenter="hoveredOrganCode = 'HEART'"
                @mouseleave="hoveredOrganCode = null"
              >
                <path
                  d="M 195 195 C 185 190 175 200 185 215 L 205 238 C 215 220 220 200 210 195 C 200 190 198 200 195 195 Z"
                  fill="url(#heartGrad)"
                  fill-opacity="0.9"
                  stroke="#991b1b"
                  stroke-width="2"
                />
                <!-- Aorta & Vena Cava vessels -->
                <path d="M 198 190 L 198 175 M 205 190 L 205 178" stroke="#dc2626" stroke-width="3" stroke-linecap="round" />
                <path d="M 192 192 L 192 178" stroke="#2563eb" stroke-width="3" stroke-linecap="round" />
              </g>

              <!-- BREASTS (សុដន់ស្តាំ & ឆ្វេង) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('BREAST_R')"
                @click.stop="onOrganSvgClick('BREAST_R')"
                @mouseenter="hoveredOrganCode = 'BREAST_R'"
                @mouseleave="hoveredOrganCode = null"
              >
                <circle cx="160" cy="225" r="18" fill="#fda4af" fill-opacity="0.35" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="3,2" />
                <circle cx="160" cy="225" r="3" fill="#e11d48" />
              </g>
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('BREAST_L')"
                @click.stop="onOrganSvgClick('BREAST_L')"
                @mouseenter="hoveredOrganCode = 'BREAST_L'"
                @mouseleave="hoveredOrganCode = null"
              >
                <circle cx="240" cy="225" r="18" fill="#fda4af" fill-opacity="0.35" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="3,2" />
                <circle cx="240" cy="225" r="3" fill="#e11d48" />
              </g>

              <!-- LIVER (ថ្លើម - Viewer's left) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('LIVER')"
                @click.stop="onOrganSvgClick('LIVER')"
                @mouseenter="hoveredOrganCode = 'LIVER'"
                @mouseleave="hoveredOrganCode = null"
              >
                <path
                  d="M 152 285 C 160 270 200 275 210 288 C 212 305 195 325 170 325 C 150 325 145 305 152 285 Z"
                  fill="url(#liverGrad)"
                  fill-opacity="0.85"
                  stroke="#78350f"
                  stroke-width="2"
                />
              </g>

              <!-- GALLBLADDER (ថង់ប្រមាត់) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('GALLBLADDER')"
                @click.stop="onOrganSvgClick('GALLBLADDER')"
                @mouseenter="hoveredOrganCode = 'GALLBLADDER'"
                @mouseleave="hoveredOrganCode = null"
              >
                <ellipse cx="170" cy="320" rx="6" ry="9" fill="#22c55e" stroke="#15803d" stroke-width="1.5" />
              </g>

              <!-- STOMACH (ក្រពះ - Viewer's right) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('STOMACH')"
                @click.stop="onOrganSvgClick('STOMACH')"
                @mouseenter="hoveredOrganCode = 'STOMACH'"
                @mouseleave="hoveredOrganCode = null"
              >
                <path
                  d="M 205 285 C 220 280 235 295 235 315 C 230 335 210 340 195 325 C 190 315 195 295 205 285 Z"
                  fill="url(#stomachGrad)"
                  fill-opacity="0.85"
                  stroke="#c2410c"
                  stroke-width="2"
                />
              </g>

              <!-- PANCREAS (លំពែង) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('PANCREAS')"
                @click.stop="onOrganSvgClick('PANCREAS')"
                @mouseenter="hoveredOrganCode = 'PANCREAS'"
                @mouseleave="hoveredOrganCode = null"
              >
                <path d="M 185 322 Q 205 318 225 325 Q 205 330 185 322 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.5" />
              </g>

              <!-- LARGE INTESTINE / COLON & APPENDIX (ពោះវៀនធំ & ខ្នែងពោះវៀន) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('COLON')"
                @click.stop="onOrganSvgClick('COLON')"
                @mouseenter="hoveredOrganCode = 'COLON'"
                @mouseleave="hoveredOrganCode = null"
              >
                <!-- Ascending, Transverse, Descending Colon frame -->
                <path
                  d="
                    M 160 405
                    L 155 350
                    Q 155 335 175 335
                    L 225 335
                    Q 245 335 245 350
                    L 240 405
                  "
                  fill="none"
                  stroke="#d97706"
                  stroke-width="12"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  opacity="0.8"
                />
                <!-- Appendix tail at RLQ (Viewer's left lower) -->
                <path d="M 160 410 Q 155 422 162 425" stroke="#b45309" stroke-width="3" fill="none" stroke-linecap="round" />
              </g>

              <!-- SMALL INTESTINE (ពោះវៀនតូច) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('INTESTINE_SMALL')"
                @click.stop="onOrganSvgClick('INTESTINE_SMALL')"
                @mouseenter="hoveredOrganCode = 'INTESTINE_SMALL'"
                @mouseleave="hoveredOrganCode = null"
              >
                <rect x="170" y="350" width="60" height="50" rx="12" fill="#fed7aa" fill-opacity="0.85" stroke="#ea580c" stroke-width="1.5" />
                <path d="M 175 362 Q 200 358 225 362 M 175 375 Q 200 372 225 375 M 175 388 Q 200 385 225 388" stroke="#f97316" stroke-width="2" fill="none" />
              </g>

              <!-- UTERUS & OVARIES (ស្បូន និងក្រពេញអូវែ - MATERNAL / GYNECOLOGY) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('UTERUS_OVARIES')"
                @click.stop="onOrganSvgClick('UTERUS_OVARIES')"
                @mouseenter="hoveredOrganCode = 'UTERUS_OVARIES'"
                @mouseleave="hoveredOrganCode = null"
              >
                <!-- Uterus body -->
                <path
                  d="M 190 422 C 185 415 215 415 210 422 L 205 440 L 195 440 Z"
                  fill="url(#uterusGrad)"
                  stroke="#9f1239"
                  stroke-width="1.5"
                />
                <!-- Fallopian tubes -->
                <path d="M 190 420 Q 175 415 170 424" stroke="#e11d48" stroke-width="2" fill="none" />
                <path d="M 210 420 Q 225 415 230 424" stroke="#e11d48" stroke-width="2" fill="none" />
                <!-- Left & Right Ovaries -->
                <ellipse cx="168" cy="424" rx="4" ry="3" fill="#fda4af" stroke="#be123c" stroke-width="1.5" />
                <ellipse cx="232" cy="424" rx="4" ry="3" fill="#fda4af" stroke="#be123c" stroke-width="1.5" />
              </g>

              <!-- URINARY BLADDER (ប្លោកនោម) -->
              <g
                class="cursor-pointer transition-all hover:opacity-100"
                :class="getOrganSvgClass('BLADDER')"
                @click.stop="onOrganSvgClick('BLADDER')"
                @mouseenter="hoveredOrganCode = 'BLADDER'"
                @mouseleave="hoveredOrganCode = null"
              >
                <ellipse cx="200" cy="448" rx="14" ry="10" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5" />
              </g>
            </g>

            <!-- 4. PIN MARKERS OVERLAY (PINS PLACED ON ANTERIOR) -->
            <g v-for="m in anteriorMarkers" :key="m.markerId" class="cursor-pointer transition-transform hover:scale-125" @click.stop="openEditMarker(m)">
              <circle
                :cx="getSvgCoordX(m)"
                :cy="getSvgCoordY(m)"
                r="9"
                :fill="getMarkerColor(m.markerType)"
                stroke="#ffffff"
                stroke-width="2"
                class="drop-shadow-md animate-pulse"
              />
              <text
                :x="getSvgCoordX(m)"
                :y="getSvgCoordY(m) + 3.5"
                text-anchor="middle"
                fill="#ffffff"
                font-size="9"
                font-weight="bold"
                font-family="sans-serif"
              >
                {{ m.severity || '!' }}
              </text>
            </g>
          </svg>

          <!-- ========================================================= -->
          <!-- 2D POSTERIOR (BACK VIEW) ANATOMY SVG                      -->
          <!-- ========================================================= -->
          <svg
            v-else
            viewBox="0 0 400 800"
            class="w-full h-full drop-shadow-xl cursor-crosshair transition-all"
          >
            <!-- Silhouette Back View -->
            <path
              d="
                M 200 40
                C 170 40 150 70 150 100
                C 150 120 160 140 180 148
                L 180 165
                C 150 170 120 185 100 215
                C 85 240 70 290 55 350
                C 45 390 35 440 25 470
                C 20 485 30 495 40 485
                C 50 470 65 410 75 365
                L 85 300
                C 95 245 110 220 125 210
                L 135 220
                C 125 260 125 310 135 350
                C 140 375 145 400 135 435
                C 120 480 110 540 115 610
                C 120 650 125 700 125 750
                C 125 765 145 770 155 765
                C 165 750 165 700 165 650
                C 165 600 170 540 180 475
                L 200 460
                L 220 475
                C 230 540 235 600 235 650
                C 235 700 235 750 245 765
                C 255 770 275 765 275 750
                C 275 700 280 650 285 610
                C 290 540 280 480 265 435
                C 255 400 260 375 265 350
                C 275 310 275 260 265 220
                L 275 210
                C 290 220 305 245 315 300
                L 325 365
                C 335 410 350 470 360 485
                C 370 495 380 485 375 470
                C 365 440 355 390 345 350
                C 330 290 315 240 300 215
                C 280 185 250 170 220 165
                L 220 148
                C 240 140 250 120 250 100
                C 250 70 230 40 200 40 Z
              "
              fill="url(#bodySkinGradient)"
              stroke="#cbd5e1"
              stroke-width="2"
            />

            <!-- Spine & Posterior Landmarks -->
            <g class="transition-all">
              <!-- Occipital Head -->
              <g
                class="cursor-pointer hover:opacity-100"
                :class="getOrganSvgClass('BRAIN')"
                @click.stop="onOrganSvgClick('BRAIN')"
                @mouseenter="hoveredOrganCode = 'BRAIN'"
                @mouseleave="hoveredOrganCode = null"
              >
                <circle cx="200" cy="85" r="30" fill="#fbcfe8" fill-opacity="0.4" stroke="#db2777" stroke-width="1.5" />
              </g>

              <!-- Cervical Spine (កញ្ចឹងក) -->
              <g
                class="cursor-pointer hover:opacity-100"
                :class="getOrganSvgClass('SPINE_CERVICAL')"
                @click.stop="onOrganSvgClick('SPINE_CERVICAL')"
                @mouseenter="hoveredOrganCode = 'SPINE_CERVICAL'"
                @mouseleave="hoveredOrganCode = null"
              >
                <rect x="194" y="145" width="12" height="35" rx="3" fill="#cbd5e1" stroke="#475569" stroke-width="2" />
              </g>

              <!-- Thoracic Spine (ខ្នងលើ) -->
              <g
                class="cursor-pointer hover:opacity-100"
                :class="getOrganSvgClass('SPINE_THORACIC')"
                @click.stop="onOrganSvgClick('SPINE_THORACIC')"
                @mouseenter="hoveredOrganCode = 'SPINE_THORACIC'"
                @mouseleave="hoveredOrganCode = null"
              >
                <rect x="193" y="185" width="14" height="90" rx="3" fill="#cbd5e1" stroke="#475569" stroke-width="2" />
                <!-- Scapula / Shoulder blades -->
                <path d="M 145 195 L 175 210 L 160 255 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
                <path d="M 255 195 L 225 210 L 240 255 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
              </g>

              <!-- Lumbar Spine (ចង្កេះ / ខ្នងក្រោម) -->
              <g
                class="cursor-pointer hover:opacity-100"
                :class="getOrganSvgClass('SPINE_LUMBAR')"
                @click.stop="onOrganSvgClick('SPINE_LUMBAR')"
                @mouseenter="hoveredOrganCode = 'SPINE_LUMBAR'"
                @mouseleave="hoveredOrganCode = null"
              >
                <rect x="192" y="280" width="16" height="70" rx="3" fill="#cbd5e1" stroke="#475569" stroke-width="2" />
              </g>

              <!-- Kidneys Posterior View -->
              <g
                class="cursor-pointer hover:opacity-100"
                :class="getOrganSvgClass('KIDNEY_R')"
                @click.stop="onOrganSvgClick('KIDNEY_R')"
                @mouseenter="hoveredOrganCode = 'KIDNEY_R'"
                @mouseleave="hoveredOrganCode = null"
              >
                <ellipse cx="165" cy="300" rx="12" ry="18" fill="#a855f7" fill-opacity="0.8" stroke="#7e22ce" stroke-width="2" />
              </g>
              <g
                class="cursor-pointer hover:opacity-100"
                :class="getOrganSvgClass('KIDNEY_L')"
                @click.stop="onOrganSvgClick('KIDNEY_L')"
                @mouseenter="hoveredOrganCode = 'KIDNEY_L'"
                @mouseleave="hoveredOrganCode = null"
              >
                <ellipse cx="235" cy="300" rx="12" ry="18" fill="#a855f7" fill-opacity="0.8" stroke="#7e22ce" stroke-width="2" />
              </g>

              <!-- Gluteal / Buttocks (កំប៉េះគូទ & អាងត្រគាក) -->
              <g
                class="cursor-pointer hover:opacity-100"
                :class="getOrganSvgClass('GLUTEAL')"
                @click.stop="onOrganSvgClick('GLUTEAL')"
                @mouseenter="hoveredOrganCode = 'GLUTEAL'"
                @mouseleave="hoveredOrganCode = null"
              >
                <path d="M 155 420 C 150 465 195 465 200 440 C 205 465 250 465 245 420" stroke="#94a3b8" stroke-width="2" fill="none" />
              </g>
            </g>

            <!-- POSTERIOR PIN MARKERS -->
            <g v-for="m in posteriorMarkers" :key="m.markerId" class="cursor-pointer transition-transform hover:scale-125" @click.stop="openEditMarker(m)">
              <circle
                :cx="getSvgCoordX(m)"
                :cy="getSvgCoordY(m)"
                r="9"
                :fill="getMarkerColor(m.markerType)"
                stroke="#ffffff"
                stroke-width="2"
                class="drop-shadow-md animate-pulse"
              />
              <text
                :x="getSvgCoordX(m)"
                :y="getSvgCoordY(m) + 3.5"
                text-anchor="middle"
                fill="#ffffff"
                font-size="9"
                font-weight="bold"
                font-family="sans-serif"
              >
                {{ m.severity || '!' }}
              </text>
            </g>
          </svg>
        </div>

        <!-- On-Screen Floating Guide Indicator -->
        <div class="absolute bottom-2 left-2 pointer-events-none text-[10px] text-muted bg-default/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-default/80 flex items-center gap-2 shadow-xs">
          <UIcon name="i-lucide-mouse-pointer" class="w-3.5 h-3.5 text-primary-500" />
          <span>{{ viewMode === '3d' ? '3D: អូសកណ្ដុរដើម្បីបង្វិល • រមូរដើម្បីពង្រីក • ចុចលើរាងកាយដើម្បីដោតចំណុច' : '2D Map: ចុចផ្ទាល់លើសរីរាង្គ ឬដោតចំណុចឈឺចាប់' }}</span>
        </div>
      </div>

      <!-- Column 3: Clinical Findings, Severity & Marker Details (3 Cols) -->
      <div class="lg:col-span-3 p-3 bg-default flex flex-col justify-between overflow-hidden">
        <div class="space-y-3 flex-1 flex flex-col">
          <!-- Header of Marker Column -->
          <div class="flex items-center justify-between pb-2 border-b border-default">
            <span class="font-bold text-highlighted text-xs flex items-center gap-1.5">
              <UIcon name="i-lucide-clipboard-check" class="w-4 h-4 text-primary-600" />
              បញ្ជីរោគសញ្ញា / របួស ({{ markers.length }})
            </span>
            <button
              v-if="markers.length > 0"
              type="button"
              class="text-[11px] text-rose-600 dark:text-rose-400 hover:underline"
              @click="clearAllMarkers"
            >
              លុបទាំងអស់
            </button>
          </div>

          <!-- Empty State -->
          <div v-if="markers.length === 0" class="flex-1 flex flex-col items-center justify-center py-10 text-center text-dimmed space-y-2">
            <div class="w-12 h-12 rounded-full bg-elevated flex items-center justify-center text-dimmed">
              <UIcon name="i-lucide-map-pin-off" class="w-6 h-6" />
            </div>
            <p class="text-xs font-semibold text-toned">មិនទាន់មានចំណុចកត់ត្រា</p>
            <p class="text-[11px] text-dimmed max-w-[200px]">
              សូមធីកសរីរាង្គនៅខាងឆ្វេង ឬចុចលើរូបរាងកាយដើម្បីដោតចំណុចឈឺចាប់
            </p>
          </div>

          <!-- Markers List -->
          <div v-else class="flex-1 overflow-y-auto max-h-[440px] space-y-2 pr-1 text-xs">
            <div
              v-for="m in markers"
              :key="m.markerId"
              class="p-2.5 rounded-xl border border-default bg-muted/70 hover:border-primary-400 dark:hover:border-primary-600 transition-all space-y-1.5 group"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span
                    class="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs flex items-center justify-center text-[9px] text-white font-bold"
                    :style="{ backgroundColor: getMarkerColor(m.markerType) }"
                  >
                    {{ m.severity || '!' }}
                  </span>
                  <div>
                    <div class="font-bold text-highlighted text-xs">
                      {{ m.regionNameKh || m.regionCode }}
                    </div>
                    <div class="text-[10px] text-muted font-sans">
                      {{ m.regionNameEn || m.regionCode }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                  <button
                    type="button"
                    class="p-1 rounded text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700"
                    title="ស្វែងរករោគវិនិច្ឆ័យ (ICD-10 Filter)"
                    @click="emitDiagnosisFilter(m.regionCode)"
                  >
                    <UIcon name="i-lucide-search" class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1 rounded text-muted hover:bg-elevated"
                    title="កែសម្រួល"
                    @click="openEditMarker(m)"
                  >
                    <UIcon name="i-lucide-edit-2" class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-gray-700"
                    title="លុប"
                    @click="deleteMarker(m.markerId)"
                  >
                    <UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <!-- Tags & Severity -->
              <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-default/50">
                <UBadge :color="getMarkerBadgeColor(m.markerType)" size="xs" variant="subtle">
                  {{ getMarkerTypeLabel(m.markerType) }}
                </UBadge>
                <span
                  v-if="m.severity"
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  :class="getSeverityBgClass(m.severity)"
                >
                  កម្រិតឈឺចាប់: {{ m.severity }}/10
                </span>
                <span v-if="m.burnPercentage" class="text-[10px] font-semibold text-orange-600">
                  រលាក: {{ m.burnPercentage }}%
                </span>
              </div>

              <!-- Notes -->
              <p v-if="m.notesKh || m.notesEn" class="text-[11px] text-toned italic">
                "{{ m.notesKh || m.notesEn }}"
              </p>
            </div>
          </div>
        </div>

        <!-- Pain Score Vital Sync Notification -->
        <div class="pt-2 border-t border-default flex items-center justify-between text-[11px]">
          <div class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <UIcon name="i-lucide-shield-check" class="w-3.5 h-3.5" />
            <span>Pain Score Vitals Sync សកម្ម</span>
          </div>
          <span v-if="highestPainScore > 0" class="font-bold text-rose-600">
            Max: {{ highestPainScore }}/10
          </span>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- MARKER CONFIGURATION MODAL (WONG-BAKER FACES, FINDINGS)    -->
    <!-- ========================================================= -->
    <UModal v-model:open="isEditorOpen" :title="`កត់ត្រាការឈឺចាប់ & រោគសញ្ញា: ${currentEditingMarker.regionNameKh || ''}`">
      <template #content>
        <div class="p-4 space-y-4 font-khmer bg-default rounded-2xl text-xs">
          <!-- Region Title -->
          <div class="flex items-center gap-3 pb-3 border-b border-default">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center font-bold shadow-xs">
              <UIcon name="i-lucide-map-pin" class="w-5 h-5" />
            </div>
            <div>
              <h4 class="font-bold text-highlighted text-sm">
                {{ currentEditingMarker.regionNameKh || currentEditingMarker.regionCode || 'ចំណុចលើរាងកាយ' }}
              </h4>
              <p class="text-[11px] text-muted">
                {{ currentEditingMarker.regionNameEn || currentEditingMarker.regionCode }} • {{ currentEditingMarker.coordinates2D?.view === 'posterior' ? 'ខាងក្រោយ (Posterior)' : 'ខាងមុខ (Anterior)' }}
              </p>
            </div>
          </div>

          <!-- Finding Type Picker -->
          <div>
            <label class="block font-semibold text-highlighted mb-1.5">
              ប្រភេទសញ្ញា / របួស (Finding Type) *
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                v-for="t in markerTypes"
                :key="t.value"
                type="button"
                class="p-2 rounded-xl border text-left flex items-center gap-1.5 transition-all"
                :class="currentEditingMarker.markerType === t.value
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 font-bold text-primary-700 dark:text-primary-300 shadow-xs ring-1 ring-primary-500'
                  : 'border-default hover:bg-muted'"
                @click="currentEditingMarker.markerType = t.value"
              >
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: t.color }" />
                <span class="truncate text-[11px]">{{ t.labelKh }}</span>
              </button>
            </div>
          </div>

          <!-- Wong-Baker FACES Pain Rating Scale -->
          <div class="bg-muted p-3 rounded-xl border border-default space-y-2">
            <div class="flex items-center justify-between">
              <label class="font-semibold text-highlighted flex items-center gap-1.5">
                <UIcon name="i-lucide-frown" class="w-4 h-4 text-amber-500" />
                កម្រិតការឈឺចាប់ (Wong-Baker FACES Pain Scale)
              </label>
              <span class="font-bold text-sm px-2 py-0.5 rounded-full" :class="getSeverityBgClass(currentEditingMarker.severity || 0)">
                {{ currentEditingMarker.severity || 0 }} / 10
              </span>
            </div>

            <!-- Face Buttons -->
            <div class="grid grid-cols-6 gap-1 pt-1">
              <button
                v-for="f in WONG_BAKER_FACES"
                :key="f.score"
                type="button"
                class="p-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1"
                :class="currentEditingMarker.severity === f.score
                  ? 'border-primary-600 bg-default ring-2 ring-primary-500 shadow-xs'
                  : 'border-transparent hover:bg-default/60'"
                @click="currentEditingMarker.severity = f.score"
              >
                <span class="text-xl">{{ f.emoji }}</span>
                <span class="text-[10px] font-bold">{{ f.score }}</span>
              </button>
            </div>

            <!-- Slider fallback -->
            <input
              v-model.number="currentEditingMarker.severity"
              type="range"
              min="0"
              max="10"
              step="1"
              class="w-full accent-primary-600 cursor-pointer mt-1"
            />
          </div>

          <!-- Burn Percentage (Rule of Nines) -->
          <div v-if="currentEditingMarker.markerType === 'burn'" class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
            <label class="block font-semibold text-amber-900 dark:text-amber-200 mb-1">
              ភាគរយរលាកលើផ្ទៃរាងកាយ (Rule of Nines %)
            </label>
            <UInput
              v-model.number="currentEditingMarker.burnPercentage"
              type="number"
              placeholder="ឧ. 4.5 ឬ 9"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Status -->
          <div>
            <label class="block font-semibold text-highlighted mb-1">
              ស្ថានភាពរោគសញ្ញា / របួស (Status)
            </label>
            <select
              v-model="currentEditingMarker.status"
              class="w-full p-2 border border-default rounded-xl bg-default text-xs text-highlighted"
            >
              <option value="active">Active (កំពុងឈឺ / របួសថ្មី)</option>
              <option value="healing">Healing (កំពុងជាសះស្បើយ)</option>
              <option value="resolved">Resolved (បានជាសះស្បើយ)</option>
              <option value="deteriorating">Deteriorating (កាន់តែធ្ងន់ធ្ងរ)</option>
            </select>
          </div>

          <!-- Clinical Notes -->
          <div>
            <label class="block font-semibold text-highlighted mb-1">
              កំណត់សម្គាល់វេជ្ជសាស្ត្រ (Clinical Notes / Description)
            </label>
            <UTextarea
              v-model="currentEditingMarker.notesKh"
              placeholder="ឧ. ឈឺចុកចាប់ខ្លាំងពេលសង្កត់លើពោះផ្នែកស្តាំ ឬមានស្នាមដាច់រលាត់..."
              :rows="2"
              size="sm"
              class="w-full text-xs"
            />
          </div>

          <!-- Modal Actions -->
          <div class="flex items-center justify-end gap-2 pt-3 border-t border-default">
            <UButton
              label="បោះបង់"
              color="neutral"
              variant="outline"
              size="sm"
              @click="isEditorOpen = false"
            />
            <UButton
              label="រក្សាទុកចំណុច"
              icon="i-lucide-check"
              color="primary"
              size="sm"
              @click="saveMarker"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { BodyMarker } from '~/types/models'
import {
  ANATOMICAL_ORGANS,
  ORGAN_SYSTEM_GROUPS,
  WONG_BAKER_FACES,
  type AnatomicalOrgan
} from '~/data/anatomyData'
import {
  CAMERA_PRESETS,
  FIGURE_CENTER,
  FIGURE_OFFSET_Y,
  createHumanFigure,
  createSkinMaterial,
  regionAt,
  type BodyPart,
  type CameraPreset
} from '~/utils/bodyMap3d'

const props = withDefaults(defineProps<{
  modelValue?: BodyMarker[]
  readOnly?: boolean
}>(), {
  modelValue: () => []
})

const emit = defineEmits<{
  (e: 'update:modelValue', markers: BodyMarker[]): void
  (e: 'regionSelected', regionCode: string): void
  (e: 'snapshot', dataUrl: string): void
}>()

const toast = useToast()

const markers = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val)
})

// View Modes & Layers
const viewMode = ref<'2d' | '3d'>('2d')
const twoDView = ref<'anterior' | 'posterior'>('anterior')
const anatomicalLayer = ref<'organs' | 'skeletal' | 'surface'>('organs')
const lastSnapshot = ref<string | null>(null)

// Organ Search & Filtering
const organSearchQuery = ref('')
const selectedSystemFilter = ref('all')
const hoveredOrganCode = ref<string | null>(null)

const filteredOrgans = computed(() => {
  return ANATOMICAL_ORGANS.filter(org => {
    // System filter
    if (selectedSystemFilter.value !== 'all' && org.system !== selectedSystemFilter.value) {
      return false
    }
    // Search query
    if (organSearchQuery.value) {
      const q = organSearchQuery.value.toLowerCase().trim()
      const matchKh = org.nameKh.toLowerCase().includes(q)
      const matchEn = org.nameEn.toLowerCase().includes(q)
      const matchCode = org.code.toLowerCase().includes(q)
      const matchComplaints = org.commonComplaintsKh.some(c => c.toLowerCase().includes(q))
      if (!matchKh && !matchEn && !matchCode && !matchComplaints) return false
    }
    return true
  })
})

const hoveredOrgan = computed(() => {
  if (!hoveredOrganCode.value) return null
  return ANATOMICAL_ORGANS.find(o => o.code === hoveredOrganCode.value) || null
})

// Highest Pain Score
const highestPainScore = computed(() => {
  if (markers.value.length === 0) return 0
  const scores = markers.value.map(m => m.severity || 0)
  return Math.max(...scores)
})

// Filter markers by view
const anteriorMarkers = computed(() => {
  return markers.value.filter(m => !m.coordinates2D || m.coordinates2D.view === 'anterior')
})

const posteriorMarkers = computed(() => {
  return markers.value.filter(m => m.coordinates2D?.view === 'posterior')
})

// Marker Types Master
const markerTypes: Array<{ value: BodyMarker['markerType']; labelKh: string; color: string }> = [
  { value: 'pain', labelKh: 'ការឈឺចាប់ (Pain)', color: '#ef4444' },
  { value: 'wound', labelKh: 'របួស/មុត (Wound)', color: '#f97316' },
  { value: 'burn', labelKh: 'រលាកភ្លើង (Burn)', color: '#eab308' },
  { value: 'swelling', labelKh: 'រលាក/ហើម (Inflammation)', color: '#06b6d4' },
  { value: 'rash', labelKh: 'កន្ទួលសើស្បែក (Rash)', color: '#a855f7' },
  { value: 'fracture', labelKh: 'បាក់ឆ្អឹង/ថ្លោះ (Fracture)', color: '#64748b' },
  { value: 'injection_site', labelKh: 'កន្លែងចាក់ថ្នាំ (Injection)', color: '#10b981' },
  { value: 'surgical_incision', labelKh: 'មុខរបួសវះកាត់ (Surgical)', color: '#3b82f6' }
]

function getMarkerColor(type?: string) {
  const found = markerTypes.find(t => t.value === type)
  return found ? found.color : '#ef4444'
}

function getMarkerBadgeColor(type?: string): any {
  switch (type) {
    case 'pain': return 'error'
    case 'wound': return 'warning'
    case 'burn': return 'warning'
    case 'rash': return 'primary'
    case 'injection_site': return 'success'
    case 'surgical_incision': return 'info'
    default: return 'neutral'
  }
}

function getMarkerTypeLabel(type?: string) {
  const found = markerTypes.find(t => t.value === type)
  return found ? found.labelKh : type || 'ការឈឺចាប់'
}

function getSeverityBgClass(score: number) {
  if (score === 0) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  if (score <= 3) return 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
  if (score <= 6) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
}

// Marker Editor State
const isEditorOpen = ref(false)
const currentEditingMarker = ref<Partial<BodyMarker>>({
  markerType: 'pain',
  severity: 4,
  status: 'active',
  notesKh: ''
})

// Organ Highlight & Tick logic
function isOrganSelected(organCode: string): boolean {
  return markers.value.some(m => m.regionCode === organCode)
}

function getOrganSvgClass(organCode: string): string {
  const isSelected = isOrganSelected(organCode)
  const isHovered = hoveredOrganCode.value === organCode

  if (isSelected) {
    return 'filter drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] opacity-100 stroke-2'
  }
  if (isHovered) {
    return 'filter drop-shadow-[0_0_6px_rgba(59,130,246,0.8)] opacity-100'
  }
  return 'opacity-85 hover:opacity-100'
}

function toggleOrganTick(organ: AnatomicalOrgan) {
  const existingIdx = markers.value.findIndex(m => m.regionCode === organ.code)
  if (existingIdx >= 0) {
    // Untick -> Remove marker
    const updated = [...markers.value]
    updated.splice(existingIdx, 1)
    markers.value = updated
    update3DPinSpheres()
  } else {
    // Tick -> Pre-populate marker
    triggerOrganMarkerModal(organ)
  }
}

function triggerOrganMarkerModal(organ: AnatomicalOrgan) {
  // If posterior organ, switch view
  if (organ.view === 'posterior' && twoDView.value !== 'posterior') {
    twoDView.value = 'posterior'
  } else if (organ.view === 'anterior' && twoDView.value !== 'anterior') {
    twoDView.value = 'anterior'
  }

  const existing = markers.value.find(m => m.regionCode === organ.code)
  if (existing) {
    currentEditingMarker.value = { ...existing }
  } else {
    currentEditingMarker.value = {
      markerId: `organ_${organ.code}_${Date.now()}`,
      regionCode: organ.code,
      regionNameKh: organ.nameKh,
      regionNameEn: organ.nameEn,
      markerType: 'pain',
      severity: 4,
      status: 'active',
      burnPercentage: organ.burnRuleOfNines,
      coordinates2D: {
        view: organ.view === 'posterior' ? 'posterior' : 'anterior',
        xPercent: organ.xPercent,
        yPercent: organ.yPercent
      },
      notesKh: ''
    }
  }

  isEditorOpen.value = true
  emit('regionSelected', organ.code)
}

function onOrganSvgClick(organCode: string) {
  const organ = ANATOMICAL_ORGANS.find(o => o.code === organCode)
  if (organ) {
    triggerOrganMarkerModal(organ)
  }
}

// Free Pinning on 2D Anatomy Map
const svgWrapper = ref<HTMLDivElement | null>(null)

function handleFreePinClick(event: MouseEvent) {
  if (!svgWrapper.value) return
  const rect = svgWrapper.value.getBoundingClientRect()
  const xPercent = Math.round(((event.clientX - rect.left) / rect.width) * 100)
  const yPercent = Math.round(((event.clientY - rect.top) / rect.height) * 100)

  // Determine nearby organ or general anatomy region
  let regionCode = 'BODY'
  let regionNameKh = 'ចំណុចរាងកាយ'
  let regionNameEn = 'Body Point'

  const nearestOrgan = ANATOMICAL_ORGANS.find(o => {
    const dx = Math.abs(o.xPercent - xPercent)
    const dy = Math.abs(o.yPercent - yPercent)
    return dx < 8 && dy < 8 && (o.view === twoDView.value || o.view === 'both')
  })

  if (nearestOrgan) {
    regionCode = nearestOrgan.code
    regionNameKh = nearestOrgan.nameKh
    regionNameEn = nearestOrgan.nameEn
  } else if (yPercent < 15) {
    regionCode = 'HEAD'
    regionNameKh = 'ក្បាល (Head)'
    regionNameEn = 'Head'
  } else if (yPercent < 22) {
    regionCode = 'NECK'
    regionNameKh = 'ក (Neck)'
    regionNameEn = 'Neck'
  } else if (yPercent < 35) {
    regionCode = 'CHEST'
    regionNameKh = 'ទ្រូង (Chest)'
    regionNameEn = 'Chest'
  } else if (yPercent < 50) {
    regionCode = 'ABDOMEN'
    regionNameKh = 'ពោះ (Abdomen)'
    regionNameEn = 'Abdomen'
  } else if (yPercent < 65) {
    regionCode = 'PELVIS'
    regionNameKh = 'ត្រគាក / ភ្លៅ (Pelvis / Thigh)'
    regionNameEn = 'Pelvis'
  } else {
    regionCode = 'LOWER_LIMB'
    regionNameKh = 'ជើង / កជើង (Leg / Ankle)'
    regionNameEn = 'Lower Limb'
  }

  currentEditingMarker.value = {
    markerId: `pin_${Date.now()}`,
    regionCode,
    regionNameKh,
    regionNameEn,
    markerType: 'pain',
    severity: 4,
    status: 'active',
    coordinates2D: {
      view: twoDView.value,
      xPercent,
      yPercent
    },
    notesKh: ''
  }

  isEditorOpen.value = true
  emit('regionSelected', regionCode)
}

function getSvgCoordX(m: BodyMarker): number {
  if (m.coordinates2D) {
    return (m.coordinates2D.xPercent / 100) * 400
  }
  return 200
}

function getSvgCoordY(m: BodyMarker): number {
  if (m.coordinates2D) {
    return (m.coordinates2D.yPercent / 100) * 800
  }
  return 400
}

function openEditMarker(m: BodyMarker) {
  currentEditingMarker.value = { ...m }
  isEditorOpen.value = true
}

function saveMarker() {
  const existingIdx = markers.value.findIndex(m => m.markerId === currentEditingMarker.value.markerId)
  const updatedList = [...markers.value]

  if (existingIdx >= 0) {
    updatedList[existingIdx] = currentEditingMarker.value as BodyMarker
  } else {
    updatedList.push(currentEditingMarker.value as BodyMarker)
  }

  markers.value = updatedList
  isEditorOpen.value = false
  update3DPinSpheres()

  toast.add({
    title: 'បានរក្សាទុកចំណុចសម្គាល់',
    description: `ចំណុចលើ ${currentEditingMarker.value.regionNameKh || 'រាងកាយ'} ត្រូវបានកត់ត្រាជោគជ័យ`,
    color: 'success'
  })
}

function deleteMarker(markerId?: string) {
  if (!markerId) return
  markers.value = markers.value.filter(m => m.markerId !== markerId)
  update3DPinSpheres()
}

function clearAllMarkers() {
  markers.value = []
  update3DPinSpheres()
  toast.add({
    title: 'បានកំណត់ឡើងវិញ',
    description: 'ចំណុចសម្គាល់ទាំងអស់ត្រូវបានសម្អាត',
    color: 'info'
  })
}

function emitDiagnosisFilter(regionCode?: string) {
  if (regionCode) {
    emit('regionSelected', regionCode)
    toast.add({
      title: 'តម្រងរោគវិនិច្ឆ័យ',
      description: `បានជ្រើសរើសតំបន់ ${regionCode} សម្រាប់ស្វែងរក ICD-10`,
      color: 'primary'
    })
  }
}

// -------------------------------------------------------------
// Snapshot & Canvas Export
// -------------------------------------------------------------
function captureSnapshot() {
  let dataUrl = ''
  if (viewMode.value === '3d' && renderer) {
    dataUrl = snapshot3D()
  } else if (svgWrapper.value) {
    const svgElement = svgWrapper.value.querySelector('svg')
    if (svgElement) {
      const xml = new XMLSerializer().serializeToString(svgElement)
      const svg64 = btoa(unescape(encodeURIComponent(xml)))
      const image64 = 'data:image/svg+xml;base64,' + svg64

      const canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 1000
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        if (ctx) {
          // White background
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Draw header banner
          ctx.fillStyle = '#0f172a'
          ctx.font = 'bold 24px sans-serif'
          ctx.fillText('CLINICAL BODY CHART - PATIENT EXAMINATION', 30, 40)

          ctx.fillStyle = '#64748b'
          ctx.font = '14px sans-serif'
          ctx.fillText(`Date: ${new Date().toLocaleString()} | Total Markers: ${markers.value.length} | Max Pain: ${highestPainScore.value}/10`, 30, 70)

          // Draw SVG Body
          ctx.drawImage(img, 150, 100, 500, 850)

          dataUrl = canvas.toDataURL('image/png')
          lastSnapshot.value = dataUrl
          emit('snapshot', dataUrl)

          toast.add({
            title: 'បានថតរូបគំនូសរាងកាយ',
            description: 'រូបភាពកម្រិតច្បាស់ត្រូវបានភ្ជាប់ជាមួយវេជ្ជបញ្ជា',
            color: 'success'
          })
        }
      }
      img.src = image64
      return
    }
  }

  if (dataUrl) {
    lastSnapshot.value = dataUrl
    emit('snapshot', dataUrl)
  }
}

// -------------------------------------------------------------
// 3D view: a procedural human figure (utils/bodyMap3d.ts) the camera orbits around. The figure
// never rotates, so a pin's saved coordinates always mean the same spot on the body.
// -------------------------------------------------------------
const canvasContainer = ref<HTMLDivElement | null>(null)
const hoverRegion = ref<{ code: string, nameKh: string, nameEn: string } | null>(null)
const activePreset = ref<CameraPreset | null>('front')
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let animationFrameId: number | null = null
let figure: THREE.Group | null = null
let pinSpheresGroup: THREE.Group | null = null
let hoverRing: THREE.Mesh | null = null
let cameraGoal: THREE.Vector3 | null = null
let resizeObserver: ResizeObserver | null = null
let pointerDownAt: { x: number, y: number } | null = null
const threeDPresets: Array<{ value: CameraPreset, label: string }> = [
  { value: 'front', label: 'មុខ' },
  { value: 'back', label: 'ខ្នង' },
  { value: 'left', label: 'ឆ្វេង' },
  { value: 'right', label: 'ស្តាំ' }
]
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

function switchViewMode(mode: '2d' | '3d') {
  viewMode.value = mode
  if (mode === '3d') {
    setTimeout(() => {
      onWindowResize()
    }, 100)
  }
}

function initThreeScene() {
  if (!canvasContainer.value) return
  const container = canvasContainer.value
  const width = container.clientWidth || 480
  const height = container.clientHeight || 500

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100)

  // Transparent canvas: the panel's own light or dark background shows through.
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  container.innerHTML = ''
  container.appendChild(renderer.domElement)

  // Soft sky/ground fill, a warm key light that casts the floor shadow, a cool rim light.
  scene.add(new THREE.HemisphereLight(0xf2f6ff, 0x8a7a6a, 1.1))
  const key = new THREE.DirectionalLight(0xfff3e6, 2.2)
  key.position.set(2.2, 4, 3)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -1.5
  key.shadow.camera.right = 1.5
  key.shadow.camera.top = 2.5
  key.shadow.camera.bottom = -1
  key.shadow.normalBias = 0.02
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xcfe3ff, 1.2)
  rim.position.set(-2.5, 2.5, -3)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0xffffff, 0.5)
  fill.position.set(-3, 1, 2)
  scene.add(fill)

  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.ShadowMaterial({ opacity: 0.18 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = FIGURE_OFFSET_Y - 0.002
  floor.receiveShadow = true
  scene.add(floor)

  figure = createHumanFigure(createSkinMaterial())
  scene.add(figure)

  pinSpheresGroup = new THREE.Group()
  scene.add(pinSpheresGroup)
  update3DPinSpheres()

  // Ring that follows the pointer over the skin, drawn on top so it is never hidden.
  hoverRing = new THREE.Mesh(
    new THREE.RingGeometry(0.022, 0.034, 32),
    new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide })
  )
  hoverRing.renderOrder = 10
  hoverRing.visible = false
  scene.add(hoverRing)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(FIGURE_CENTER)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.minDistance = 1.6
  controls.maxDistance = 8
  controls.rotateSpeed = 0.8
  controls.addEventListener('start', () => {
    cameraGoal = null
    activePreset.value = null
  })
  setCameraPreset('front', false)

  const dom = renderer.domElement
  dom.addEventListener('pointerdown', onPointerDown)
  dom.addEventListener('pointermove', onPointerMove)
  dom.addEventListener('pointerleave', hideHover)
  resizeObserver = new ResizeObserver(() => onWindowResize())
  resizeObserver.observe(container)

  const animate = () => {
    animationFrameId = requestAnimationFrame(animate)
    if (!renderer || !scene || !camera) return
    if (cameraGoal) {
      camera.position.lerp(cameraGoal, 0.14)
      if (camera.position.distanceTo(cameraGoal) < 0.005) {
        camera.position.copy(cameraGoal)
        cameraGoal = null
      }
    }
    controls?.update()
    renderer.render(scene, camera)
  }
  animate()
}

function update3DPinSpheres() {
  if (!pinSpheresGroup) return
  for (const child of [...pinSpheresGroup.children]) {
    pinSpheresGroup.remove(child)
    const mesh = child as THREE.Mesh
    mesh.geometry?.dispose()
    ;(mesh.material as THREE.Material | undefined)?.dispose()
  }

  markers.value.forEach((m) => {
    if (!m.coordinates3D) return
    const color = new THREE.Color(getMarkerColor(m.markerType))
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 20, 20),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 })
    )
    sphere.position.set(m.coordinates3D.x, m.coordinates3D.y, m.coordinates3D.z)
    sphere.castShadow = true
    pinSpheresGroup?.add(sphere)
  })
}

/** The first point on the skin under the pointer, with its region. */
function pickBody(clientX: number, clientY: number) {
  if (!canvasContainer.value || !camera || !figure) return null
  const rect = canvasContainer.value.getBoundingClientRect()
  pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObject(figure, true)[0]
  if (!hit) return null

  const part = hit.object.userData.part as BodyPart
  const code = regionAt(figure.worldToLocal(hit.point.clone()), part)
  const organ = ANATOMICAL_ORGANS.find(o => o.code === code)
  const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 0, 1)
  return {
    point: hit.point.clone(),
    normal,
    region: { code, nameKh: organ?.nameKh ?? code, nameEn: organ?.nameEn ?? code }
  }
}

function onPointerDown(e: PointerEvent) {
  pointerDownAt = { x: e.clientX, y: e.clientY }
  hideHover()
}

function onPointerMove(e: PointerEvent) {
  if (e.buttons !== 0 || !hoverRing) return
  const picked = pickBody(e.clientX, e.clientY)
  if (!picked) return hideHover()
  hoverRing.position.copy(picked.point).addScaledVector(picked.normal, 0.004)
  hoverRing.lookAt(picked.point.clone().add(picked.normal))
  hoverRing.visible = true
  hoverRegion.value = picked.region
  if (renderer) renderer.domElement.style.cursor = 'crosshair'
}

function hideHover() {
  if (hoverRing) hoverRing.visible = false
  hoverRegion.value = null
  if (renderer) renderer.domElement.style.cursor = ''
}

function setCameraPreset(preset: CameraPreset, animate = true) {
  if (!camera || !controls) return
  const goal = FIGURE_CENTER.clone().add(CAMERA_PRESETS[preset])
  controls.target.copy(FIGURE_CENTER)
  activePreset.value = preset
  if (animate) {
    cameraGoal = goal
  } else {
    camera.position.copy(goal)
    controls.update()
  }
}

function resetCamera() {
  setCameraPreset('front')
}

function onWindowResize() {
  if (!canvasContainer.value || !renderer || !camera) return
  const width = canvasContainer.value.clientWidth || 480
  const height = canvasContainer.value.clientHeight || 500
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

/** A print-ready PNG: the same view on a white background, without the hover ring. */
function snapshot3D(): string {
  if (!renderer || !scene || !camera) return ''
  const ringWasVisible = hoverRing?.visible ?? false
  if (hoverRing) hoverRing.visible = false
  scene.background = new THREE.Color(0xffffff)
  renderer.render(scene, camera)
  const dataUrl = renderer.domElement.toDataURL('image/png')
  scene.background = null
  if (hoverRing) hoverRing.visible = ringWasVisible
  return dataUrl
}

function handle3DClick(event: MouseEvent) {
  // A drag that rotated the camera also ends in a click; only a still click places a pin.
  const start = pointerDownAt
  pointerDownAt = null
  if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return

  const picked = pickBody(event.clientX, event.clientY)
  if (!picked) return
  const { code, nameKh, nameEn } = picked.region

  currentEditingMarker.value = {
    markerId: `pin_3d_${Date.now()}`,
    regionCode: code,
    regionNameKh: nameKh,
    regionNameEn: nameEn,
    markerType: 'pain',
    severity: 4,
    status: 'active',
    coordinates3D: {
      x: Number(picked.point.x.toFixed(3)),
      y: Number(picked.point.y.toFixed(3)),
      z: Number(picked.point.z.toFixed(3))
    },
    notesKh: ''
  }

  isEditorOpen.value = true
  emit('regionSelected', code)
}

watch(markers, () => {
  update3DPinSpheres()
}, { deep: true })

onMounted(() => {
  initThreeScene()
})

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  resizeObserver?.disconnect()
  controls?.dispose()
  if (renderer) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointermove', onPointerMove)
    renderer.domElement.removeEventListener('pointerleave', hideHover)
  }
  scene?.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach(m => m.dispose())
  })
  renderer?.dispose()
})
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Hanuman', 'Noto Sans Khmer', sans-serif;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
