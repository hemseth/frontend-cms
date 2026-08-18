export interface Medicine {
  id: string
  name: string
  price: number
  type: string
  stock?: number
}

export interface Patient {
  id: string
  pId?: number
  nameEn: string
  nameKh?: string
  dob?: string
  sex?: string
  phone?: string
  email?: string
  address?: string
  proCode?: string
  disCode?: string
  comCode?: string
  vilCode?: string
  provinceName?: string
  districtName?: string
  communeName?: string
  villageName?: string
}

export interface Visit {
  id: string
  visitNo?: string
  patientId: string
  patientName?: string
  date: string
  department?: string
  doctor?: string
  vitals?: Record<string, any>
  reason?: string
  notes?: string
}

export interface PaymentItem {
  itemId?: string
  name: string
  quantity: number
  price: number
  subtotal: number
  category:
    | 'medicine'
    | 'laboratory'
    | 'imaging'
    | 'consultation'
    | 'nursing'
    | 'other'
  unit?: string
}

export interface Payment {
  _id: string
  paymentId?: number
  visitId: string
  patientId: string
  subtotal: number
  discount: number
  tax: number
  amount: number
  currency: string
  method: string
  status: 'pending' | 'paid' | 'partially_paid' | 'cancelled'
  paidAt?: string
  items: PaymentItem[]
  notes?: string
}

export interface LabResult {
  id: string
  patientId: string
  patientName?: string
  testCode?: string
  testName?: string
  requestedDate?: string
  resultDate?: string | null
  status?: string
  results?: Record<string, any> | null
  price?: number
}

export interface EchoReport {
  id: string
  patientId: string
  patientName?: string
  studyDate?: string
  cardiologist?: string
  status?: string
  findings?: string | null
  impression?: string | null
  price?: number
}

export interface OpdMedicine {
  _id: string
  code: string
  nameEn: string
  nameKh: string
  category: string
  dosage: string
  unit: string
  price: number
  retailPrice?: number
  wholesalePrice?: number
  stock: number
  status: string
  dosageForm?: string
  baseUnit?: string
  saleUnit?: string
}

export interface OpdService {
  _id: string
  code: string
  nameEn: string
  nameKh: string
  categoryId?: string
  price: number
  unit: string
  currency: string
  referenceRange: string
  template?: string
  parameters?: any[]
  categoryName?: string
  category?: string
  name?: string
}

export interface OpdRow {
  medicineId?: string
  name: string
  nameKh?: string
  price: number
  qmor: number
  qaft: number
  qeve: number
  qngt: number
  days?: number
  qty?: number
  result?: string
  type?: 'MEDICINE' | 'LAB' | 'ECHO' | 'SCAN' | 'INJECTION' | 'SERVICE'
  category?: string
  parameters?: any[]
  unit?: string
  isWholesale?: boolean
  retailPrice?: number
  wholesalePrice?: number
  baseUnit?: string
  saleUnit?: string
}
