export default defineEventHandler(async (event) => {
  const cmsUrl = 'http://localhost:3000'
  
  try {
    const data = await $fetch(`${cmsUrl}/api/payments`, {
      method: event.method,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return data
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch payments'
    })
  }
})
