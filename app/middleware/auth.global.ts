import { getRequiredPermission } from '../types/permissions'
import type { PermissionCheck } from '../types/permissions'

export default defineNuxtRouteMiddleware((to) => {
  const userCookie = useCookie("auth_user")
  const hasValidUserCookie = !!userCookie.value

  if (!hasValidUserCookie && to.path !== "/login") {
    return navigateTo("/login")
  }

  if (hasValidUserCookie && to.path === "/login") {
    return navigateTo("/")
  }

  if (hasValidUserCookie && to.path !== "/login") {
    const permCheck: PermissionCheck | null = getRequiredPermission(to.path)
    if (permCheck) {
      const rolesCookie = useCookie<string[]>("auth_roles")
      const userRoles: string[] = rolesCookie.value || []

      const hasRequired = (roles?: string[]) => {
        if (!roles || roles.length === 0) return true
        return roles.every(r => userRoles.includes(r))
      }
      const hasAny = (roles?: string[]) => {
        if (!roles || roles.length === 0) return true
        return roles.some(r => userRoles.includes(r))
      }

      let allowed = true
      if (permCheck.require && permCheck.require.length > 0) {
        allowed = hasRequired(permCheck.require)
      } else if (permCheck.requireAny && permCheck.requireAny.length > 0) {
        allowed = hasAny(permCheck.requireAny)
      }

      if (!allowed) {
        return navigateTo("/")
      }
    }
  }
})
