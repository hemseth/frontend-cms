export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const cmsUrl = 'http://localhost:3000'
  
  try {
    const data = await $fetch(`${cmsUrl}/api/patients/${id}`, {
      method: event.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: event.method !== 'GET' ? await readBody(event) : undefined
    })
    return data
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to process patient request'
    })
  }
})
