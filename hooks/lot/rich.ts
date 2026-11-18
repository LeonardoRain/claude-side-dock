// The desktop map's flat look, in the Session panel's own language: its card ground and greys, its system font, its
// muted solid colors, a color per station, nodes as solid chips that fill in while they work, and round-capped bars.
// Only a surface that draws the SVG itself asks for it; the terminal's reader knows a smaller SVG and keeps the plain map.
// It says nothing the plain map does not: it only paints the same things another way. Nothing here touches the engine.
import type { StationId } from '../../types'
import type { Palette } from './palette'
import type { Setup } from './setup'

/** A station's color at rest and while it works. */
export type Pair = readonly [main: string, hot: string]

/** The system font the Session panel's cards are set in. */
export const FLAT_FONT = `font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"`

/** The level colors of the Session panel's bars: under 70 %, from 70 % and from 90 %. */
const LEVEL = { low: '#8f8cf4', mid: '#D9A23A' } as const

// The Session panel's greys, dark and light, written into the palette's places. `band` is the rings' fill.
type Neutrals = Pick<Palette, 'ground' | 'raised' | 'line' | 'spoke' | 'bone' | 'ash' | 'dim' | 'trail'> & { band: string }
const NEUTRAL_DARK: Neutrals = {
  ground: '#262625', raised: '#2c2c2b', line: '#3a3a37', spoke: '#333331',
  bone: '#ececec', ash: '#a8a8a4', dim: '#7d7d79', trail: '#8a8a86', band: '#2a2a29',
}
const NEUTRAL_LIGHT: Neutrals = {
  ground: '#f4f3f0', raised: '#ecebe8', line: '#dcdad5', spoke: '#e4e4e1',
  bone: '#1f1f1f', ash: '#6b6b68', dim: '#9a9a96', trail: '#a5a4a0', band: '#efeeea',
}

// The Session panel's palette, stretched to ten: around the ring no two neighbours share a family, and none is the alarm's red.
const HUES: Record<StationId, string> = {
  you: '#378ADD',
  model: '#8f8cf4',
  memory: '#1D9E75',
  files: '#BA7517',
  shell: '#6aa84f',
  web: '#2BA3B8',
  browser: '#5B6EE1',
  agents: '#C75AA8',
  skills: '#C9932B',
  hooks: '#D85A30',
}
const RED = '#D0453F'

const hex = (v: string): [number, number, number] => [1, 3, 5].map(k => Number.parseInt(v.slice(k, k + 2), 16)) as [number, number, number]
/** `a` moved a share `t` of the way toward `b`. */
function mix(a: string, b: string, t: number): string {
  const [x, y] = [hex(a), hex(b)]
  return `#${x.map((v, k) => Math.round(v + ((y[k] ?? 0) - v) * t).toString(16).padStart(2, '0')).join('')}`
}

type Shade = { hot: string; tint: string }
/** A hue's working shade (lighter on dark, deeper on light) and its chip at rest (the hue sunk into the card). */
function shadeOf(hue: string, isLight: boolean): Shade {
  return isLight
    ? { hot: mix(hue, '#000000', 0.22), tint: mix(hue, NEUTRAL_LIGHT.ground, 0.84) }
    : { hot: mix(hue, '#ffffff', 0.34), tint: mix(hue, NEUTRAL_DARK.ground, 0.8) }
}

export type Look = {
  /** The palette the map is drawn in: the Session panel's greys and colors, under whatever the person set. */
  c: Palette
  /** A station's two colors. With an accent the person set, every station but memory wears it, as on the plain map. */
  hue: (id: StationId) => Pair
  /** A station's chip at rest. */
  tint: (id: StationId) => string
  band: string
  /** What a glyph is drawn in on a filled chip. */
  onFill: string
  /** The context bar's color at a fill. */
  level: (full: number) => string
  /** In `auto`, the rules that repaint all of it where the surface is light; otherwise nothing. */
  head: string
}

