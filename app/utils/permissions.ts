const groupTranslations: Record<string, string> = {
  // Base standalone
  "Internal User": "مستخدم داخلي",
  "Portal": "بوابة العملاء",
  "Public": "عام",
  "Settings": "الإعدادات",
  "Access Rights": "صلاحيات الوصول",
  "Technical Features": "الميزات التقنية",
  "Multi Companies": "شركات متعددة",
  "Multi Currencies": "عملات متعددة",
  "Contact Creation": "إنشاء جهات الاتصال",
  "Access to export feature": "الوصول إلى خاصية التصدير",
  "Bypass HTML Field Sanitize": "تجاوز تنقية حقول HTML",

  // Common roles standalone
  "User": "مستخدم",
  "Administrator": "مدير",
  "Manager": "مدير",
  "Officer": "مسؤول",
  "Employee": "موظف",
  "Invoicing": "الفوترة",
  "Basic": "أساسي",

  // User-scoped variants
  "User: Own Documents Only": "مستنداتي فقط",
  "User: All Documents": "جميع المستندات",
  "User: own timesheets only": "ساعاتي فقط",
  "User: all timesheets": "جميع الساعات",

  // Feature toggles standalone
  "Discount on lines": "الخصم على البنود",
  "Pro-forma Invoices": "الفواتير الأولية",
  "Quotation Templates": "قوالب عروض الأسعار",
  "Show Lead Menu": "إظهار قائمة الفرص",
  "Show Full Accounting Features": "جميع ميزات المحاسبة",
  "Delivery Address": "عنوان التسليم",
  "Manage Multiple Stock Locations": "إدارة مواقع مخزون متعددة",
  "Manage Multiple Warehouses": "إدارة مستودعات متعددة",
  "Manage Lots / Serial Numbers": "إدارة الدفعات / الأرقام التسلسلية",
  "Manage Packages": "إدارة الطرود",
  "Manage Push and Pull inventory flows": "إدارة تدفقات المخزون",
  "Manage Multiple Units of Measure": "إدارة وحدات القياس المتعددة",
  "Manage Product Packaging": "إدارة تغليف المنتجات",
  "Manage Product Variants": "إدارة متغيرات المنتج",
  "Manage Work Order Operations": "إدارة عمليات أمر العمل",
  "Product Creation": "إنشاء المنتجات",
  "Basic Pricelists": "قوائم أسعار أساسية",
  "Purchase Receipt": "إيصال استلام المشتريات",
  "Sale Receipt": "إيصال المبيعات",
  "Use Reception Report": "استخدام تقرير الاستلام",
  "Use Stages on Project": "استخدام مراحل المشروع",
  "Use Recurring Tasks": "استخدام المهام المتكررة",
  "Use Milestones": "استخدام المعالم",
  "Display Serial & Lot Number in Delivery Slips": "عرض الرقم التسلسلي والدفعة في قوائم التسليم",
  "Send an automatic reminder email to confirm delivery": "إرسال بريد تذكيري لتأكيد التسليم",
  "Require a signature on your delivery orders": "طلب توقيع على أوامر التسليم",
  "Show Accounting Features - Readonly": "عرض ميزات المحاسبة - للقراءة فقط",
  "Show Inalterability Features": "عرض ميزات عدم القابلية للتغيير",
  "Cash Rounding": "تقريب المبالغ النقدية",

  // Colón-prefixed (HR, Fleet, etc.)
  "Officer: Manage all employees": "إدارة جميع الموظفين",
  "Officer: Manage all applicants": "إدارة جميع المتقدمين",
  "Officer: Manage all vehicles": "إدارة جميع المركبات",
  "Officer: Manage attendances": "إدارة الحضور",
  "Officer: Manage all requests": "إدارة جميع الطلبات",
  "Interviewer": "مقابِل",
  "Team Approver": "معتمد فريق",
  "All Approver": "معتمد الكل",
  "Time Off Responsible": "مسؤول الإجازات",
  "Equipment Manager": "مدير المعدات",

  // Mail / Discuss
  "Mail Template Editor": "محرر قوالب البريد",
  "Canned Response Administrator": "مسؤول الردود الجاهزة",
  "Receive notifications in the system": "استلام الإشعارات",

  // Website
  "Restricted Editor": "محرر مقيد",
  "Editor and Designer": "محرر ومصمم",
  "Multi-website": "مواقع متعددة",

  // Warning toggles
  "A warning can be set on a partner (Stock)": "يمكن تعيين تحذير على شريك (المخزون)",
  "A warning can be set on a product or a customer (Sale)": "يمكن تعيين تحذير على منتج أو عميل (المبيعات)",
  "A warning can be set on a product or a customer (Purchase)": "يمكن تعيين تحذير على منتج أو عميل (المشتريات)",
  "A warning can be set on a partner (Account)": "يمكن تعيين تحذير على شريك (المحاسبة)",

  // Combined "Category / Name" (used when category is available)
  "Sales / User": "المبيعات / مستخدم",
  "Sales / Administrator": "المبيعات / مدير",
  "Sales / User: Own Documents Only": "المبيعات / مستنداتي فقط",
  "Sales / User: All Documents": "المبيعات / جميع المستندات",
  "Sales / Discount on lines": "المبيعات / الخصم على البنود",
  "Sales / Pro-forma Invoices": "المبيعات / الفواتير الأولية",
  "Sales / Quotation Templates": "المبيعات / قوالب عروض الأسعار",
  "CRM / User": "إدارة العملاء / مستخدم",
  "CRM / Administrator": "إدارة العملاء / مدير",
  "CRM / Show Lead Menu": "إدارة العملاء / إظهار قائمة الفرص",
  "Accounting / Invoicing": "المحاسبة / الفوترة",
  "Accounting / Basic": "المحاسبة / أساسي",
  "Accounting / Show Full Accounting Features": "المحاسبة / جميع ميزات المحاسبة",
  "Accounting / Administrator": "المحاسبة / مدير",
  "Accounting / Delivery Address": "المحاسبة / عنوان التسليم",
  "Inventory / User": "المخزون / مستخدم",
  "Inventory / Administrator": "المخزون / مدير",
  "Inventory / Manage Multiple Stock Locations": "المخزون / إدارة مواقع مخزون متعددة",
  "Inventory / Manage Multiple Warehouses": "المخزون / إدارة مستودعات متعددة",
  "Inventory / Manage Lots / Serial Numbers": "المخزون / إدارة الدفعات / الأرقام التسلسلية",
  "Inventory / Manage Packages": "المخزون / إدارة الطرود",
  "Inventory / Manage Push and Pull inventory flows": "المخزون / إدارة تدفقات المخزون",
  "Purchase / User": "المشتريات / مستخدم",
  "Purchase / Administrator": "المشتريات / مدير",
  "Manufacturing / User": "التصنيع / مستخدم",
  "Manufacturing / Administrator": "التصنيع / مدير",
  "Manufacturing / Manage Work Order Operations": "التصنيع / إدارة عمليات أمر العمل",
  "Project / User": "المشاريع / مستخدم",
  "Project / Administrator": "المشاريع / مدير",
  "Project / Use Stages on Project": "المشاريع / استخدام مراحل المشروع",
  "Project / Use Recurring Tasks": "المشاريع / استخدام المهام المتكررة",
  "Project / Use Milestones": "المشاريع / استخدام المعالم",
  "Point of Sale / User": "نقطة البيع / مستخدم",
  "Point of Sale / Administrator": "نقطة البيع / مدير",
  "Human Resources / Officer": "الموارد البشرية / مسؤول",
  "Human Resources / Administrator": "الموارد البشرية / مدير",
  "Human Resources / Employee": "الموارد البشرية / موظف",
  "Recruitment / Officer": "التوظيف / مسؤول",
  "Recruitment / Administrator": "التوظيف / مدير",
  "Expenses / Team Approver": "المصروفات / معتمد فريق",
  "Expenses / All Approver": "المصروفات / معتمد الكل",
  "Expenses / Administrator": "المصروفات / مدير",
  "Time Off / Officer": "الإجازات / مسؤول",
  "Time Off / Administrator": "الإجازات / مدير",
  "Attendances / Officer": "الحضور / مسؤول",
  "Attendances / Administrator": "الحضور / مدير",
  "Timesheets / User: own timesheets only": "ساعات العمل / ساعاتي فقط",
  "Timesheets / User: all timesheets": "ساعات العمل / جميع الساعات",
  "Timesheets / Administrator": "ساعات العمل / مدير",
  "Fleet / Officer": "الأسطول / مسؤول",
  "Fleet / Administrator": "الأسطول / مدير",
  "Discuss / User": "النقاش / مستخدم",
  "Discuss / Administrator": "النقاش / مدير",
  "Website / Restricted Editor": "الموقع / محرر مقيد",
  "Website / Editor and Designer": "الموقع / محرر ومصمم",
  "Website / Multi-website": "الموقع / مواقع متعددة",
  "eCommerce / User": "التجارة الإلكترونية / مستخدم",
  "eCommerce / Administrator": "التجارة الإلكترونية / مدير",
  "Events / User": "الفعاليات / مستخدم",
  "Events / Administrator": "الفعاليات / مدير",
  "Surveys / User": "الاستبيانات / مستخدم",
  "Surveys / Administrator": "الاستبيانات / مدير",
  "eLearning / Officer": "التعلم الإلكتروني / مسؤول",
  "eLearning / Manager": "التعلم الإلكتروني / مدير",
  "Products / Basic Pricelists": "المنتجات / قوائم أسعار أساسية",
  "Products / Manage Product Variants": "المنتجات / إدارة المتغيرات",
  "Products / Manage Product Packaging": "المنتجات / إدارة التعبئة والتغليف",
  "Contacts / User": "جهات الاتصال / مستخدم",
  "Contacts / Administrator": "جهات الاتصال / مدير",
  "Maintenance / Equipment Manager": "الصيانة / مدير المعدات",
  "Lunch / User": "الغداء / مستخدم",
  "Lunch / Administrator": "الغداء / مدير",
  "Stock / User": "المخزون / مستخدم",
  "Stock / Administrator": "المخزون / مدير",
};

