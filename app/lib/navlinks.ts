import { h } from "vue";
import {
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Receipt,
  ShoppingBag,
  Users,
  Warehouse,
  Timer,
  History,
  ArrowLeftRight,
  Truck,
  ClipboardList,
  ReceiptText,
  User,
  Building2,
  FileText,
  Shield,
  Banknote,
  AlertCircle,
  Bell,
} from "@lucide/vue";

export interface NavItem {
  name: string;
  path: string;
  icon: ReturnType<typeof h>;
  requiredPermission?: string;
}

export interface NavGroup {
  name: string;
  icon: ReturnType<typeof h>;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export const navLinks: NavItem[] = [
  { name: "لوحة التحكم", path: "/", icon: h(LayoutDashboard) },
  { name: "المبيعات (POS)", path: "/pos", icon: h(Receipt), requiredPermission: "pos_user" },
  { name: "المحاسبة", path: "/accounting", icon: h(Landmark), requiredPermission: "account_invoice" },
  { name: "المخزون", path: "/warehouse", icon: h(Warehouse), requiredPermission: "stock_user" },
  { name: "حركات المخزون", path: "/stock-movements", icon: h(History), requiredPermission: "stock_user" },
  { name: "نقل مخزني", path: "/stock-transfers", icon: h(ArrowLeftRight), requiredPermission: "stock_user" },
  { name: "المنتجات", path: "/products", icon: h(ShoppingBag), requiredPermission: "pos_user" },
  { name: "الأقسام", path: "/categories", icon: h(LayoutGrid), requiredPermission: "pos_user" },
  { name: "العملاء", path: "/customers", icon: h(Users), requiredPermission: "pos_user" },
  { name: "الموردين", path: "/suppliers", icon: h(Truck), requiredPermission: "purchase_user" },
  { name: "قائمة مشترايات", path: "/purchase-orders", icon: h(ClipboardList), requiredPermission: "purchase_user" },
  { name: "فواتير الموردين", path: "/vendor-bills", icon: h(ReceiptText), requiredPermission: "account_invoice" },
  { name: "المدفوعات المتأخرة", path: "/late-payments", icon: h(AlertCircle), requiredPermission: "account_invoice" },
  { name: "المصروفات التشغيلية", path: "/operational-expenses", icon: h(Banknote), requiredPermission: "purchase_user" },
  { name: "سجل الطلبات", path: "/orders", icon: h(Timer), requiredPermission: "pos_user" },
  { name: "التقارير", path: "/reports", icon: h(FileText), requiredPermission: "pos_user" },
  { name: "الملف الشخصي", path: "/user-profile", icon: h(User) },
  { name: "بيانات الشركة", path: "/company-profile", icon: h(Building2), requiredPermission: "pos_manager" },
  { name: "تصميم الفاتورة", path: "/receipt-design", icon: h(FileText), requiredPermission: "pos_manager" },
  { name: "الإشعارات", path: "/notifications", icon: h(Bell), requiredPermission: "settings_access_rights" },
];

const isActive = (routePath: string, linkPath: string) =>
  linkPath === "/" ? routePath === "/" : routePath.startsWith(linkPath);

const isGroupActive = (routePath: string, group: NavGroup) =>
  group.children.some((child) => isActive(routePath, child.path));

export const groupedNav: NavEntry[] = [
  { name: "لوحة التحكم", path: "/", icon: h(LayoutDashboard) },
  {
    name: "المبيعات",
    icon: h(Receipt),
    children: [
      { name: "المبيعات (POS)", path: "/pos", icon: h(Receipt), requiredPermission: "pos_user" },
      { name: "سجل الطلبات", path: "/orders", icon: h(Timer), requiredPermission: "pos_user" },
    ],
  },
  {
    name: "المنتجات",
    icon: h(ShoppingBag),
    children: [
      { name: "المنتجات", path: "/products", icon: h(ShoppingBag), requiredPermission: "pos_user" },
      { name: "الأقسام", path: "/categories", icon: h(LayoutGrid), requiredPermission: "pos_user" },
    ],
  },
  {
    name: "المخزون",
    icon: h(Warehouse),
    children: [
      { name: "المخزون", path: "/warehouse", icon: h(Warehouse), requiredPermission: "stock_user" },
      { name: "حركات المخزون", path: "/stock-movements", icon: h(History), requiredPermission: "stock_user" },
      { name: "نقل مخزني", path: "/stock-transfers", icon: h(ArrowLeftRight), requiredPermission: "stock_user" },
    ],
  },
  {
    name: "المشتريات",
    icon: h(Truck),
    children: [
      { name: "الموردين", path: "/suppliers", icon: h(Truck), requiredPermission: "purchase_user" },
      { name: "قائمة مشترايات", path: "/purchase-orders", icon: h(ClipboardList), requiredPermission: "purchase_user" },
      { name: "فواتير الموردين", path: "/vendor-bills", icon: h(ReceiptText), requiredPermission: "account_invoice" },
      { name: "المدفوعات المتأخرة", path: "/late-payments", icon: h(AlertCircle), requiredPermission: "account_invoice" },
      { name: "المصروفات التشغيلية", path: "/operational-expenses", icon: h(Banknote), requiredPermission: "purchase_user" },
    ],
  },
  { name: "العملاء", path: "/customers", icon: h(Users), requiredPermission: "pos_user" },
  { name: "التقارير", path: "/reports", icon: h(FileText), requiredPermission: "pos_user" },
  { name: "المحاسبة", path: "/accounting", icon: h(Landmark), requiredPermission: "account_invoice" },
  {
    name: "الإعدادات",
    icon: h(User),
    children: [
      { name: "الملف الشخصي", path: "/user-profile", icon: h(User) },
      { name: "بيانات الشركة", path: "/company-profile", icon: h(Building2), requiredPermission: "pos_manager" },
      { name: "تصميم الفاتورة", path: "/receipt-design", icon: h(FileText), requiredPermission: "pos_manager" },
      { name: "المستخدمين", path: "/users", icon: h(Shield), requiredPermission: "settings_access_rights" },
      { name: "الإشعارات", path: "/notifications", icon: h(Bell), requiredPermission: "settings_access_rights" },
    ],
  },
];
