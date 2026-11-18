// @ts-nocheck — drawing code vendored from claude-deck (nvr0x5, MIT; see LICENSE.claude-deck).
// Pixel bar and agent strips for the desktop, as SVG markup. Pure, no `$`.
// The pixel style and the strips adapt plan-progress (zycck/claude-mods, MIT, Kirill Serditov).
import { STYLE, hash, seedOf, esc, textWidth, hex, mix, rgb } from './theme'

const H = 22
const FONT = "'Anthropic Sans',ui-sans-serif,system-ui,-apple-system,sans-serif"
const NARROW = 360

const ICON_PATH = {
  ask: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  hot: 'M18 6 6 18M6 6l12 12',
  done: 'M20 6 9 17l-5-5',
}

// twinkle classes keep their phase across redraws
export function twinkleCss(nowMs, done) {
  const t = nowMs / 1000
  const durs = done ? [3.2, 3.8, 4.4, 3.5] : [2.2, 2.8, 1.9, 3.3]
  const base = [0, 0.7, 1.3, 0.4]
  let css = ''
  durs.forEach((d, i) => {
    css += `.t${i}{animation:tw ${d}s ease-in-out infinite;animation-delay:-${((t + base[i]) % d).toFixed(2)}s}`
  })
  return css + `@keyframes tw{0%,100%{opacity:1}50%{opacity:${done ? 0.8 : 0.45}}}@media (prefers-reduced-motion:reduce){.t0,.t1,.t2,.t3{animation:none}}`
}

export function glideFrom(lastHead, id, fx) {
  const from = lastHead.get(id) ?? fx
  lastHead.set(id, fx)
  return from
}

const EASE = 'calcMode="spline" keyTimes="0;1" keySplines=".2 .8 .2 1"'

function pillMarkup(row, W, fx, from, color, maxShare = 0.55) {
  const icon = ICON_PATH[row.style]
  let knob
  let kw
  if (W < NARROW) {
    kw = H
    knob = `<circle cx="0" cy="${H / 2}" r="${H / 2}" fill="${color}"/>`
  } else {
    const iconW = icon ? 16 : 0
    const countW = row.count ? textWidth(row.count, 6.5) + 6 : 0
    const maxW = Math.max(80, W * maxShare)
    let shown = row.name
    while (shown.length > 3 && 20 + iconW + textWidth(shown) + countW > maxW) shown = shown.slice(0, -1)
    if (shown !== row.name) shown = shown.trimEnd() + '…'
    kw = Math.round(20 + iconW + textWidth(shown) + countW)
    // The tag always covers the bar's head, so no fill shows at its rounded end.
    const ink = '#fff'
    const left = -kw / 2 + 10
    knob = `<rect x="${-kw / 2}" y="0" width="${kw}" height="${H}" rx="${H / 2}" fill="${color}"/>`
    if (icon) knob += `<path d="${icon}" transform="translate(${left} 5) scale(.5)" fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`
    knob += `<text x="${left + iconW}" y="${H / 2 + 4.2}" style="font:500 12px ${FONT};fill:${ink}">${esc(shown)}${row.count ? `<tspan dx="6" style="font-weight:400;fill-opacity:.75">${esc(row.count)}</tspan>` : ''}</text>`
  }
  // Past one tag width the tag's right edge runs half a bar height beyond the head; before that it starts at 0.
  const over = W < NARROW ? 0 : H / 2
  const at = (x) => Math.max(kw / 2, Math.min(W - kw / 2, x >= kw ? x + over - kw / 2 : kw / 2))
  const kx = at(fx)
  const kFrom = at(from)
  const glide = Math.abs(kFrom - kx) > 0.5 ? `<animateTransform attributeName="transform" type="translate" from="${kFrom.toFixed(1)} 0" to="${kx.toFixed(1)} 0" dur=".45s" ${EASE} fill="freeze"/>` : ''
  return `<g transform="translate(${kx.toFixed(1)} 0)">${glide}${knob}</g>`
}

