import { defineEventHandler } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { getDb } from "~~/server/db";

const locationTranslations: Record<string, string> = {
  "WH": "المستودع",
  "WH/Stock": "المستودع/المخزون",
  "Scrap": "الخردة",
  "Physical Locations": "المواقع الفعلية",
  "Inventory adjustment": "تسوية المخزون",
  "Production": "الإنتاج",
  "Partners": "الشركاء",
  "Partners/Vendors": "الشركاء / الموردين",
  "Partners/Customers": "الشركاء / العملاء",
  "Virtual Locations": "المواقع الافتراضية",
  "Inter-company transit": "النقل بين الشركات",
  "Inventory Loss": "فقدان المخزون",
  "Valuation Adjustment": "تسوية التقييم",
};

const PREFIX_TRANSLATIONS: [string, string][] = [
  ["WH/Stock/", "المستودع/المخزون/"],
  ["Partners/", "الشركاء/"],
];

function translateName(name: string): string | null {
  if (locationTranslations[name]) return locationTranslations[name];
  for (const [prefix, arabicPrefix] of PREFIX_TRANSLATIONS) {
    if (name.startsWith(prefix)) {
      const suffix = name.slice(prefix.length);
      if (suffix) return `${arabicPrefix}${suffix}`;
      return arabicPrefix;
    }
  }
  return null;
}

export default defineEventHandler(async (event) => {
  try {
    const db = getDb();

    const odoo = await getAdminOdooClient();

    const [err, rawLocations] = await tryCatch(
      odoo.execute_kw("stock.location", "search_read", [
        [],
        { fields: ["id", "name", "usage"] },
      ]),
    );

    if (err) {
      throw createError({
        statusCode: 500,
        message: `فشل في جلب المواقع: ${err.message}`,
      });
    }

    const locations = rawLocations as any[];
    let translatedCount = 0;

    const alreadyTranslated = new Set(
      (
        db
          .prepare("SELECT location_id FROM location_translations")
          .all() as { location_id: number }[]
      ).map((r) => r.location_id),
    );

    const insertTranslation = db.prepare(
      "INSERT OR REPLACE INTO location_translations (location_id, odoo_name, arabic_name) VALUES (?, ?, ?)",
    );

    for (const loc of locations) {
      if (alreadyTranslated.has(loc.id)) continue;

      const arabicName = translateName(loc.name);
      if (!arabicName) continue;

      const [updateErr] = await tryCatch(
        odoo.execute_kw("stock.location", "write", [[[loc.id], { name: arabicName }]]),
      );

      if (updateErr) {
        console.warn(`Failed to translate location "${loc.name}" (id=${loc.id}): ${updateErr.message}`);
        continue;
      }

      insertTranslation.run(loc.id, loc.name, arabicName);
      translatedCount++;
    }

    return {
      translated: translatedCount,
      message:
        translatedCount > 0
          ? `تم ترجمة ${translatedCount} موقع`
          : "جميع المواقع مترجمة بالفعل",
    };
  } catch (e: any) {
    console.error("translate-locations error:", e);
    throw createError({
      statusCode: 500,
      message: e.message || "فشل ترجمة المواقع",
    });
  }
});
