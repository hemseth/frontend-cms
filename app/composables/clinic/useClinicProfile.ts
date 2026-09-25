export interface PrintProfile {
  title: string
  subtitle: string
  logo: string
  address: string
  phone: string
  email: string
  website: string
  headerLines: string[]
  footerNote: string
}

interface ProfileSource {
  name?: string
  nameKh?: string
  logo?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  headerLines?: string[]
  footerNote?: string
}

// The Khmer name is the title; a clinic without one prints its English name instead, once.
export function toPrintProfile(clinic?: ProfileSource | null, branch?: ProfileSource | null): PrintProfile {
  const nameEn = clinic?.name || branch?.name || ''
  const nameKh = clinic?.nameKh || ''
  return {
    title: nameKh || nameEn,
    subtitle: nameKh ? nameEn : '',
    logo: clinic?.logo || '',
    address: branch?.address || clinic?.address || '',
    phone: branch?.phone || clinic?.phone || '',
    email: branch?.email || clinic?.email || '',
    website: clinic?.website || '',
    headerLines: (clinic?.headerLines ?? []).map(line => line.trim()).filter(Boolean),
    footerNote: clinic?.footerNote || ''
  }
}

// Uploaded files are stored as "/uploads/<name>" on the API host, not on the frontend host.
export function resolveAssetUrl(path: string, apiBase: string): string {
  if (!path) return ''
  if (/^(https?:|data:)/i.test(path)) return path
  try {
    return new URL(path.startsWith('/') ? path : `/${path}`, apiBase).toString()
  } catch {
    return path
  }
}

export const useClinicProfile = () => {
  const profile = ref<PrintProfile>(toPrintProfile())

  // Never throws: a print page should still render if the profile cannot be loaded.
  async function load() {
    try {
      const res: { data?: { clinic?: ProfileSource, branch?: ProfileSource | null } } = await $api('/my/clinic-profile')
      profile.value = toPrintProfile(res?.data?.clinic, res?.data?.branch)
    } catch (e) {
      console.error('Failed to load clinic profile', e)
    }
  }

  return { profile, load }
}
