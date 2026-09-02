<script setup lang="ts">
import * as XLSX from "@sheetjs/xlsx";

const props = defineProps<{
  columns: { key: string; label: string; type?: string }[];
  rows: Record<string, any>[];
  title?: string;
}>();

const extractName = (val: any): string => {
  if (val === null || val === undefined) return "-";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.length > 1 ? String(val[1]) : String(val[0] ?? "-");
  if (typeof val === "object") {
    if (val.name) return String(val.name);
    if (val.display_name) return String(val.display_name);
    const keys = Object.keys(val);
    if (keys.length === 1) return String(val[keys[0]]);
    return val.en_US || val.ar_SY || val[keys[0]] || JSON.stringify(val);
  }
  return String(val);
};

const formatValue = (val: any, type?: string): string => {
  if (val === null || val === undefined) return "-";
  if (typeof val === "object") return extractName(val);
  if (type === "number") {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? String(val) : num.toLocaleString("en-US");
  }
  return String(val);
};

const exportToExcel = () => {
  const data = props.rows.map((row) => {
    const obj: Record<string, any> = {};
    props.columns.forEach((col) => {
      obj[col.label] = formatValue(row[col.key], col.type);
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, props.title || "تقرير");
  XLSX.writeFile(wb, `${props.title || "تقرير"}.xlsx`);
};

defineExpose({ exportToExcel });
</script>

<template>
  <div v-if="rows.length > 0" class="bg-white border border-outline-variant rounded-xl overflow-hidden">
    <div class="overflow-x-auto custom-scrollbar">
      <table class="w-full text-right border-collapse">
        <thead class="bg-white">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="p-4 text-label-md font-bold text-on-white-variant whitespace-nowrap"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <tr
            v-for="(row, i) in rows"
            :key="i"
            class="hover:bg-white-low transition-colors"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              class="p-4 text-body-md"
              :class="{ 'font-bold text-left': col.type === 'number' }"
            >
              <span
                v-if="col.key === 'state' && row._state_color"
                class="text-[12px] font-bold px-2 py-0.5 rounded-full"
                :class="row._state_color"
              >
                {{ formatValue(row[col.key], col.type) }}
              </span>
              <span
                v-else-if="col.key === 'type' && row._type_color"
                class="text-[12px] font-bold px-2 py-0.5 rounded-full"
                :class="row._type_color"
              >
                {{ formatValue(row[col.key], col.type) }}
              </span>
              <span v-else>{{ formatValue(row[col.key], col.type) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="rows.length === 0" class="p-8 text-center text-on-white-variant">
      لا توجد بيانات في هذه الفترة
    </div>
  </div>
</template>
