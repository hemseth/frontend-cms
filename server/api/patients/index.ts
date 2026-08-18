export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const cmsUrl = 'http://localhost:3000'
  
  try {
    const data = await $fetch(`${cmsUrl}/api/patients`, {
      method: event.method,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return data
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch patients'
    })
  }
})
