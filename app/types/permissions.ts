export const Groups = {
  POS_USER: 'pos_user',
  POS_MANAGER: 'pos_manager',
  PURCHASE_USER: 'purchase_user',
  PURCHASE_MANAGER: 'purchase_manager',
  ACCOUNT_INVOICE: 'account_invoice',
  ACCOUNT_MANAGER: 'account_manager',
  STOCK_USER: 'stock_user',
  STOCK_MANAGER: 'stock_manager',
  SETTINGS_ACCESS_RIGHTS: 'settings_access_rights',
  BASE_USER: 'base_user',
}

export const GroupKeys: Record<string, string> = {
  [Groups.POS_USER]: 'pos_user',
  [Groups.POS_MANAGER]: 'pos_manager',
  [Groups.PURCHASE_USER]: 'purchase_user',
  [Groups.PURCHASE_MANAGER]: 'purchase_manager',
  [Groups.ACCOUNT_INVOICE]: 'account_invoice',
  [Groups.ACCOUNT_MANAGER]: 'account_manager',
  [Groups.STOCK_USER]: 'stock_user',
  [Groups.STOCK_MANAGER]: 'stock_manager',
  [Groups.SETTINGS_ACCESS_RIGHTS]: 'settings_access_rights',
  [Groups.BASE_USER]: 'base_user',
}

export const RoleToOdooGroupName: Record<string, string> = {
  pos_user: 'Point of Sale / User',
  pos_manager: 'Point of Sale / Administrator',
  purchase_user: 'Purchase / User',
  purchase_manager: 'Purchase / Administrator',
  account_invoice: 'Accounting / Invoicing',
  account_manager: 'Accounting / Administrator',
  stock_user: 'Inventory / User',
  stock_manager: 'Inventory / Administrator',
  settings_access_rights: 'Administration / Access Rights',
  base_user: 'Internal User',
}

export interface PermissionCheck {
  require?: string[]
  requireAny?: string[]
}

export type ActionKey =
  | 'product.create' | 'product.edit' | 'product.delete' | 'product.view'
  | 'product.viewCost' | 'product.viewMargin'
  | 'category.create' | 'category.edit' | 'category.delete' | 'category.view'
  | 'order.view' | 'order.void' | 'order.editPayment' | 'order.removeLine' | 'order.editPrice'
  | 'cashier.sale' | 'cashier.changePrice' | 'cashier.discount'
  | 'cashier.cashInOut' | 'cashier.closeSession' | 'cashier.forceClose'
  | 'purchase.create' | 'purchase.confirm' | 'purchase.receive'
  | 'purchase.reverseReceive' | 'purchase.createBill'
  | 'vendorBill.create' | 'vendorBill.post' | 'vendorBill.pay'
  | 'vendorBill.cancel' | 'vendorBill.view'
  | 'expense.create' | 'expense.view'
  | 'warehouse.view' | 'warehouse.createLocation' | 'warehouse.transfer' | 'warehouse.reconciliation'
  | 'supplier.create' | 'supplier.edit' | 'supplier.delete' | 'supplier.view'
  | 'customer.view' | 'customer.create' | 'customer.edit'
  | 'report.view' | 'report.viewFinancial' | 'report.viewProfit'
  | 'company.edit' | 'user.manage'

