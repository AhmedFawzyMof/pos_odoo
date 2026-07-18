export type NotificationPriority = 'low' | 'medium' | 'high'

export interface NotificationType {
  id: number
  category: string
  trigger_event: string
  title: string
  title_ar: string
  description_ar: string | null
  priority: NotificationPriority
  audience: string
  is_active: number
}

export interface Notification {
  id: number
  type_id: number
  category: string
  title: string
  description: string | null
  priority: NotificationPriority
  odoo_ref_id: number | null
  odoo_ref_model: string | null
  odoo_ref_name: string | null
  is_read: number
  created_at: string
}

export interface NotificationsListResponse {
  data: Notification[]
  total: number
  page: number
  limit: number
}

export interface UnreadCountResponse {
  count: number
}

export interface CheckResponse {
  checked: number
  created: number
  errors: string[]
}
