import { defineStore } from "pinia";

export const AVAILABLE_DBS = ["eldokanh_one", "eldokanh_two"] as const;
export type OdooDb = (typeof AVAILABLE_DBS)[number];

export const useDbStore = defineStore("db", () => {
  const selectedDb = useCookie<string>("odoo_db", {
    default: () => "eldokanh_two",
    maxAge: 60 * 60 * 24 * 365,
  });

  function setDb(name: string) {
    if (!AVAILABLE_DBS.includes(name as OdooDb)) return;
    selectedDb.value = name;
  }

  return {
    selectedDb,
    setDb,
  };
});