export const ActionPermissions: Record<ActionKey, PermissionCheck> = {
  'product.view': { require: [Groups.POS_USER] },
  'product.create': { require: [Groups.POS_MANAGER] },
  'product.edit': { require: [Groups.POS_MANAGER] },
  'product.delete': { require: [Groups.POS_MANAGER] },
  'product.viewCost': { require: [Groups.POS_MANAGER] },
  'product.viewMargin': { require: [Groups.POS_MANAGER] },
  'category.view': { require: [Groups.POS_USER] },
  'category.create': { require: [Groups.POS_MANAGER] },
  'category.edit': { require: [Groups.POS_MANAGER] },
  'category.delete': { require: [Groups.POS_MANAGER] },
  'order.view': { require: [Groups.POS_USER] },
  'order.void': { require: [Groups.POS_MANAGER] },
  'order.editPayment': { require: [Groups.POS_MANAGER] },
  'order.removeLine': { require: [Groups.POS_MANAGER] },
  'order.editPrice': { require: [Groups.POS_MANAGER] },
  'cashier.sale': { require: [Groups.POS_USER] },
  'cashier.changePrice': { require: [Groups.POS_MANAGER] },
  'cashier.discount': { require: [Groups.POS_MANAGER] },
  'cashier.cashInOut': { require: [Groups.POS_MANAGER] },
  'cashier.closeSession': { require: [Groups.POS_MANAGER] },
  'cashier.forceClose': { require: [Groups.POS_MANAGER] },
  'purchase.create': { require: [Groups.PURCHASE_USER] },
  'purchase.confirm': { require: [Groups.PURCHASE_MANAGER] },
  'purchase.receive': { require: [Groups.PURCHASE_USER] },
  'purchase.reverseReceive': { require: [Groups.PURCHASE_MANAGER] },
  'purchase.createBill': { require: [Groups.PURCHASE_MANAGER] },
  'vendorBill.create': { require: [Groups.PURCHASE_USER] },
  'vendorBill.post': { require: [Groups.PURCHASE_MANAGER] },
  'vendorBill.pay': { require: [Groups.PURCHASE_USER] },
  'vendorBill.cancel': { require: [Groups.PURCHASE_MANAGER] },
  'vendorBill.view': { require: [Groups.PURCHASE_USER] },
  'expense.create': { require: [Groups.POS_MANAGER] },
  'expense.view': { require: [Groups.POS_MANAGER] },
  'warehouse.view': { require: [Groups.STOCK_USER] },
  'warehouse.createLocation': { require: [Groups.STOCK_MANAGER] },
  'warehouse.transfer': { require: [Groups.STOCK_USER] },
  'warehouse.reconciliation': { require: [Groups.STOCK_USER] },
  'supplier.create': { require: [Groups.PURCHASE_USER] },
  'supplier.edit': { require: [Groups.PURCHASE_MANAGER] },
  'supplier.delete': { require: [Groups.PURCHASE_MANAGER] },
  'supplier.view': { require: [Groups.PURCHASE_USER] },
  'customer.view': { require: [Groups.POS_USER] },
  'customer.create': { require: [Groups.POS_MANAGER] },
  'customer.edit': { require: [Groups.POS_MANAGER] },
  'report.view': { require: [Groups.POS_MANAGER] },
  'report.viewFinancial': { require: [Groups.ACCOUNT_MANAGER] },
  'report.viewProfit': { require: [Groups.ACCOUNT_MANAGER] },
  'company.edit': { require: [Groups.SETTINGS_ACCESS_RIGHTS] },
  'user.manage': { require: [Groups.SETTINGS_ACCESS_RIGHTS] },
}

export const PagePermissions: Record<string, PermissionCheck> = {
  '/': { requireAny: [] },
  '/login': { requireAny: [] },
  '/pos': { require: [Groups.POS_USER] },
  '/pos/sales': { require: [Groups.POS_USER] },
  '/cashier': { require: [Groups.POS_USER] },
  '/products': { require: [Groups.POS_USER] },
  '/categories': { require: [Groups.POS_USER] },
  '/customers': { require: [Groups.POS_USER] },
  '/customer-details': { require: [Groups.POS_USER] },
  '/orders': { require: [Groups.POS_USER] },
  '/reports': { require: [Groups.POS_USER] },
  '/user-profile': { requireAny: [Groups.POS_USER, Groups.BASE_USER] },
  '/company-profile': { require: [Groups.POS_MANAGER] },
  '/receipt-design': { require: [Groups.POS_MANAGER] },
  '/suppliers': { require: [Groups.PURCHASE_USER] },
  '/supplier-details': { require: [Groups.PURCHASE_USER] },
  '/purchase-orders': { require: [Groups.PURCHASE_USER] },
  '/vendor-bills': { require: [Groups.ACCOUNT_INVOICE] },
  '/operational-expenses': { require: [Groups.PURCHASE_USER] },
  '/late-payments': { require: [Groups.ACCOUNT_INVOICE] },
  '/warehouse': { require: [Groups.STOCK_USER] },
  '/stock-movements': { require: [Groups.STOCK_USER] },
  '/accounting': { require: [Groups.ACCOUNT_INVOICE] },
  '/users': { require: [Groups.SETTINGS_ACCESS_RIGHTS] },
  '/notifications': { require: [Groups.SETTINGS_ACCESS_RIGHTS] },
}

export function getRequiredPermission(path: string): PermissionCheck | null {
  return PagePermissions[path] || null
}

export interface PageLevelDef {
  id: string
  label: string
  labelAr: string
  descriptionAr: string
  dependsOn?: string
  groupRef: keyof typeof Groups
}

export interface PageDef {
  key: string
  label: string
  labelAr: string
  routes: string[]
  levels: PageLevelDef[]
}

