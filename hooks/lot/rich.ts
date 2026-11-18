// The desktop map's richer look: a color per station, a radar sweep, a glow, gradients and a turning HUD.
// Only a surface that draws the SVG itself asks for it; the terminal's reader knows a smaller SVG and keeps the plain map.
// Nothing here says anything the plain map does not: it only paints the same things more brightly. Nothing touches the engine.
import type { StationId } from '../../types'
import { DARK, LIGHT } from './palette'
import type { Palette } from './palette'
import type { Setup } from './setup'

/** A station's color at rest and while it works. */
export type Pair = readonly [main: string, hot: string]

type Hues = Record<Exclude<StationId, 'memory'>, Pair>

// Around the ring no two neighbours share a family, and none is the alarm's red.
const HUES_DARK: Hues = {
  you: ['#6aaeff', '#a8cfff'],
  model: ['#a98cff', '#cdbbff'],
  files: ['#f2b766', '#f8d29d'],
  shell: ['#7fdc8a', '#b4ecbb'],
  web: ['#4fd6e8', '#9ae9f3'],
  browser: ['#8b9dff', '#bcc6ff'],
  agents: ['#f087d6', '#f7bde9'],
  skills: ['#ffcf5c', '#ffe39e'],
  hooks: ['#ff9f6b', '#ffc6a6'],
}

const HUES_LIGHT: Hues = {
  you: ['#2f6fc4', '#1d4f94'],
  model: ['#6a4bc9', '#4e339e'],
  files: ['#a8691d', '#7d4c10'],
  shell: ['#2f8a3c', '#1f6a2b'],
  web: ['#16879a', '#0d6676'],
  browser: ['#4a5bc4', '#34419a'],
  agents: ['#b13f96', '#8a2c74'],
  skills: ['#a37b06', '#7a5c03'],
  hooks: ['#c0571c', '#934013'],
}

type Extra = { sweep: string; deep: string; nodeTop: string; nebula: string }
const EXTRA_DARK: Extra = { sweep: '#5ee6ff', deep: '#141d33', nodeTop: '#1d2433', nebula: '#2b2252' }
const EXTRA_LIGHT: Extra = { sweep: '#1b8db0', deep: '#fffefb', nodeTop: '#fbfaf6', nebula: '#ece6ff' }

const n1 = (v: number): string => (Math.round(v * 10) / 10).toString()
const clock = (ms: number): string => `${(ms / 1000).toFixed(3)}s`

export const GLOW = 'filter="url(#ld-glow)"'

export type Look = {
  /** A station's two colors. Memory keeps the palette's own; with an accent the person set, every other station wears it, as on the plain map. */
  hue: (id: StationId) => Pair
  sweep: string
  /** The gradients and the glow, and in `auto` the rules that repaint the new colors on a light surface. */
  head: string
  /** The ground's fill, or undefined where the person set a ground of their own. */
  groundFill: string | undefined
  nodeFill: string
  coreFill: string
}

export function lookFor(setup: Setup, c: Palette, cx: number, cy: number): Look {
  const isLight = setup.theme === 'light'
  const hues = isLight ? HUES_LIGHT : HUES_DARK
  const x = isLight ? EXTRA_LIGHT : EXTRA_DARK
  const own = setup.colors
  const ownAccent = own.accent !== undefined || own.hot !== undefined
  const hue = (id: StationId): Pair =>
    id === 'memory' ? [c.mem, c.memHot] : ownAccent ? [c.accent, c.hot] : hues[id]

  const stops = (list: [number, string, number][]): string =>
    list.map(([at, color, opacity]) => `<stop offset="${at}" stop-color="${color}" stop-opacity="${opacity}"/>`).join('')
  const defs =
    '<defs>' +
    `<filter id="ld-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<radialGradient id="ld-ground" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="300">${stops([[0, x.deep, 1], [0.62, c.ground, 1], [1, c.ground, 1]])}</radialGradient>` +
    `<radialGradient id="ld-node" cx=".38" cy=".3" r=".8">${stops([[0, x.nodeTop, 1], [1, c.raised, 1]])}</radialGradient>` +
    `<radialGradient id="ld-core" cx=".5" cy=".42" r=".65">${stops([[0, x.nebula, 1], [0.75, c.raised, 1], [1, c.raised, 1]])}</radialGradient>` +
    '</defs>'

  return {
    hue,
    sweep: x.sweep,
    head: defs + (setup.theme === 'auto' ? lightRules(own) : ''),
    groundFill: own.ground === undefined ? 'url(#ld-ground)' : undefined,
    nodeFill: own.raised === undefined ? 'url(#ld-node)' : c.raised,
    coreFill: own.raised === undefined ? 'url(#ld-core)' : c.raised,
  }
}

