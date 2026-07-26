import { AsyncLocalStorage } from "async_hooks"

export const odooDbStorage = new AsyncLocalStorage<string>()

export function getCurrentOdooDb(): string {
  return odooDbStorage.getStore() || process.env.DEFAULT_DB!
}
