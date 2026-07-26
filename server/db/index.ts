import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbs = new Map<string, Database.Database>()

function sanitizeDbName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function getDb(odooDbName?: string): Database.Database {
  const key = odooDbName || 'default'
  if (dbs.has(key)) return dbs.get(key)!

  const fileName = key === 'default'
    ? 'pos-app.db'
    : `pos-app-${sanitizeDbName(key)}.db`

  const dbPath = process.env.DB_PATH
    ? path.join(path.dirname(process.env.DB_PATH), fileName)
    : path.join(process.cwd(), fileName)

  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const database = new Database(dbPath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')

  const integrity = database.pragma('integrity_check', { simple: true }) as string
  if (integrity !== 'ok') {
    console.warn(`Database corruption detected for ${key}, recreating...`)
    database.close()
    fs.unlinkSync(dbPath)
    try { fs.unlinkSync(dbPath + '-wal') } catch {}
    try { fs.unlinkSync(dbPath + '-shm') } catch {}
    const newDb = new Database(dbPath)
    newDb.pragma('journal_mode = WAL')
    newDb.pragma('foreign_keys = ON')
    initSchema(newDb)
    dbs.set(key, newDb)
    return newDb
  }

  initSchema(database)
  dbs.set(key, database)
  return database
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      label_ar TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      odoo_user_id INTEGER UNIQUE NOT NULL,
      name TEXT,
      login TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS user_odoo_groups (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      odoo_group_id INTEGER NOT NULL,
      group_name TEXT,
      full_name TEXT,
      category_name TEXT,
      PRIMARY KEY (user_id, odoo_group_id)
    );

    CREATE TABLE IF NOT EXISTS notification_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      trigger_event TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      description_ar TEXT,
      priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
      audience TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_id INTEGER NOT NULL REFERENCES notification_types(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL,
      odoo_ref_id INTEGER,
      odoo_ref_model TEXT,
      odoo_ref_name TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipt_configs (
      company_id INTEGER PRIMARY KEY,
      config TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS location_translations (
      location_id INTEGER PRIMARY KEY,
      odoo_name TEXT NOT NULL,
      arabic_name TEXT NOT NULL,
      translated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  const count = database.prepare('SELECT COUNT(*) as count FROM roles').get() as any
  if (count.count === 0) {
    seedRoles(database)
  }

  const typesCount = database.prepare('SELECT COUNT(*) as count FROM notification_types').get() as any
  if (typesCount.count === 0) {
    seedNotificationTypes(database)
  }
}

function seedRoles(database: Database.Database) {
  const insert = database.prepare('INSERT INTO roles (name, label, label_ar) VALUES (?, ?, ?)')
  const roles: [string, string, string][] = [
    ['pos_user', 'Point of Sale / User', 'نقطة البيع / مستخدم'],
    ['pos_manager', 'Point of Sale / Administrator', 'نقطة البيع / مدير'],
    ['purchase_user', 'Purchase / User', 'المشتريات / مستخدم'],
    ['purchase_manager', 'Purchase / Administrator', 'المشتريات / مدير'],
    ['account_invoice', 'Accounting / Invoicing', 'المحاسبة / فواتير'],
    ['account_manager', 'Accounting / Administrator', 'المحاسبة / مدير'],
    ['stock_user', 'Inventory / User', 'المخزون / مستخدم'],
    ['stock_manager', 'Inventory / Administrator', 'المخزون / مدير'],
    ['settings_access_rights', 'Administration / Access Rights', 'الإدارة / صلاحيات الوصول'],
    ['base_user', 'Internal User', 'مستخدم داخلي'],
  ]
  const tx = database.transaction(() => {
    for (const [name, label, labelAr] of roles) {
      insert.run(name, label, labelAr)
    }
  })
  tx()
}

function seedNotificationTypes(database: Database.Database) {
  const insert = database.prepare(`
    INSERT INTO notification_types (category, trigger_event, title, title_ar, description_ar, priority, audience)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const types: [string, string, string, string, string, string, string][] = [
    ['Storage / Stock', 'low_stock', 'Low Stock Alert', 'تنبيه نفاد المخزون', 'Product stock falls below safety threshold', 'high', 'Inventory Manager, Admin'],
    ['Storage / Stock', 'stock_discrepancy', 'Stock Discrepancy Logged', 'اختلاف في المخزون المسجل', 'Stock discrepancy detected during manual audit', 'medium', 'Inventory Manager'],
    ['Suppliers', 'po_delayed', 'Purchase Order Delayed', 'تأخير أمر الشراء', 'Purchase Order (PO) is past its delivery date', 'high', 'Purchasing Agent'],
    ['Suppliers', 'new_invoice', 'New Vendor Invoice Received', 'فاتورة مورد جديدة', 'New invoice received from a vendor', 'low', 'Accounting, Admin'],
    ['POS / Sales', 'cash_shortage', 'Cash Shortage / Overage Detected', 'عجز/زيادة في النقدية', 'Shift closed with a cash shortage or overage', 'high', 'Store Manager, Owner'],
    ['Accounting', 'credit_limit_reached', 'Supplier Credit Limit Reached', 'حد الائتمان للمورد تم الوصول إليه', 'Supplier has reached their credit limit', 'medium', 'Accountant'],
    ['Accounting', 'tax_reminder', 'Tax/VAT Payout Reminder', 'تذكير دفع الضرائب', 'Tax/VAT payout is due (e.g., end of month)', 'medium', 'Admin, Accountant'],
  ]
  const tx = database.transaction(() => {
    for (const [category, trigger, title, titleAr, desc, priority, audience] of types) {
      insert.run(category, trigger, title, titleAr, desc, priority, audience)
    }
  })
  tx()
}

export function closeDb() {
  for (const [key, database] of dbs) {
    database.close()
  }
  dbs.clear()
}
