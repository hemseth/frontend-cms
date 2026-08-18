export type DiagnosisSourceType = 'ICD_MASTER' | 'CLINIC_LOCAL' | 'FREE_TEXT'
export type DiagnosisVisitStatus = 'suspected' | 'confirmed' | 'ruled-out'
export type DiagnosisOutcome = 'active' | 'resolved' | 'referred' | 'admitted' | 'died' | 'unknown'

export interface DiagnosisMasterMetaText {
  code?: string
  range?: string
  nameKh?: string
  nameEn?: string
}

export interface DiagnosisMaster {
  id: string
  _id: string
  code: string
  codeNormalized: string
  codeSystem: string
  codeVersion?: string
  level?: number
  terminal?: boolean
  terminalType?: string
  codeType?: string
  parentCode?: string
  nameKh?: string
  nameEn?: string
  translationStatus?: string
  chapter?: DiagnosisMasterMetaText
  block?: DiagnosisMasterMetaText
  category?: DiagnosisMasterMetaText
  body?: {
    system?: DiagnosisMasterMetaText
    region?: DiagnosisMasterMetaText
    organ?: DiagnosisMasterMetaText
  }
  synonyms?: { kh: string[]; en: string[] }
  tags?: string[]
  reportable: boolean
  active: boolean
  source?: { authority: string; classification?: string; edition?: string; sourceKind?: string }
  master: { nameKh?: string; nameEn?: string }
  display: { nameKh?: string; nameEn?: string }
  clinic: {
    added: boolean
    enabled: boolean
    favorite: boolean
    localNameKh?: string | null
    localNameEn?: string | null
    groups: string[]
  }
}

export interface ClinicDiagnosisGroup {
  id: string
  _id: string
  clinicId: string
  code: string
  nameKh?: string
  nameEn?: string
  description?: string | null
  sortOrder: number
  active: boolean
  diagnosisCount?: number
}

export interface ClinicDiagnosis {
  id: string
  _id: string
  clinicId: string
  diagnosisId: string
  enabled: boolean
  favorite: boolean
  localNameKh?: string | null
  localNameEn?: string | null
  localSynonymsKh: string[]
  localSynonymsEn: string[]
  groupIds: string[]
  groups: Array<{ id: string; code: string; nameKh?: string; nameEn?: string }>
  sortOrder: number
  active: boolean
  code?: string | null
  codeSystem?: string
  codeVersion?: string | null
  nameKh?: string
  nameEn?: string
  master: { nameKh?: string; nameEn?: string }
  display: { nameKh?: string; nameEn?: string }
  category?: DiagnosisMasterMetaText | null
  body?: DiagnosisMaster['body'] | null
  chapter?: DiagnosisMasterMetaText | null
  terminal?: boolean | null
  reportable?: boolean
  sourceType: DiagnosisSourceType
}

export interface DiagnosisSearchResult {
  id: string
  _id: string
  code?: string
  sourceType: DiagnosisSourceType
  nameKh?: string
  nameEn?: string
  categoryCode?: string
  bodySystemCode?: string
  bodyRegionCode?: string
  organCode?: string
  terminal?: boolean
  clinic?: {
    added: boolean
    enabled: boolean
    favorite: boolean
    groups: string[]
  }
  userFavorite?: boolean
  usageCount?: number
  lastUsedAt?: string
}

export interface DiagnosisMetadataItem {
  code: string
  range?: string
  nameKh?: string
  nameEn?: string
  diagnosisCount: number
}

export interface VisitDiagnosisInput {
  diagnosisId?: string
  sourceType?: DiagnosisSourceType
  nameEn?: string
  nameKh?: string
  code?: string
  isPrimary?: boolean
  status?: DiagnosisVisitStatus
  onsetDate?: string
  outcome?: DiagnosisOutcome
}

export interface VisitDiagnosisSnapshot {
  diagnosisId?: string
  sourceType: DiagnosisSourceType
  code?: string
  codeSystem: string
  codeVersion?: string
  nameKh?: string
  masterNameKh?: string
  nameEn?: string
  categoryCode?: string
  bodySystemCode?: string
  bodyRegionCode?: string
  organCode?: string
  isPrimary: boolean
  status?: DiagnosisVisitStatus
  onsetDate?: string
  outcome?: DiagnosisOutcome
  reportable: boolean
}
