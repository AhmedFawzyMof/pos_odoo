import { ref } from "vue"

const THEME_KEY = "easyweb-color-theme"

export type ThemeName = "default" | "blue" | "green" | "purple" | "gold" | "red" | "teal" | "pink"

export interface ThemeOption {
  key: ThemeName
  label: string
  color: string
}

export const themeOptions: ThemeOption[] = [
  { key: "default", label: "أسود", color: "#1a1a1a" },
  { key: "blue", label: "أزرق", color: "#2563eb" },
  { key: "green", label: "أخضر", color: "#16a34a" },
  { key: "purple", label: "بنفسجي", color: "#9333ea" },
  { key: "gold", label: "ذهبي", color: "#ca8a04" },
  { key: "red", label: "أحمر", color: "#dc2626" },
  { key: "teal", label: "سماوي", color: "#0d9488" },
  { key: "pink", label: "وردي", color: "#db2777" },
]

const currentTheme = ref<ThemeName>("default")

export function useColorTheme() {
  const applyTheme = (theme: ThemeName) => {
    const html = document.documentElement
    html.classList.remove("theme-blue", "theme-green", "theme-purple", "theme-gold", "theme-red", "theme-teal", "theme-pink")
    if (theme !== "default") html.classList.add(`theme-${theme}`)
    currentTheme.value = theme
    localStorage.setItem(THEME_KEY, theme)
  }

  const initTheme = () => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeName | null
    if (saved && saved !== "default") {
      document.documentElement.classList.add(`theme-${saved}`)
      currentTheme.value = saved
    }
  }

  return { currentTheme, applyTheme, initTheme }
}