export function pixel(row, W, nowMs, lastHead) {
  const done = row.style === 'done'
  const fx = (Math.max(0, Math.min(100, row.pct)) / 100) * W
  const from = glideFrom(lastHead, row.id, fx)
  const color = STYLE[row.style].desk
  const acc = hex(color)
  const light = mix(acc, [255, 255, 255], 0.32)
  const grey = [132, 130, 138]
  const seed = Math.abs(seedOf(row.id) % 997)
  const buckets = [0, 1, 2, 3, 4].map((b) => {
    const m = b / 4
    const dense = done ? 0.8 : 0.22 + 0.78 * Math.pow(m, 1.5)
    return { color: rgb(done ? light : mix(grey, light, m)), opacity: (0.35 + 0.65 * dense).toFixed(2) }
  })
  let px = ''
  for (let col = 0; col * 3 < fx; col++) {
    const x = col * 3
    const u = Math.min(1, (x + 1.5) / fx)
    const dense = done ? 0.8 : 0.22 + 0.78 * Math.pow(u, 1.5)
    const bucket = done ? 4 : Math.min(4, Math.floor(Math.min(1, Math.pow(u, 0.9) * 1.1) * 4.99))
    for (let r = 0; r < 7; r++) {
      if (hash(col + seed, r, 1) > dense + 0.1) continue
      px += `<rect x="${x}" y="${1 + r * 3}" class="pxd b${bucket} t${Math.floor(hash(col + seed, r, 2) * 4)}"/>`
    }
  }
  let marks = ''
  for (const m of row.marks) {
    const x = m.f * W
    const passed = x < fx - 1
    const h = m.stage ? H : 8
    marks += `<rect x="${(x - (m.stage ? 1 : 0.75)).toFixed(1)}" y="${(H - h) / 2}" width="${m.stage ? 2 : 1.5}" height="${h}" rx=".75" fill="${passed ? rgb(mix(light, [255, 255, 255], 0.45)) : '#8A8984'}" opacity="${passed ? (m.stage ? 0.95 : 0.6) : m.stage ? 0.7 : 0.45}"/>`
  }
  const id = 'p' + seed
  const glideFill = Math.abs(from - fx) > 0.5 ? `<animate attributeName="width" from="${from.toFixed(1)}" to="${fx.toFixed(1)}" dur=".45s" ${EASE} fill="freeze"/>` : ''
  const css = buckets.map((b, i) => `.b${i}{fill:${b.color};fill-opacity:${b.opacity}}`).join('') + '.pxd{width:2px;height:2px}' + twinkleCss(nowMs, done)
  return (
    `<style>${css}</style>` +
    `<defs><clipPath id="${id}a"><rect width="${W}" height="${H}" rx="${H / 2}"/></clipPath><clipPath id="${id}b"><rect width="${fx.toFixed(1)}" height="${H}">${glideFill}</rect></clipPath>` +
    `<linearGradient id="${id}g" x1="0" x2="${Math.max(1, fx).toFixed(1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${rgb(acc)}" stop-opacity="${done ? 0.3 : 0.05}"/><stop offset="1" stop-color="${rgb(acc)}" stop-opacity=".33"/></linearGradient></defs>` +
    `<g clip-path="url(#${id}a)"><rect width="${W}" height="${H}" fill="#808080" fill-opacity=".16"/>` +
    `<g clip-path="url(#${id}b)"><rect width="${fx.toFixed(1)}" height="${H}" fill="url(#${id}g)"/>${px}</g>${marks}</g>` +
    pillMarkup(row, W, fx, from, color)
  )
}

// ---------- agent strips under a bar ----------

export const STRIP_H = 18
export const STRIP_GAP = 3

const AGENT_STYLE = { running: 'run', waiting: 'ask', error: 'hot', done: 'done' }

function elapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's'
}

export function stripsHeight(v) {
  const n = v.shown.length + (v.hidden.length ? 1 : 0)
  return n * STRIP_H + (n - 1) * STRIP_GAP
}

