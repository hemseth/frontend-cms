export interface AnatomicalOrgan {
  id: string
  code: string
  nameKh: string
  nameEn: string
  system: 'nervous' | 'respiratory' | 'cardiovascular' | 'digestive' | 'urogenital' | 'musculoskeletal' | 'endocrine'
  view: 'anterior' | 'posterior' | 'both'
  xPercent: number
  yPercent: number
  burnRuleOfNines?: number
  commonComplaintsKh: string[]
  suggestedIcd10Prefix: string
}

export interface OrganSystemGroup {
  id: string
  nameKh: string
  nameEn: string
  icon: string
  color: string
}

export const ORGAN_SYSTEM_GROUPS: OrganSystemGroup[] = [
  { id: 'digestive', nameKh: 'ប្រព័ន្ធរំលាយអាហារ', nameEn: 'Digestive System', icon: 'i-lucide-utensils', color: '#f97316' },
  { id: 'respiratory', nameKh: 'ប្រព័ន្ធដង្ហើម', nameEn: 'Respiratory System', icon: 'i-lucide-wind', color: '#06b6d4' },
  { id: 'cardiovascular', nameKh: 'ប្រព័ន្ធបេះដូង & ឈាម', nameEn: 'Cardiovascular', icon: 'i-lucide-heart', color: '#ef4444' },
  { id: 'urogenital', nameKh: 'ប្រព័ន្ធបន្តពូជ & ទឹកនោម', nameEn: 'Urogenital & Maternal', icon: 'i-lucide-baby', color: '#ec4899' },
  { id: 'nervous', nameKh: 'ប្រព័ន្ធប្រសាទ & ក្បាល', nameEn: 'Nervous & Head', icon: 'i-lucide-brain', color: '#8b5cf6' },
  { id: 'musculoskeletal', nameKh: 'គ្រោងឆ្អឹង & សន្លាក់', nameEn: 'Musculoskeletal', icon: 'i-lucide-bone', color: '#64748b' }
]

