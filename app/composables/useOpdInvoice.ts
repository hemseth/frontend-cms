import { ref, computed, nextTick, watch } from 'vue'
import type { OpdRow, OpdService, OpdMedicine } from '~/types/models'

export const useOpdInvoice = (
  getCategoryName: (service: OpdService) => string,
  categoryMap: any // ComputedRef or Ref
) => {
  const rows = ref<OpdRow[]>([])
  const toast = useToast()

  // Financials
  const discount = ref(0)
  const totalReceived = ref(0)
  const payDate = ref(new Date().toISOString().split('T')[0])
  const receivedDate = ref(new Date().toISOString().split('T')[0])
  const admissionDate = ref(new Date().toISOString().split('T')[0])
  const dischargeDate = ref('')

  // Result Modal State
  const isResultEntryModalOpen = ref(false)
  const selectedServiceForResults = ref<any>(null)
  const selectedServiceResultIndex = ref<number>(-1)

  function rowQtySum(r: OpdRow): number {
    if (r.isWholesale) return Number(r.qty) || 1
    const qmor = Number(r.qmor) || 0
    const qaft = Number(r.qaft) || 0
    const qeve = Number(r.qeve) || 0
    const qngt = Number(r.qngt) || 0
    const perDay = qmor + qaft + qeve + qngt
    const days = (r.days !== undefined && r.days !== null && r.days !== '' && !isNaN(Number(r.days)))
      ? Math.max(1, Number(r.days))
      : 1

    if (perDay > 0) {
      return perDay * days
    }
    if (days > 1) {
      return (Number(r.qty) || 1) * days
    }
    return Number(r.qty) || 1
  }

  function rowTotal(r: OpdRow): number {
    return rowQtySum(r) * (Number(r.price) || 0)
  }

  const subtotal = computed((): number =>
    rows.value.reduce((s, r) => s + rowTotal(r), 0)
  )

  const grandTotal = computed((): number =>
    Math.max(0, subtotal.value - discount.value)
  )

  // Sync totalReceived with grandTotal automatically
  watch(grandTotal, (newVal) => {
    totalReceived.value = newVal
  })

  const balance = computed(
    (): number => grandTotal.value - totalReceived.value
  )

  function addRow() {
    rows.value.push({
      name: '',
      price: 0,
      qmor: 0,
      qaft: 0,
      qeve: 0,
      qngt: 0,
      days: 1,
      qty: 1,
      type: 'MEDICINE'
    })
  }

  // Delete Modal State
  const isDeleteModalOpen = ref(false)
  const pendingDeleteIndex = ref(-1)

  function removeRow(index: number) {
    const row = rows.value[index] as any
    // Check if item exists in DB (has _id)
    if (row._id) {
      pendingDeleteIndex.value = index
      isDeleteModalOpen.value = true
    } else {
      rows.value.splice(index, 1)
    }
  }

  function confirmRemoveRow() {
    if (pendingDeleteIndex.value !== -1) {
      rows.value.splice(pendingDeleteIndex.value, 1)
      pendingDeleteIndex.value = -1
      isDeleteModalOpen.value = false
      toast.add({
        title: 'Released',
        description: 'Item removed (Ensure you save changes)',
        color: 'info'
      })
    }
  }

  function addMedicine(
    med: OpdMedicine,
    qty = 1,
    onFocus?: () => void,
    isWholesale = false
  ) {
    const medName = med.nameEn || med.nameKh || ''

    // Check for duplicate medicine
    const existingMed = rows.value.find(
      r => r.name === medName && r.type === 'MEDICINE'
    )
    if (existingMed) {
      existingMed.qmor = (Number(existingMed.qmor) || 0) + qty
      toast.add({
        title: 'Updated',
        description: `Quantity updated for ${medName}`,
        color: 'info'
      })
      return
    }

    const unitLabel = (med.unit && typeof med.unit === 'object')
      ? ((med.unit as any).nameKh || (med.unit as any).nameEn || '')
      : (med.unit || '')

    const finalPrice = isWholesale ? (med.wholesalePrice || med.price) : (med.retailPrice || med.price)
    const finalUnit = isWholesale ? (med.saleUnit || unitLabel) : (med.baseUnit || unitLabel)

    rows.value.push({
      medicineId: med._id,
      name: medName,
      price: finalPrice,
      qmor: qty,
      qaft: 0,
      qeve: 0,
      qngt: 0,
      days: 1,
      qty: 1,
      type: 'MEDICINE',
      unit: finalUnit,
      isWholesale: isWholesale,
      retailPrice: med.retailPrice || med.price,
      wholesalePrice: med.wholesalePrice || med.price,
      baseUnit: med.baseUnit || unitLabel,
      saleUnit: med.saleUnit || unitLabel
    })

    if (onFocus) {
      nextTick(() => {
        onFocus()
      })
    }
  }

  function addServiceRow(service: OpdService, explicitParams?: any[]) {
    let type: 'LAB' | 'ECHO' | 'SERVICE' | 'SCAN' = 'SERVICE'
    const catId = service.categoryId || service.category
    const cat = catId ? categoryMap.value.get(catId) : null
    const group = cat?.group?.toLowerCase()

    if (group === 'laboratory') {
      type = 'LAB'
    } else if (group === 'imaging') {
      type = 'ECHO'
      if (cat?.type === 'xray' || cat?.type === 'ct') type = 'SCAN'
      else if (cat?.type === 'ultrasound') type = 'ECHO'
    }

    const serviceName = service.name || service.nameEn || service.nameKh || ''

    // Check for duplicate service
    const existingRow = rows.value.find(
      r => r.name === serviceName && r.type === type
    )
    if (existingRow) {
      // If "just add parameter"
      if (explicitParams && explicitParams.length > 0) {
        if (!existingRow.parameters) existingRow.parameters = []

        // Filter params that don't exist yet
        const newParams = explicitParams.filter(
          (newP: any) =>
            !existingRow.parameters?.some(
              (existingP: any) => existingP.labelEn === newP.labelEn
            )
        )

        if (newParams.length > 0) {
          existingRow.parameters.push(...JSON.parse(JSON.stringify(newParams)))
          toast.add({
            title: 'Updated',
            description: `${newParams.length} parameter(s) added to ${serviceName}`,
            color: 'success'
          })
        } else {
          toast.add({
            title: 'Info',
            description: 'Selected parameters already exist',
            color: 'info'
          })
        }
      } else {
        toast.add({
          title: 'Info',
          description: 'Service already added',
          color: 'info'
        })
      }
      return existingRow
    }

    // Use explicit params if provided, otherwise deep copy from service
    const rowParams = explicitParams
      ? JSON.parse(JSON.stringify(explicitParams))
      : service.parameters
        ? JSON.parse(JSON.stringify(service.parameters))
        : undefined

    const newRow = {
      name: serviceName,
      nameKh: service.nameKh || '',
      price: service.price,
      qmor: 1,
      qaft: 0,
      qeve: 0,
      qngt: 0,
      result: service.template || '',
      type: type,
      category: cat?.nameEn || '',
      parameters: rowParams
    }

    rows.value.push(newRow)

    toast.add({
      title: 'Added',
      description: `${service.nameEn || service.nameKh} added to ${type}`,
      color: 'success'
    })

    return newRow
  }

  function openResultEntryModal(service: any, index: number) {
    selectedServiceForResults.value = service
    selectedServiceResultIndex.value = index
    isResultEntryModalOpen.value = true
  }

  async function saveLabResult(row: any, index: number) {
    let status = 'pending'

    if (row.parameters && row.parameters.length > 0) {
      const filledCount
        = row.parameters.filter((p: any) => p.value && String(p.value).trim()).length
          || 0
      const totalCount = row.parameters.length
      status
        = filledCount === 0
          ? 'pending'
          : filledCount === totalCount
            ? 'completed'
            : 'in-progress'
    } else {
      status = row.result && String(row.result).trim() ? 'completed' : 'pending'
    }

    // Persist to backend if item is saved in database
    if (row._id) {
      try {
        await $api(`/labs/${row._id}`, {
          method: 'PUT',
          body: {
            result: row.result,
            parameters: row.parameters,
            status
          }
        })
      } catch (err: any) {
        console.error('Failed to persist lab result:', err)
      }
    }

    toast.add({
      title: 'Saved',
      description: `Results for ${row.name} saved successfully (Status: ${status})`,
      color: 'success'
    })
  }

  function saveResultEntry() {
    toast.add({
      title: 'Saved',
      description: 'Results saved successfully',
      color: 'success'
    })
  }

  // Vitals State
  const vitals = ref({
    bp: '',
    heartRate: '',
    respRate: '',
    temp: '',
    weight: '',
    oxygen: '',
    height: '',
    bsl: ''
  })

  async function saveOpdTransaction(
    patientId: string,
    paymentMethod: string,
    visitId?: string | null,
    note?: string,
    diagnoses?: string[],
    doctorId?: string
  ) {
    if (!patientId) {
      toast.add({
        title: 'Error',
        description: 'Please select a patient',
        color: 'error'
      })
      return
    }

    // Filter out empty rows
    const validRows = rows.value.filter(
      r => r.name && r.name.trim().length > 0
    )

    if (validRows.length === 0 && !visitId) {
      toast.add({
        title: 'Error',
        description: 'No valid items to save',
        color: 'error'
      })
      return
    }

    try {
      // Step 2: Prepare Clinical Records (Prescriptions & Labs)
      const medRows = validRows.filter(r => r.type === 'MEDICINE')
      const labRows = validRows.filter(r => r.type !== 'MEDICINE')

      // Prepare Medications
      const medications = medRows.map(r => ({
        medicineId: r.medicineId,
        medication: r.name,
        quantity: rowQtySum(r) || 1,
        unitPrice: Number(r.price),
        totalPrice: rowTotal(r),
        morning: Number(r.qmor) || 0,
        afternoon: Number(r.qaft) || 0,
        evening: Number(r.qeve) || 0,
        night: Number(r.qngt) || 0,
        days: Number(r.days) || 1,
        duration: `${Number(r.days) || 1} ថ្ងៃ`,
        unit: r.unit,
        isWholesale: r.isWholesale
      }))

      // Prepare Lab/Imaging
      const labRequests = labRows.map((r) => {
        let status = 'pending'
        if (r.parameters && r.parameters.length > 0) {
          const filledCount = r.parameters.filter(
            (p: any) => p.value && String(p.value).trim() !== ''
          ).length
          if (filledCount === r.parameters.length) {
            status = 'completed'
          }
        } else {
          if (r.result && String(r.result).trim() !== '') {
            status = 'completed'
          }
        }

        return {
          serviceName: r.name,
          serviceNameKh: r.nameKh,
          category:
            r.type === 'ECHO' || r.type === 'SCAN' ? 'imaging' : 'laboratory',
          status: status,
          parameters: r.parameters,
          result: r.result,
          price: Number(r.price || 0)
        }
      })

      // Prepare Payment Items
      const items = validRows.map((r) => {
        let cat = 'other'
        if (r.type === 'MEDICINE') cat = 'medicine'
        else if (r.type === 'LAB') cat = 'laboratory'
        else if (r.type === 'ECHO' || r.type === 'SCAN') cat = 'imaging'

        return {
          name: r.name,
          price: Number(r.price || 0),
          quantity: rowQtySum(r) || 1,
          category: cat,
          subtotal: rowTotal(r)
        }
      })

      const payment = {
        subtotal: subtotal.value,
        amount: grandTotal.value,
        discount: discount.value,
        tax: 0,
        currency: 'USD',
        method: paymentMethod || 'cash',
        status: totalReceived.value >= grandTotal.value ? 'paid'
          : totalReceived.value > 0 ? 'partially_paid' : 'pending',
        items,
        payDate: payDate.value,
        receivedDate: receivedDate.value,
        totalReceived: totalReceived.value,
        balance: balance.value
      }

      // Call Single Transaction API
      const response: any = await $api('/opd/transaction', {
        method: 'POST',
        body: {
          patientId,
          visitNotes: note,
          diagnosis: (diagnoses || []).map((d: any) =>
            typeof d === 'string' ? { nameEn: d } : d
          ),
          vitals: vitals.value,
          paymentMethod,
          medications,
          labRequests,
          payment,
          id: visitId,
          doctorId
        }
      })

      toast.add({
        title: 'Success',
        description: 'OPD Transaction saved successfully',
        color: 'success'
      })

      // Update local rows with returned IDs to ensure Delete Modal works
      const savedMeds = response.data.medications || []
      const savedLabs = response.data.labRequests || []

      validRows.forEach((r: any) => {
        if (r.type === 'MEDICINE') {
          const match = savedMeds.find((m: any) => m.medication === r.name)
          if (match) r._id = match._id
        } else {
          const match = savedLabs.find((l: any) => l.serviceName === r.name)
          if (match) r._id = match._id
        }
      })

      return {
        data: {
          ...response.data.payment,
          visitId: response.data.visit._id,
          visit: response.data.visit,
          medications: response.data.medications,
          labRequests: response.data.labRequests
        }
      }
    } catch (e: any) {
      console.error('Failed to save transaction', e)
      toast.add({
        title: 'Error',
        description: e.message || 'Failed to save transaction',
        color: 'error'
      })
      throw e
    }
  }

  return {
    rows,
    grandTotal,
    discount,
    subtotal,
    isResultEntryModalOpen,
    selectedServiceForResults,
    rowQtySum,
    rowTotal,
    addRow,
    removeRow,
    addMedicine,
    addServiceRow,
    openResultEntryModal,
    saveResultEntry,
    saveLabResult,
    saveOpdTransaction,
    vitals,
    isDeleteModalOpen,
    confirmRemoveRow,
    payDate,
    receivedDate,
    totalReceived,
    balance,
    admissionDate,
    dischargeDate
  }
}
