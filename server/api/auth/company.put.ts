import { defineEventHandler, readBody, createError } from "h3"

export default defineEventHandler(async (event) => {
  const { companyId } = await readBody(event)
  if (!companyId) {
    throw createError({ statusCode: 400, statusMessage: "companyId is required" })
  }

  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
  }

  await setUserSession(event, {
    ...session,
    currentCompanyId: companyId,
  })

  return { success: true }
})