export function stripsSvg(v, W, nowMs, stripTool, tierColor, lastStrip) {
  const narrow = W < NARROW
  let out = ''
  v.shown.forEach((a, i) => {
    const c = STYLE[AGENT_STYLE[a.state]].desk
    const y = i * (STRIP_H + STRIP_GAP)
    const indent = a.depth > 0 ? 12 : 0
    let px = ''
    if (a.state === 'running') {
      for (let col = 0; col * 3 < W; col++) {
        for (let r = 0; r < 4; r++) {
          if (hash(col + i * 41, r, 5) > 0.2) continue
          px += `<rect x="${col * 3}" y="${(y + 3 + r * 3.6).toFixed(1)}" width="2" height="2" class="t${Math.floor(hash(col, r, 6) * 4)}" fill="${c}" fill-opacity=".32"/>`
        }
      }
    }
    const room = narrow ? W - 30 - indent : W * 0.45
    const full = (a.depth > 0 ? '↳ ' : '') + a.title
    let name = full
    while (name.length > 4 && textWidth(name, 6.9) > room) name = name.slice(0, -1)
    if (name !== full) name = name.trimEnd() + '…'
    const nameX = 19 + indent
    const toolX = nameX + textWidth(name, 6.9) + 12
    const tool = stripTool(a)
    const was = lastStrip.get(a.id)
    lastStrip.set(a.id, { tool, color: c })
    const changed = was !== undefined && was.tool !== tool
    const flow = was && was.color !== c ? `<animate attributeName="fill" from="${was.color}" to="${c}" dur=".2s" fill="freeze"/>` : ''
    const time = elapsed((a.endedAt ?? nowMs) - a.startedAt)
    let tag = ''
    if (a.model && !narrow) {
      const tc = tierColor(a.model)
      const tw = textWidth(a.model, 6) + 12
      tag = `<rect x="${W - 52 - tw}" y="${y + 3}" width="${tw}" height="12" rx="3" fill="${tc}" fill-opacity=".25"/><text x="${W - 46 - tw}" y="${y + 12.5}" style="font:500 10.5px ${FONT};fill:${tc}">${esc(a.model)}</text>`
    }
    out +=
      `<rect x="0" y="${y}" width="${W}" height="${STRIP_H}" rx="${STRIP_H / 2}" fill="${c}" fill-opacity=".15">${flow}</rect>${px}` +
      `<circle cx="${10 + indent}" cy="${y + STRIP_H / 2}" r="3" fill="${c}"${a.state === 'running' ? ' class="sd"' : ''}>${flow}</circle>` +
      `<text x="${nameX}" y="${y + 12.5}" class="sn">${esc(name)}</text>` +
      (narrow
        ? ''
        : (changed ? `<text x="${toolX}" y="${y + 12.5}" class="sn mo" style="fill:${was.color}">${esc(was.tool)}</text>` : '') +
          `<text x="${toolX}" y="${y + 12.5}" class="sn${changed ? ' mi' : ''}" style="fill:${c}">${esc(tool)}</text>` +
          tag +
          `<text x="${W - 9}" y="${y + 12.5}" text-anchor="end" class="sn st">${time}</text>`)
  })
  if (v.hidden.length) {
    const y = v.shown.length * (STRIP_H + STRIP_GAP)
    const done = v.hidden.filter((a) => a.state === 'done').length
    out += `<rect x="0" y="${y}" width="${W}" height="${STRIP_H}" rx="${STRIP_H / 2}" fill="#808080" fill-opacity=".14"/><text x="10" y="${y + 12.5}" class="sn st">+${v.hidden.length} more · ${done} done</text>`
  }
  return (
    `<style>.sn{font:400 11.5px ${FONT};fill:#F0EEFC}.st{fill-opacity:.65}` +
    twinkleCss(nowMs, false) +
    '.sd{animation:sp 1.1s ease-in-out infinite}@keyframes sp{50%{opacity:.3}}' +
    '.mi{animation:mi .2s ease-out both}@keyframes mi{from{opacity:0;filter:blur(3px)}}' +
    '.mo{animation:mo .2s ease-in both}@keyframes mo{to{opacity:0;filter:blur(3px)}}' +
    '@media (prefers-reduced-motion:reduce){.sd,.mi,.mo{animation:none}.mo{opacity:0}}</style>' +
    out
  )
}
