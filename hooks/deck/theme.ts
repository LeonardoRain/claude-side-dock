// Colours and small helpers for the Pixel bar, from claude-deck (nvr0x5, MIT). Pure, no `$`.
export const STYLE = {
  run: { desk: '#8B7CF6' },
  ask: { desk: '#E09A1E' },
  hot: { desk: '#E5484D' },
  done: { desk: '#30A46C' },
  ok: { desk: '#30A46C' },
  warn: { desk: '#E09A1E' },
} as const

export const TIER: Record<string, string> = { haiku: '#30A46C', sonnet: '#8B7CF6', opus: '#E09A1E' }
const MUTED = '#9a9893'

export function hash(a: number, b: number, k: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453
  return x - Math.floor(x)
}

export function seedOf(id: string): number {
  let h = 0
  for (const ch of String(id)) h = (Math.imul(h, 31) + (ch.codePointAt(0) ?? 0)) | 0
  return h
}

export function trunc(s: unknown, n: number): string {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, Math.max(1, n - 1)) + '…' : t
}

export function esc(s: unknown): string {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
}

export function textWidth(s: unknown, px = 6.7): number {
  let w = 0
  for (const ch of String(s)) w += /[ilI.,:;'|!]/.test(ch) ? 3.4 : /[mwMW]/.test(ch) ? 9.5 : /[　-鿿]/.test(ch) ? 12 : px
  return w
}

export const hex = (h: string): number[] => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
export const mix = (a: number[], b: number[], m: number): number[] => a.map((v, i) => Math.round(v + ((b[i] ?? 0) - v) * m))
export const rgb = (c: number[]): string => 'rgb(' + c.join(',') + ')'

export function shortModel(id: unknown): string {
  const s = String(id ?? '').toLowerCase()
  for (const name of ['haiku', 'sonnet', 'opus', 'fable']) if (s.includes(name)) return name
  return trunc(id, 14)
}

export const tierColor = (model: string): string => TIER[shortModel(model)] ?? MUTED