export const ANATOMICAL_ORGANS: AnatomicalOrgan[] = [
  // --- Nervous / Head ---
  {
    id: 'brain',
    code: 'BRAIN',
    nameKh: 'ខួរក្បាល (Brain)',
    nameEn: 'Brain & Cranium',
    system: 'nervous',
    view: 'both',
    xPercent: 50,
    yPercent: 7,
    burnRuleOfNines: 4.5,
    commonComplaintsKh: ['ឈឺក្បាល (Headache)', 'វិលមុខ (Dizziness)', 'របួសប៉ះទង្គិចក្បាល (Head Trauma)'],
    suggestedIcd10Prefix: 'G44'
  },
  {
    id: 'thyroid_trachea',
    code: 'THYROID',
    nameKh: 'បំពង់ខ្យល់ & ក្រពេញទីរ៉ូអ៊ីត',
    nameEn: 'Trachea & Thyroid',
    system: 'respiratory',
    view: 'anterior',
    xPercent: 50,
    yPercent: 16,
    commonComplaintsKh: ['ឈឺបំពង់ក (Sore Throat)', 'ពិបាកលេប (Dysphagia)', 'ពកក (Goiter)'],
    suggestedIcd10Prefix: 'E04'
  },

  // --- Respiratory ---
  {
    id: 'lung_right',
    code: 'LUNG_R',
    nameKh: 'សួតខាងស្តាំ (Right Lung)',
    nameEn: 'Right Lung',
    system: 'respiratory',
    view: 'anterior',
    xPercent: 41,
    yPercent: 24,
    burnRuleOfNines: 4.5,
    commonComplaintsKh: ['ក្អក (Cough)', 'ពិបាកដកដង្ហើម (Dyspnea)', 'រលាកសួត (Pneumonia)'],
    suggestedIcd10Prefix: 'J18'
  },
  {
    id: 'lung_left',
    code: 'LUNG_L',
    nameKh: 'សួតខាងឆ្វេង (Left Lung)',
    nameEn: 'Left Lung',
    system: 'respiratory',
    view: 'anterior',
    xPercent: 59,
    yPercent: 24,
    burnRuleOfNines: 4.5,
    commonComplaintsKh: ['ក្អក (Cough)', 'ពិបាកដកដង្ហើម (Dyspnea)', 'ហត់ (Wheezing)'],
    suggestedIcd10Prefix: 'J45'
  },

  // --- Cardiovascular ---
  {
    id: 'heart',
    code: 'HEART',
    nameKh: 'បេះដូង (Heart)',
    nameEn: 'Heart & Precordium',
    system: 'cardiovascular',
    view: 'anterior',
    xPercent: 52,
    yPercent: 25,
    commonComplaintsKh: ['ឈឺចុកដើមទ្រូង (Chest Pain)', 'បេះដូងលោតញាប់ (Palpitation)', 'តឹងទ្រូង (Angina)'],
    suggestedIcd10Prefix: 'I20'
  },

  // --- Maternal / Breasts ---
  {
    id: 'breast_right',
    code: 'BREAST_R',
    nameKh: 'សុដន់ខាងស្តាំ (Right Breast)',
    nameEn: 'Right Breast',
    system: 'urogenital',
    view: 'anterior',
    xPercent: 39,
    yPercent: 28,
    commonComplaintsKh: ['ដុំពកសុដន់ (Breast Lump)', 'ឈឺសុដន់ (Mastalgia)', 'រលាកសុដន់ (Mastitis)'],
    suggestedIcd10Prefix: 'N63'
  },
  {
    id: 'breast_left',
    code: 'BREAST_L',
    nameKh: 'សុដន់ខាងឆ្វេង (Left Breast)',
    nameEn: 'Left Breast',
    system: 'urogenital',
    view: 'anterior',
    xPercent: 61,
    yPercent: 28,
    commonComplaintsKh: ['ដុំពកសុដន់ (Breast Lump)', 'ឈឺសុដន់ (Mastalgia)', 'រលាកសុដន់ (Mastitis)'],
    suggestedIcd10Prefix: 'N63'
  },

  // --- Digestive ---
  {
    id: 'liver',
    code: 'LIVER',
    nameKh: 'ថ្លើម (Liver)',
    nameEn: 'Liver & Right Hypochondrium',
    system: 'digestive',
    view: 'anterior',
    xPercent: 43,
    yPercent: 33,
    commonComplaintsKh: ['ចុកឆ្អឹងជំនីរស្តាំ (RUQ Pain)', 'ខាន់លឿង (Jaundice)', 'ថ្លើមរីក (Hepatomegaly)'],
    suggestedIcd10Prefix: 'K76'
  },
  {
    id: 'gallbladder',
    code: 'GALLBLADDER',
    nameKh: 'ថង់ប្រមាត់ (Gallbladder)',
    nameEn: 'Gallbladder',
    system: 'digestive',
    view: 'anterior',
    xPercent: 42,
    yPercent: 36,
    commonComplaintsKh: ['គ្រួសក្នុងប្រមាត់ (Cholelithiasis)', 'ចុកពោះខ្លាំងក្រោយហូបអាហារខ្លាញ់'],
    suggestedIcd10Prefix: 'K80'
  },
  {
    id: 'stomach',
    code: 'STOMACH',
    nameKh: 'ក្រពះ (Stomach)',
    nameEn: 'Stomach & Epigastrium',
    system: 'digestive',
    view: 'anterior',
    xPercent: 54,
    yPercent: 34,
    commonComplaintsKh: ['រលាកក្រពះ (Gastritis)', 'ក្រហាយទ្រូង/ច្រាលអាស៊ីត (GERD)', 'ដំបៅក្រពះ (Peptic Ulcer)'],
    suggestedIcd10Prefix: 'K29'
  },
  {
    id: 'pancreas',
    code: 'PANCREAS',
    nameKh: 'លំពែង (Pancreas)',
    nameEn: 'Pancreas',
    system: 'digestive',
    view: 'anterior',
    xPercent: 51,
    yPercent: 37,
    commonComplaintsKh: ['រលាកលំពែង (Pancreatitis)', 'ចុកចាក់ទៅខ្នង'],
    suggestedIcd10Prefix: 'K85'
  },
  {
    id: 'intestine_large',
    code: 'COLON',
    nameKh: 'ពោះវៀនធំ & ខ្នែងពោះវៀន (Colon & Appendix)',
    nameEn: 'Large Intestine & Colon',
    system: 'digestive',
    view: 'anterior',
    xPercent: 50,
    yPercent: 42,
    commonComplaintsKh: ['ទល់លាមក (Constipation)', 'រលាកខ្នែងពោះវៀន (Appendicitis)', 'រមួលពោះ'],
    suggestedIcd10Prefix: 'K35'
  },
  {
    id: 'intestine_small',
    code: 'INTESTINE_SMALL',
    nameKh: 'ពោះវៀនតូច (Small Intestine)',
    nameEn: 'Small Intestine & Umbilicus',
    system: 'digestive',
    view: 'anterior',
    xPercent: 50,
    yPercent: 45,
    commonComplaintsKh: ['រាករូស (Diarrhea)', 'រមួលពោះជុំវិញផ្ចិត (Periumbilical Pain)', 'ពុលចំណី'],
    suggestedIcd10Prefix: 'A09'
  },

  // --- Urogenital & Maternal Care ---
  {
    id: 'uterus_ovaries',
    code: 'UTERUS_OVARIES',
    nameKh: 'ស្បូន និងអូវែ (Uterus & Ovaries)',
    nameEn: 'Uterus, Fallopian Tubes & Ovaries',
    system: 'urogenital',
    view: 'anterior',
    xPercent: 50,
    yPercent: 52,
    commonComplaintsKh: ['ចុកពោះពេលមករដូវ (Dysmenorrhea)', 'ធ្លាក់ស (Leukorrhea)', 'ពិនិត្យផ្ទៃពោះ (Antenatal Care)', 'ដុំពកស្បូន (Fibroid)'],
    suggestedIcd10Prefix: 'N73'
  },
  {
    id: 'bladder',
    code: 'BLADDER',
    nameKh: 'ប្លោកនោម (Urinary Bladder)',
    nameEn: 'Urinary Bladder & Suprapubic',
    system: 'urogenital',
    view: 'anterior',
    xPercent: 50,
    yPercent: 55,
    commonComplaintsKh: ['រលាកប្លោកនោម (Cystitis)', 'នោមទាស់/ឈឺ (Dysuria)', 'នោមញឹក'],
    suggestedIcd10Prefix: 'N30'
  },
  {
    id: 'kidney_right',
    code: 'KIDNEY_R',
    nameKh: 'តម្រងនោមស្តាំ (Right Kidney)',
    nameEn: 'Right Kidney & Flank',
    system: 'urogenital',
    view: 'both',
    xPercent: 39,
    yPercent: 38,
    commonComplaintsKh: ['គ្រួសក្នុងតម្រងនោម (Renal Calculus)', 'ចុកចង្កេះចំហៀង (Flank Pain)', 'នោមឈាម'],
    suggestedIcd10Prefix: 'N20'
  },
  {
    id: 'kidney_left',
    code: 'KIDNEY_L',
    nameKh: 'តម្រងនោមឆ្វេង (Left Kidney)',
    nameEn: 'Left Kidney & Flank',
    system: 'urogenital',
    view: 'both',
    xPercent: 61,
    yPercent: 38,
    commonComplaintsKh: ['គ្រួសក្នុងតម្រងនោម (Renal Calculus)', 'ចុកចង្កេះចំហៀង (Flank Pain)', 'នោមឈាម'],
    suggestedIcd10Prefix: 'N20'
  },

  // --- Musculoskeletal & Spine (Posterior) ---
  {
    id: 'spine_cervical',
    code: 'SPINE_CERVICAL',
    nameKh: 'កញ្ចឹងក (Cervical Spine)',
    nameEn: 'Cervical Spine & Neck',
    system: 'musculoskeletal',
    view: 'posterior',
    xPercent: 50,
    yPercent: 17,
    commonComplaintsKh: ['ចុកកញ្ចឹងក (Neck Stiffness)', 'ស្ពឹកដៃរាលពីក (Cervical Radiculopathy)'],
    suggestedIcd10Prefix: 'M54.2'
  },
  {
    id: 'spine_thoracic',
    code: 'SPINE_THORACIC',
    nameKh: 'ខ្នងផ្នែកខាងលើ (Thoracic Spine)',
    nameEn: 'Thoracic Spine & Upper Back',
    system: 'musculoskeletal',
    view: 'posterior',
    xPercent: 50,
    yPercent: 26,
    commonComplaintsKh: ['ឈឺខ្នង (Upper Back Pain)', 'កៀបសរសៃខ្នង'],
    suggestedIcd10Prefix: 'M54.6'
  },
  {
    id: 'spine_lumbar',
    code: 'SPINE_LUMBAR',
    nameKh: 'ចង្កេះ / ខ្នងក្រោម (Lumbar Spine)',
    nameEn: 'Lumbar Spine & Lower Back',
    system: 'musculoskeletal',
    view: 'posterior',
    xPercent: 50,
    yPercent: 39,
    commonComplaintsKh: ['ឈឺចង្កេះ (Low Back Pain / Lumbago)', 'លៀនទ្រនាប់ឆ្អឹង (Herniated Disc)', 'ស្ពឹកជើង'],
    suggestedIcd10Prefix: 'M54.5'
  },
  {
    id: 'pelvis_gluteal',
    code: 'GLUTEAL',
    nameKh: 'កំប៉េះគូទ & អាងត្រគាក (Gluteal & Pelvis)',
    nameEn: 'Gluteal & Sacrum',
    system: 'musculoskeletal',
    view: 'posterior',
    xPercent: 50,
    yPercent: 53,
    commonComplaintsKh: ['ឈឺចាក់តាមគូទ (Sciatica)', 'រលាកសរសៃ sciatic'],
    suggestedIcd10Prefix: 'M54.3'
  },

  // --- Major Extremities & Joints ---
  {
    id: 'shoulder_r',
    code: 'SHOULDER_R',
    nameKh: 'ស្មាស្តាំ (Right Shoulder)',
    nameEn: 'Right Shoulder',
    system: 'musculoskeletal',
    view: 'both',
    xPercent: 32,
    yPercent: 20,
    commonComplaintsKh: ['ជាប់សន្លាក់ស្មា (Frozen Shoulder)', 'រលាកសរសៃពួរស្មា'],
    suggestedIcd10Prefix: 'M75'
  },
  {
    id: 'shoulder_l',
    code: 'SHOULDER_L',
    nameKh: 'ស្មាឆ្វេង (Left Shoulder)',
    nameEn: 'Left Shoulder',
    system: 'musculoskeletal',
    view: 'both',
    xPercent: 68,
    yPercent: 20,
    commonComplaintsKh: ['ជាប់សន្លាក់ស្មា (Frozen Shoulder)', 'រលាកសរសៃពួរស្មា'],
    suggestedIcd10Prefix: 'M75'
  },
  {
    id: 'knee_r',
    code: 'KNEE_R',
    nameKh: 'ជង្គង់ស្តាំ (Right Knee)',
    nameEn: 'Right Knee Joint',
    system: 'musculoskeletal',
    view: 'both',
    xPercent: 43,
    yPercent: 73,
    commonComplaintsKh: ['ឈឺសន្លាក់ជង្គង់ (Knee Osteoarthritis)', 'ហើមជង្គង់ (Effusion)', 'ដាច់សរសៃពួរជង្គង់'],
    suggestedIcd10Prefix: 'M17'
  },
  {
    id: 'knee_l',
    code: 'KNEE_L',
    nameKh: 'ជង្គង់ឆ្វេង (Left Knee)',
    nameEn: 'Left Knee Joint',
    system: 'musculoskeletal',
    view: 'both',
    xPercent: 57,
    yPercent: 73,
    commonComplaintsKh: ['ឈឺសន្លាក់ជង្គង់ (Knee Osteoarthritis)', 'ហើមជង្គង់ (Effusion)', 'ដាច់សរសៃពួរជង្គង់'],
    suggestedIcd10Prefix: 'M17'
  },
  {
    id: 'ankle_r',
    code: 'ANKLE_R',
    nameKh: 'កជើងស្តាំ (Right Ankle)',
    nameEn: 'Right Ankle & Foot',
    system: 'musculoskeletal',
    view: 'both',
    xPercent: 44,
    yPercent: 92,
    commonComplaintsKh: ['ថ្លោះកជើង (Ankle Sprain)', 'ហើមកជើង (Edema)'],
    suggestedIcd10Prefix: 'S93'
  },
  {
    id: 'ankle_l',
    code: 'ANKLE_L',
    nameKh: 'កជើងឆ្វេង (Left Ankle)',
    nameEn: 'Left Ankle & Foot',
    system: 'musculoskeletal',
    view: 'both',
    xPercent: 56,
    yPercent: 92,
    commonComplaintsKh: ['ថ្លោះកជើង (Ankle Sprain)', 'ហើមកជើង (Edema)'],
    suggestedIcd10Prefix: 'S93'
  }
]

export const WONG_BAKER_FACES = [
  { score: 0, labelKh: 'មិនឈឺទាល់តែសោះ', labelEn: 'No Hurt', emoji: '😊', color: '#10b981' },
  { score: 2, labelKh: 'ឈឺបន្តិចបន្តួច', labelEn: 'Hurts Little Bit', emoji: '🙂', color: '#34d399' },
  { score: 4, labelKh: 'ឈឺបន្តិចទៀត', labelEn: 'Hurts Little More', emoji: '😐', color: '#facc15' },
  { score: 6, labelKh: 'ឈឺកាន់តែខ្លាំង', labelEn: 'Hurts Even More', emoji: '😣', color: '#fb923c' },
  { score: 8, labelKh: 'ឈឺខ្លាំងណាស់', labelEn: 'Hurts Whole Lot', emoji: '😫', color: '#f87171' },
  { score: 10, labelKh: 'ឈឺខ្លាំងបំផុតមិនអាចទ្រាំបាន', labelEn: 'Hurts Worst', emoji: '😭', color: '#ef4444' }
]