export function lookFor(setup: Setup): Look {
  const isLight = setup.theme === 'light'
  const own = setup.colors
  const n = isLight ? NEUTRAL_LIGHT : NEUTRAL_DARK
  const { band, ...grey } = n
  const shade = (id: StationId): Shade => shadeOf(HUES[id], isLight)
  const accent = shadeOf(LEVEL.low, isLight)
  const memory = shade('memory')
  const c: Palette = {
    ...grey,
    accent: LEVEL.low,
    hot: accent.hot,
    red: RED,
    mem: HUES.memory,
    memHot: memory.hot,
    ...own,
  }
  const ownAccent = own.accent !== undefined || own.hot !== undefined
  const hue = (id: StationId): Pair =>
    id === 'memory' ? [c.mem, c.memHot] : ownAccent ? [c.accent, c.hot] : [HUES[id], shade(id).hot]
  const tint = (id: StationId): string => {
    const [main] = hue(id)
    return main === HUES[id] ? shade(id).tint : mix(main, c.ground, isLight ? 0.84 : 0.8)
  }
  return {
    c,
    hue,
    tint,
    band,
    onFill: '#ffffff',
    level: full => (full >= 90 ? c.red : full >= 70 ? LEVEL.mid : c.accent),
    head: setup.theme === 'auto' ? lightRules(own) : '',
  }
}

/**
 * For `auto`: the map is drawn dark, and these rules repaint each of its colors where the surface around it is light.
 * Every color is a plain attribute, so a rule per color reaches all of it. A color the person set stays as it is.
 */
function lightRules(own: Partial<Palette>): string {
  const mine = new Set(Object.values(own))
  const pairs: [string, string][] = []
  for (const k of Object.keys(NEUTRAL_DARK) as (keyof Neutrals)[]) pairs.push([NEUTRAL_DARK[k], NEUTRAL_LIGHT[k]])
  for (const hue of [...Object.values(HUES), LEVEL.low]) {
    const [d, l] = [shadeOf(hue, false), shadeOf(hue, true)]
    pairs.push([d.hot, l.hot], [d.tint, l.tint])
  }
  const rules = pairs
    .filter(([d]) => !mine.has(d))
    .map(([d, l]) => `[fill="${d}"]{fill:${l}}[stroke="${d}"]{stroke:${l}}`)
    .join('')
  return `<style>@media (prefers-color-scheme: light){${rules}}</style>`
}

const n1 = (v: number): string => (Math.round(v * 10) / 10).toString()
const clock = (ms: number): string => `${(ms / 1000).toFixed(3)}s`

const SWEEP_MS = 6000
/** The rings, outermost first: flat bands of the card's own greys, as the Session panel's tracks are. */
const RINGS: [number, number][] = [[142, 132], [104, 97], [66, 62]]

/** The point at `deg` clockwise from straight up, on a circle of radius `r` around the origin. */
const polar = (deg: number, r: number): string => {
  const a = (deg * Math.PI) / 180
  return `${n1(r * Math.sin(a))} ${n1(-r * Math.cos(a))}`
}

/**
 * Under the stations: the rings as flat bands, and a soft wedge of the accent that turns slowly over them, solid and
 * unlit, thickening toward its leading edge. Standing still, only the bands.
 */
export function backdrop(cx: number, cy: number, now: number, isStill: boolean, look: Look): string {
  let out = RINGS.map(([rx, ry], k) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${k % 2 === 0 ? look.band : look.c.ground}"/>`).join('')
  if (isStill) return out
  const [rx, ry] = RINGS[0] ?? [142, 132]
  const span = 56
  const slices = 10
  let wedge = ''
  for (let k = 1; k <= slices; k++) {
    const a0 = -(span * k * k) / (slices * slices)
    wedge += `<path d="M0 0L${polar(a0, rx)}A${rx} ${rx} 0 0 1 ${polar(0, rx)}Z" fill="${look.c.accent}" opacity=".022"/>`
  }
  out +=
    `<g transform="translate(${cx} ${cy}) scale(1 ${(Math.round((ry / rx) * 1000) / 1000).toString()})"><g>` +
    `<animateTransform attributeName="transform" type="rotate" from="0" to="360" begin="${clock(-(now % SWEEP_MS))}" dur="${clock(SWEEP_MS)}" repeatCount="indefinite"/>` +
    `${wedge}</g></g>`
  return out
}
