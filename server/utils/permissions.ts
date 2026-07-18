import { createError, getCookie } from 'h3'

async function getRoles(event: any): Promise<string[]> {
  const session = await getUserSession(event)
  if (session?.user?.roles?.length) {
    return session.user.roles
  }
  try {
    const raw = getCookie(event, 'auth_roles')
    if (!raw) return []
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return []
  }
}

export async function requirePermission(event: any, requiredRole: string): Promise<void> {
  const roles = await getRoles(event)
  if (!roles.length) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (!roles.includes(requiredRole)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: insufficient permissions' })
  }
}

export async function requireAnyPermission(event: any, requiredRoles: string[]): Promise<void> {
  const roles = await getRoles(event)
  if (!roles.length) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (!requiredRoles.some(r => roles.includes(r))) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: insufficient permissions' })
  }
}
