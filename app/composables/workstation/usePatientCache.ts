import type { QueuePatient } from '~/types/workstation'

/**
 * The queue endpoints only return patient names, so age, sex, code, coverage and allergies are
 * fetched once per patient per session and reused by every poll. Shared across pages via useState.
 */
export function usePatientCache() {
  const cache = useState<Record<string, QueuePatient>>('workstation-patient-cache', () => ({}))
  const pending = new Set<string>()

  async function ensure(ids: string[]) {
    const missing = [...new Set(ids)].filter(id => id && !cache.value[id] && !pending.has(id))
    if (!missing.length) return
    missing.forEach(id => pending.add(id))
    await Promise.all(missing.map(async (id) => {
      try {
        const res: { data?: QueuePatient } = await $api(`/patients/${id}`)
        if (res?.data) cache.value = { ...cache.value, [id]: res.data }
      } catch {
        // A patient the user cannot read keeps the name-only record from the queue.
      } finally {
        pending.delete(id)
      }
    }))
  }

  const get = (id: string, fallback: QueuePatient): QueuePatient => ({ ...fallback, ...(cache.value[id] || {}) })

  /** Refresh one patient (e.g. after allergies change). */
  function put(patient: QueuePatient) {
    cache.value = { ...cache.value, [patient._id]: patient }
  }

  return { ensure, get, put }
}
