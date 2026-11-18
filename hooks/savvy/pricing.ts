// What a token costs. The engine reports tokens, not money, so every figure the panel shows
// is tokens times a price from here. Prices are per million tokens, in the chosen currency.
//
// Defaults are Anthropic's list prices in USD (checked 2026-11-18 against
// platform.claude.com/docs/en/about-claude/pricing). For CNY the defaults are those prices times
// CNY_PER_USD, a fixed rate that only approximates a gateway's list; set `modelPrices` for real ones.

export type Currency = 'USD' | 'CNY'

/** One price tier. A tier applies to a request whose prompt (input + cache read + cache write) has at least `from` tokens. */
export type Price = { from: number; input: number; output: number; cacheRead: number; cacheWrite: number }

export const SYMBOL: Readonly<Record<Currency, string>> = { USD: '$', CNY: '¥' }

/** The fixed rate used to turn the USD defaults into CNY ones. */
export const CNY_PER_USD = 7

const tier = (input: number, output: number, cacheRead: number, cacheWrite: number, from = 0): Price => ({ from, input, output, cacheRead, cacheWrite })

// Keys are matched as a substring of the model id (lower case, `.` and `_` turned into `-`),
// and the longest matching key wins: `opus-5-5` beats `opus`. Cache writes are the 5-minute kind.
const OFFICIAL_USD: Readonly<Record<string, readonly Price[]>> = {
  'fable-5-2': [tier(8, 40, 0.2, 10)],
  'mythos-5-2': [tier(8, 40, 0.2, 10)],
  'fable-5-1': [tier(10, 50, 0.25, 12.5)],
  'mythos-5-1': [tier(10, 50, 0.25, 12.5)],
  fable: [tier(10, 50, 1, 12.5)],
  mythos: [tier(10, 50, 1, 12.5)],
  'opus-5-5': [tier(4, 20, 0.2, 5)],
  opus: [tier(5, 25, 0.5, 6.25)],
  'sonnet-5-5': [tier(2, 10, 0.1, 2.5)],
  'sonnet-4': [tier(3, 15, 0.3, 3.75)],
  sonnet: [tier(2, 10, 0.2, 2.5)],
  'haiku-5-5': [tier(0.1, 0.5, 0.01, 0.125), tier(0.5, 2.5, 0.05, 0.625, 100_000)],
  haiku: [tier(1, 5, 0.1, 1.25)],
}

export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

export type Pricing = {
  currency: Currency
  symbol: string
  /** The tier a request of `promptTokens` pays. A model no key matches pays the dearest price in the table. */
  priceOf: (model: string, promptTokens: number) => Price
  /** What one request cost, in the currency. */
  costOf: (model: string, usage: Usage) => number
  /** Entries of `modelPrices` that could not be read, as the person wrote them. */
  rejected: readonly string[]
}

const FAMILIES = ['fable', 'opus', 'sonnet', 'haiku'] as const

const list = (v: unknown): string[] =>
  (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []).map(x => String(x).trim()).filter(x => x !== '')

const normalise = (model: string): string => model.toLowerCase().replace(/[._\s]+/g, '-')

const num = (s: string): number | undefined => {
  if (!/^\d+(\.\d+)?$/.test(s.trim())) return undefined
  return Number(s)
}

/**
 * Reads `name[>promptTokens]=input/output[/cacheRead/cacheWrite]`, such as `opus-5-5=4/20/0.2/5` or
 * `haiku-5-5>100000=0.5/2.5/0.05/0.625`. With only input and output, cache reads cost a tenth of
 * input and cache writes 1.25 times it.
 */
function parseEntry(text: string): { key: string; price: Price } | undefined {
  const at = text.indexOf('=')
  if (at <= 0) return undefined
  const left = text.slice(0, at).trim()
  const right = text.slice(at + 1).split('/').map(x => num(x))
  if (right.some(x => x === undefined) || (right.length !== 2 && right.length !== 4)) return undefined
  const [input, output, read, write] = right as number[]
  const gt = left.indexOf('>')
  const name = (gt >= 0 ? left.slice(0, gt) : left).trim()
  const from = gt >= 0 ? num(left.slice(gt + 1)) : 0
  if (!name || from === undefined) return undefined
  return {
    key: normalise(name),
    price: { from, input: input!, output: output!, cacheRead: read ?? input! * 0.1, cacheWrite: write ?? input! * 1.25 },
  }
}

export function makePricing(options: Readonly<Record<string, unknown>> = {}): Pricing {
  const currency: Currency = String(options.currency ?? '').toUpperCase() === 'CNY' ? 'CNY' : 'USD'
  const scale = currency === 'CNY' ? CNY_PER_USD : 1

  const table = new Map<string, Price[]>()
  for (const [key, tiers] of Object.entries(OFFICIAL_USD)) {
    table.set(key, tiers.map(t => ({ ...t, input: t.input * scale, output: t.output * scale, cacheRead: t.cacheRead * scale, cacheWrite: t.cacheWrite * scale })))
  }

  // A key the person names replaces the default's tiers for that key whole.
  const own = new Map<string, Price[]>()
  const rejected: string[] = []
  // One box per family: `input/output[/cacheRead/cacheWrite]`, then `, promptTokens>input/...` for each longer-prompt tier.
  // A filled box replaces every default of that family, so `opus` covers opus-5-5 and opus-4 alike.
  const lines: string[] = []
  for (const family of FAMILIES) {
    const segments = list(options[`price${family[0]!.toUpperCase()}${family.slice(1)}`])
    if (segments.length === 0) continue
    for (const key of [...table.keys()]) if (key.includes(family)) table.delete(key)
    for (const seg of segments) {
      const gt = seg.indexOf('>')
      lines.push(gt >= 0 ? `${family}>${seg.slice(0, gt).trim()}=${seg.slice(gt + 1).trim()}` : `${family}=${seg}`)
    }
  }
  for (const text of [...lines, ...list(options.modelPrices)]) {
    const entry = parseEntry(text)
    if (!entry) rejected.push(text)
    else own.set(entry.key, [...(own.get(entry.key) ?? []), entry.price])
  }
  for (const [key, tiers] of own) table.set(key, tiers)
  for (const tiers of table.values()) tiers.sort((a, b) => a.from - b.from)

  const dearest = [...table.values()].map(t => t[0]!).reduce((a, b) => (b.output > a.output ? b : a))

  const priceOf = (model: string, promptTokens: number): Price => {
    const id = normalise(model)
    let best: Price[] | undefined
    let bestLen = -1
    for (const [key, tiers] of table) {
      if (key.length > bestLen && id.includes(key)) {
        best = tiers
        bestLen = key.length
      }
    }
    if (!best) return dearest
    return [...best].reverse().find(t => promptTokens >= t.from) ?? best[0]!
  }

  const costOf = (model: string, u: Usage): number => {
    const input = u.input_tokens || 0
    const read = u.cache_read_input_tokens || 0
    const write = u.cache_creation_input_tokens || 0
    const p = priceOf(model, input + read + write)
    return (input * p.input + (u.output_tokens || 0) * p.output + read * p.cacheRead + write * p.cacheWrite) / 1e6
  }

  return { currency, symbol: SYMBOL[currency], priceOf, costOf, rejected }
}