/** For `auto`: the new colors, and the palette's inside gradients, repainted where the surface is light. */
function lightRules(own: Partial<Palette>): string {
  const swap = (d: string, l: string): string => `[fill="${d}"]{fill:${l}}[stroke="${d}"]{stroke:${l}}[stop-color="${d}"]{stop-color:${l}}`
  let rules = ''
  for (const id of Object.keys(HUES_DARK) as (keyof Hues)[]) {
    rules += swap(HUES_DARK[id][0], HUES_LIGHT[id][0]) + swap(HUES_DARK[id][1], HUES_LIGHT[id][1])
  }
  for (const k of Object.keys(EXTRA_DARK) as (keyof Extra)[]) rules += swap(EXTRA_DARK[k], EXTRA_LIGHT[k])
  // The palette's own fills and strokes are the plain map's rules; inside a gradient only a stop names them.
  for (const k of ['ground', 'raised'] as const) {
    if (own[k] === undefined && !Object.values(own).includes(DARK[k])) rules += `[stop-color="${DARK[k]}"]{stop-color:${LIGHT[k]}}`
  }
  return `<style>@media (prefers-color-scheme: light){${rules}}</style>`
}

/** A gradient along a line, for a spoke or a leg of the route. */
export function lineGradient(id: string, a: { x: number; y: number }, b: { x: number; y: number }, from: string, to: string, fromOpacity: number): string {
  return (
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n1(a.x)}" y1="${n1(a.y)}" x2="${n1(b.x)}" y2="${n1(b.y)}">` +
    `<stop offset="0" stop-color="${from}" stop-opacity="${fromOpacity}"/><stop offset="1" stop-color="${to}"/></linearGradient>`
  )
}

const SWEEP_MS = 5200
const SWEEP_R = 150

/** The point at `deg` clockwise from straight up, on a circle of radius `r` around the origin. */
const polar = (deg: number, r: number): string => {
  const a = (deg * Math.PI) / 180
  return `${n1(r * Math.sin(a))} ${n1(-r * Math.cos(a))}`
}

/**
 * The radar under the stations: tick marks on an outer dial, a dashed ring that turns slowly, and a beam that sweeps
 * round with a fading wake. All of it sits in a group pressed to the ring's own ellipse. Standing still, only the dial.
 */
export function radar(cx: number, cy: number, squash: number, now: number, isStill: boolean, c: Palette, sweep: string): string {
  let ticks = ''
  for (let d = 0; d < 360; d += 5) {
    const long = d % 30 === 0
    ticks += `M${polar(d, SWEEP_R + 4)}L${polar(d, SWEEP_R + (long ? 11 : 7))}`
  }
  let out =
    `<g transform="translate(${cx} ${cy}) scale(1 ${(Math.round(squash * 1000) / 1000).toString()})">` +
    `<circle r="${SWEEP_R}" fill="none" stroke="${sweep}" stroke-width=".6" opacity=".18"/>` +
    `<path d="${ticks}" fill="none" stroke="${c.line}" stroke-width="1" stroke-linecap="round" opacity=".9"/>`

  if (!isStill) {
    // The wake: sectors stacked from the beam backwards, each a little longer and as faint, so the light thickens toward
    // the beam the way a screen's phosphor fades, with no seam between them.
    const span = 64
    const slices = 14
    let wake = ''
    for (let k = 1; k <= slices; k++) {
      const a0 = -(span * k * k) / (slices * slices)
      wake += `<path d="M0 0L${polar(a0, SWEEP_R)}A${SWEEP_R} ${SWEEP_R} 0 0 1 ${polar(0, SWEEP_R)}Z" fill="${sweep}" opacity=".022"/>`
    }
    const turning = (ms: number, reverse = false): string =>
      `<animateTransform attributeName="transform" type="rotate" from="${reverse ? 360 : 0}" to="${reverse ? 0 : 360}" begin="${clock(-(now % ms))}" dur="${clock(ms)}" repeatCount="indefinite"/>`
    out +=
      `<g>${turning(SWEEP_MS)}${wake}` +
      `<line x1="0" y1="0" x2="0" y2="${-SWEEP_R}" stroke="${sweep}" stroke-width="1.6" stroke-linecap="round" opacity=".85" ${GLOW}/>` +
      `<circle cx="0" cy="${-SWEEP_R}" r="2.6" fill="${sweep}" ${GLOW}/></g>` +
      `<g>${turning(90_000, true)}<circle r="${SWEEP_R + 15}" fill="none" stroke="${sweep}" stroke-width="1" stroke-dasharray="2 9" stroke-linecap="round" opacity=".35"/></g>`
  }
  return `${out}</g>`
}

/** Two arcs turning opposite ways around the core, in the model's color and the sweep's. Standing still they rest. */
export function reactor(cx: number, cy: number, r: number, now: number, isStill: boolean, inner: string, outer: string, anyRunning: boolean): string {
  const arc = (radius: number, color: string, width: number, dash: string, opacity: string, ms: number, reverse: boolean): string => {
    const spin = isStill
      ? ''
      : `<animateTransform attributeName="transform" type="rotate" from="${reverse ? 360 : 0} ${cx} ${cy}" to="${reverse ? 0 : 360} ${cx} ${cy}" begin="${clock(-(now % ms))}" dur="${clock(ms)}" repeatCount="indefinite"/>`
    return (
      `<g>${spin}<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="${width}" pathLength="100" stroke-dasharray="${dash}" stroke-linecap="round" opacity="${opacity}"/></g>`
    )
  }
  const lively = anyRunning ? 1 : 0.7
  return (
    `<g ${GLOW}>` +
    arc(r + 11, inner, 1.6, '22 3 6 19', n1(0.75 * lively), 14_000, false) +
    arc(r + 15, outer, 1, '3 9', n1(0.55 * lively), 24_000, true) +
    '</g>'
  )
}
