/**
 * NBC Bakong KHQR EMVCo Standard Generator Utility
 * Generates valid dynamic KHQR payload strings for Cambodian Bakong scanning (USD / KHR).
 */

export interface KhqrOptions {
  bakongAccountId: string // e.g., 'hospital@aba' or 'hospital@acleda'
  merchantName: string   // e.g., 'METREY CLINIC & HOSPITAL'
  merchantCity: string   // e.g., 'PHNOM PENH'
  amount: number         // e.g., 25.50
  currency: 'USD' | 'KHR' // USD (840) or KHR (116)
  billNumber?: string    // e.g., 'INV-2026-0001'
  storeLabel?: string    // e.g., 'Cashier 1'
  terminalLabel?: string // e.g., 'OPD-01'
}

function pad(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0')
  return `${tag}${len}${value}`
}

export function generateKhqrString(opts: KhqrOptions): string {
  const accountId = opts.bakongAccountId || 'clinic_billing@aba'
  const merchantName = (opts.merchantName || 'METREY HOSPITAL').toUpperCase()
  const merchantCity = (opts.merchantCity || 'PHNOM PENH').toUpperCase()
  const currencyCode = opts.currency === 'KHR' ? '116' : '840'
  const formattedAmount = opts.currency === 'KHR' ? String(Math.round(opts.amount)) : Number(opts.amount).toFixed(2)

  // Tag 29: Merchant Account Information (Bakong Individual / Merchant)
  const bakongAcctSub = pad('00', accountId)
  const tag29 = pad('29', bakongAcctSub)

  // Tag 30: Merchant Category Code (General Medical / Healthcare: 8011)
  const tag52 = pad('52', '8011')

  // Tag 53: Transaction Currency (840 for USD, 116 for KHR)
  const tag53 = pad('53', currencyCode)

  // Tag 54: Transaction Amount
  const tag54 = pad('54', formattedAmount)

  // Tag 58: Country Code (KH)
  const tag58 = pad('58', 'KH')

  // Tag 59: Merchant Name
  const tag59 = pad('59', merchantName)

  // Tag 60: Merchant City
  const tag60 = pad('60', merchantCity)

  // Tag 62: Additional Data Field Template (Bill number, store label)
  let sub62 = ''
  if (opts.billNumber) sub62 += pad('01', opts.billNumber)
  if (opts.storeLabel) sub62 += pad('03', opts.storeLabel)
  if (opts.terminalLabel) sub62 += pad('07', opts.terminalLabel)
  const tag62 = sub62 ? pad('62', sub62) : ''

  // Payload without CRC
  const payloadBeforeCrc = `000201010212${tag29}${tag52}${tag53}${tag54}${tag58}${tag59}${tag60}${tag62}6304`

  // Calculate CRC16-CCITT (Polynomial 0x1021, Init 0xFFFF)
  const crc = calculateCrc16(payloadBeforeCrc)
  return `${payloadBeforeCrc}${crc}`
}

function calculateCrc16(data: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8)
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF
      } else {
        crc = (crc << 1) & 0xFFFF
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function getKhqrQrUrl(qrString: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrString)}`
}