const appNameMap: Record<string, string> = {
  "Sales": "المبيعات",
  "CRM": "إدارة العملاء",
  "Accounting": "المحاسبة",
  "Inventory": "المخزون",
  "Purchase": "المشتريات",
  "Manufacturing": "التصنيع",
  "MRP": "التصنيع",
  "Project": "المشاريع",
  "Point of Sale": "نقطة البيع",
  "Human Resources": "الموارد البشرية",
  "HR": "الموارد البشرية",
  "Recruitment": "التوظيف",
  "Expenses": "المصروفات",
  "Time Off": "الإجازات",
  "Leaves": "الإجازات",
  "Attendances": "الحضور",
  "Timesheets": "ساعات العمل",
  "Fleet": "الأسطول",
  "Discuss": "النقاش",
  "Mail": "البريد",
  "Website": "الموقع الإلكتروني",
  "eCommerce": "التجارة الإلكترونية",
  "Events": "الفعاليات",
  "Surveys": "الاستبيانات",
  "eLearning": "التعلم الإلكتروني",
  "Products": "المنتجات",
  "Contacts": "جهات الاتصال",
  "Maintenance": "الصيانة",
  "Lunch": "الغداء",
  "Stock": "المخزون",
  "Account": "المحاسبة",
  "Sale": "المبيعات",
};

export const translateGroup = (name: string, category?: string): string => {
  if (category) {
    const combined = `${category} / ${name}`;
    if (groupTranslations[combined]) {
      return groupTranslations[combined];
    }
  }

  if (groupTranslations[name]) {
    return groupTranslations[name];
  }

  const slashIndex = name.indexOf(" / ");
  if (slashIndex !== -1) {
    const app = name.slice(0, slashIndex);
    const role = name.slice(slashIndex + 3);
    const translatedApp = appNameMap[app] || app;
    return `${translatedApp} / ${role}`;
  }

  const colonIndex = name.indexOf(": ");
  if (colonIndex !== -1) {
    const role = name.slice(colonIndex + 2);
    if (groupTranslations[role]) {
      return groupTranslations[role];
    }
    return role;
  }

  return name;
};
