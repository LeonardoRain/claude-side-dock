// The language the panels speak, resolved once per session by savvy (agentsLanguage, then Claude Code's
// setting, then the locale) and read by the other modules when they draw.
export type Lang = 'en' | 'zh'

let current: Lang = 'en'

export const setLang = (lang: Lang): void => {
  current = lang
}

export const getLang = (): Lang => current
