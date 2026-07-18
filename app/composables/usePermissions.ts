import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { ActionPermissions, PagePermissions, Pages, Groups, type ActionKey } from '../types/permissions'

export const usePermissions = () => {
  const auth = useAuthStore()

  const userRoles = computed(() => auth.userRoles || [])

  function hasPermission(roleName: string): boolean {
    if (!roleName) return true
    return userRoles.value.includes(roleName)
  }

  function hasAnyPermission(roles: string[]): boolean {
    if (!roles || roles.length === 0) return true
    return roles.some(r => hasPermission(r))
  }

  function hasAllPermissions(roles: string[]): boolean {
    if (!roles || roles.length === 0) return true
    return roles.every(r => hasPermission(r))
  }

  const can = computed(() => {
    function check(action: ActionKey): boolean {
      const perm = ActionPermissions[action]
      if (!perm) return false
      if (perm.require && perm.require.length > 0) {
        return hasAllPermissions(perm.require)
      }
      if (perm.requireAny && perm.requireAny.length > 0) {
        return hasAnyPermission(perm.requireAny)
      }
      return true
    }
    return check
  })

  function canViewPage(path: string): boolean {
    const perm = PagePermissions[path]
    if (perm) {
      if (perm.require && perm.require.length > 0) return hasAllPermissions(perm.require)
      if (perm.requireAny && perm.requireAny.length > 0) return hasAnyPermission(perm.requireAny)
      return true
    }
    const page = Pages.find(p => p.routes.includes(path))
    if (page) {
      return hasPermission(Groups[page.levels[0].groupRef])
    }
    return true
  }

  const isManager = computed(() => hasPermission('pos_manager'))
  const isPosUser = computed(() => hasPermission('pos_user'))
  const isPurchaseUser = computed(() => hasPermission('purchase_user'))
  const isStockUser = computed(() => hasPermission('stock_user'))
  const isAccountUser = computed(() => hasPermission('account_invoice'))

  return {
    userRoles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
    canViewPage,
    isManager,
    isPosUser,
    isPurchaseUser,
    isStockUser,
    isAccountUser,
  }
}