export const Pages: PageDef[] = [
  {
    key: 'pos',
    label: 'Point of Sale',
    labelAr: 'نقطة البيع',
    routes: ['/pos', '/pos/sales', '/cashier', '/orders', '/products', '/categories', '/customers', '/customer-details', '/reports', '/company-profile', '/receipt-design'],
    levels: [
      { id: 'user', label: 'User', labelAr: 'مستخدم', descriptionAr: 'يمكنه إجراء عمليات البيع، عرض المنتجات والعملاء والطلبات، إغلاق الجلسة', groupRef: 'POS_USER' },
      { id: 'admin', label: 'Administrator', labelAr: 'مدير', dependsOn: 'user', descriptionAr: 'يمكنه تغيير الأسعار وتطبيق الخصومات وإلغاء الطلبات وإدارة إعدادات الشركة وجبر الإغلاق', groupRef: 'POS_MANAGER' },
    ],
  },
  {
    key: 'purchase',
    label: 'Purchase',
    labelAr: 'المشتريات',
    routes: ['/suppliers', '/supplier-details', '/purchase-orders'],
    levels: [
      { id: 'user', label: 'User', labelAr: 'مستخدم', descriptionAr: 'يمكنه إنشاء قائمة مشترايات وتأكيد الاستلام وعرض الموردين', groupRef: 'PURCHASE_USER' },
      { id: 'admin', label: 'Administrator', labelAr: 'مدير', dependsOn: 'user', descriptionAr: 'يمكنه إدارة كاملة للمشتريات وحذف الموردين', groupRef: 'PURCHASE_MANAGER' },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    labelAr: 'المخزون',
    routes: ['/warehouse', '/stock-movements'],
    levels: [
      { id: 'user', label: 'User', labelAr: 'مستخدم', descriptionAr: 'يمكنه عرض المخزون وتحويل المنتجات وعرض حركات المخزون', groupRef: 'STOCK_USER' },
      { id: 'admin', label: 'Administrator', labelAr: 'مدير', dependsOn: 'user', descriptionAr: 'يمكنه إدارة مواقع المخزون والتحكم الكامل في المخزون', groupRef: 'STOCK_MANAGER' },
    ],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    labelAr: 'المحاسبة',
    routes: ['/vendor-bills', '/accounting'],
    levels: [
      { id: 'invoicing', label: 'Invoicing', labelAr: 'فاتورة', descriptionAr: 'يمكنه إنشاء وترحيل فواتير الموردين وعرض التقارير المالية', groupRef: 'ACCOUNT_INVOICE' },
      { id: 'admin', label: 'Administrator', labelAr: 'مدير', dependsOn: 'invoicing', descriptionAr: 'يمكنه التحكم الكامل في المحاسبة وإلغاء الفواتير', groupRef: 'ACCOUNT_MANAGER' },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    labelAr: 'الإدارة',
    routes: ['/users', '/user-profile', '/company-profile'],
    levels: [
      { id: 'access_rights', label: 'Access Rights', labelAr: 'صلاحيات الوصول', descriptionAr: 'يمكنه إدارة المستخدمين وصلاحياتهم', groupRef: 'SETTINGS_ACCESS_RIGHTS' },
    ],
  },
]

const categoryPageMap: Record<string, string> = {
  'Point of Sale': 'pos',
  'Purchase': 'purchase',
  'Inventory': 'inventory',
  'Accounting': 'accounting',
  'Administration': 'administration',
  'Bank': 'accounting',
  'Invoicing': 'accounting',
  'Sales': 'pos',
  'Extra Rights': 'administration',
  'Technical': 'administration',
  'Dashboard': 'pos',
  'Canned Responses': 'pos',
  'Fleet': 'purchase',
}

export function getPageForGroup(group: any): PageDef | null {
  const categoryName = group.categoryName || ''
  const mappedKey = categoryPageMap[categoryName]
  if (mappedKey) return Pages.find(p => p.key === mappedKey) || null

  const lower = categoryName.toLowerCase()
  for (const page of Pages) {
    if (page.label === categoryName || page.key === categoryName) return page
    if (page.label.toLowerCase() === lower || page.key.toLowerCase() === lower) return page
    if (lower.includes(page.key.toLowerCase()) || page.key.toLowerCase().includes(lower)) return page
  }
  return null
}

export interface EnrichedPage extends PageDef {
  additionalGroups: any[]
}

export function categorizeGroups(apiGroups: any[]): {
  enrichedPages: EnrichedPage[]
  userTypeGroups: any[]
} {
  const knownGroupNames = new Set<string>()
  for (const page of Pages) {
    for (const level of page.levels) {
      knownGroupNames.add(Groups[level.groupRef])
    }
  }

  const enrichedPages: EnrichedPage[] = Pages.map(p => ({ ...p, additionalGroups: [] }))
  const userTypeGroups: any[] = []

  for (const group of apiGroups) {
    if (group.categoryName === 'User types') {
      userTypeGroups.push(group)
      continue
    }
    const fullName = group.fullName || `${group.categoryName} / ${group.name}`
    if (knownGroupNames.has(fullName)) continue

    const page = getPageForGroup(group)
    if (page) {
      const ep = enrichedPages.find(p => p.key === page.key)!
      ep.additionalGroups.push(group)
    } else {
      enrichedPages.push({
        key: `unknown_${group.categoryName || group.name}`,
        label: group.categoryName || group.name,
        labelAr: group.categoryName || group.name,
        routes: [],
        levels: [],
        additionalGroups: [group],
      })
    }
  }

  return { enrichedPages, userTypeGroups }
}
