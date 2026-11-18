// @ts-nocheck — adapted from claude-deck (nvr0x5, MIT; see LICENSE.claude-deck).
// The Pixel plan bar above the prompt: its hooks collect what Claude is working on, and
// `deckBand` draws it. Desktop only.
import type { EngineInterface } from 'claude-code'

import { pixel, stripsHeight, stripsSvg } from './pixel'
import {
  activityOpen,
  actionOf,
  adoptRunningAgents,
  agents,
  applyTaskResult,
  barState,
  bars,
  clearActivityAgentsDone,
  clearFinished,
  collectRows,
  finishActivity,
  finishAgent,
  flags,
  inFlight,
  liveBar,
  newBar,
  parsePlan,
  placeBar,
  reset,
  startActivity,
  stripTool,
  syncAgentsBar,
  syncTasksBar,
  tasks,
  upsertTodos,
  waiting,
} from './state'
import { STYLE, tierColor, trunc, shortModel } from './theme'

const TRACK_H = 22
const RIGHT_W = 76
const PAD = 3
const ASK_DELAY_MS = 600
const MAX_ROWS = 4
const TICK_MS = 250

const lastHead = new Map<string, number>()
const lastStrip = new Map<string, { tool: string; color: string }>()

// biome-ignore lint: the engine's own hook shapes are wide.
type Any = any

// The words the person typed: tagged blocks (system reminders, pasted content) removed.
function cleanPrompt(text: string): string {
  return String(text)
    .replace(/<([a-z][\w-]*)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const slug = (s: string): string => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'plan'

// ---------- hooks ----------

export async function deck_session_start($: EngineInterface, e: Any, next: Any): Promise<Any> {
  let shown = ''
  $.clock.every(TICK_MS, async () => {
    const now = Date.now()
    const rows = collectRows(now)
    // Redraw while something moves or ticks, and once more when a row appears or goes.
    const signature = rows.map(r => r.id + r.state).join('|')
    const moving = rows.some(r => r.animating || r.strips)
    if (moving || signature !== shown) $.ui.invalidate('ui.render')
    shown = signature
    if (agents.size > 0 && [...agents.values()].some(a => a.state === 'running' || a.state === 'waiting')) {
      try {
        for (const info of await $.agent.list()) {
          const a = agents.get(info.id)
          if (!a || a.state === 'done' || a.state === 'error') continue
          if (info.status === 'completed') finishAgent(a.id, 'done', 'Done')
          else if (info.status === 'failed' || info.status === 'killed') finishAgent(a.id, 'error', info.status === 'killed' ? 'Stopped' : 'Failed')
        }
      } catch {}
    }
  })
  return next(e)
}

export async function deck_session_end($: EngineInterface, e: Any, next: Any): Promise<Any> {
  if (e.reason === 'clear') {
    reset()
    lastHead.clear()
    lastStrip.clear()
  }
  return next(e)
}

export async function deck_prompt_submit($: EngineInterface, e: Any, next: Any): Promise<Any> {
  if (e.text && !e.text.startsWith('/')) {
    flags.lastPrompt = trunc(cleanPrompt(e.text), 40) || flags.lastPrompt
    flags.askedUser = false
    clearFinished()
    for (const bar of bars.values()) if (bar.explicit === 'needs_input') bar.explicit = null
  }
  return next(e)
}

export async function deck_turn_start($: EngineInterface, e: Any, next: Any): Promise<Any> {
  if (!String(e.text ?? '').startsWith('/') && !e.agentId) {
    adoptRunningAgents()
    for (const a of [...agents.values()]) if (a.home === 'activity') agents.delete(a.id)
    startActivity()
  }
  return next(e)
}

export async function deck_turn_complete($: EngineInterface, e: Any, next: Any): Promise<Any> {
  if (e.agentId && agents.has(e.agentId)) {
    const failed = e.reason !== 'answer'
    finishAgent(e.agentId, failed ? 'error' : 'done', e.reason === 'aborted' ? 'Stopped' : failed ? 'Failed' : 'Done')
    $.ui.invalidate('ui.render')
  }
  if (!e.agentId) finishActivity()
  return next(e)
}

export async function deck_tool_check($: EngineInterface, e: Any, next: Any): Promise<Any> {
  const verdict = await next(e)
  const useId = e.tool_use_id
  if (verdict && verdict.decision === 'ask') {
    const key = e.agentId ?? (useId ? inFlight.get(useId) : null) ?? 'main'
    $.clock.after(ASK_DELAY_MS, () => {
      if (useId && !inFlight.has(useId)) return
      waiting.add(key)
      const a = agents.get(key)
      if (a && a.state === 'running') a.state = 'waiting'
      if (key === 'main') {
        const bar = liveBar()
        if (bar) bar.explicit = 'needs_input'
      }
      $.ui.invalidate('ui.render')
    })
  }
  return verdict
}

export async function deck_tool_call($: EngineInterface, e: Any, next: Any): Promise<Any> {
  const key = e.agentId ?? 'main'
  const a = e.agentId ? agents.get(e.agentId) : null
  if (a) {
    if (a.state === 'waiting') a.state = 'running'
    a.tool = String(e.tool).replace(/^mcp__.+?__/, '')
  }
  const act = !e.agentId ? activityOpen() : null
  if (act) {
    act.tools++
    act.action = actionOf(e)
  }
  if (e.tool === 'TodoWrite' && Array.isArray(e.todos)) upsertTodos(key, e.todos)
  if (e.tool === 'AskUserQuestion') {
    waiting.add(key)
    const bar = key === 'main' ? liveBar() : null
    if (bar) bar.explicit = 'needs_input'
    if (a) a.state = 'waiting'
  }
  $.ui.invalidate('ui.render')

  if (e.tool_use_id) inFlight.set(e.tool_use_id, key)
  let ran
  try {
    ran = await next(e)
  } finally {
    if (e.tool_use_id) inFlight.delete(e.tool_use_id)
    if (waiting.delete(key)) {
      if (a && a.state === 'waiting') a.state = 'running'
      if (key === 'main' && !flags.askedUser) for (const bar of bars.values()) if (bar.explicit === 'needs_input') bar.explicit = null
      $.ui.invalidate('ui.render')
    }
  }

  const ok = ran && ran.deny === undefined && ran.isError !== true
  if (ok && !e.agentId && (e.tool === 'TaskCreate' || e.tool === 'TaskUpdate' || e.tool === 'TaskList')) {
    applyTaskResult(e, ran.result)
    $.ui.invalidate('ui.render')
  }
  if (e.tool === 'ExitPlanMode' && ok) {
    const text = typeof e.plan === 'string' ? e.plan : ran.result?.plan
    const parsed = typeof text === 'string' ? parsePlan(text) : null
    if (parsed) {
      placeBar(newBar('plan-' + slug(parsed.title), parsed.title, 'plan', parsed.stages))
      $.ui.invalidate('ui.render')
    }
  }
  return ran
}

export async function deck_agent_spawn($: EngineInterface, e: Any, next: Any): Promise<Any> {
  const started = await next(e)
  if (!started || !started.agentId) return started
  const id = started.agentId
  const parent = e.parentAgentId ? agents.get(e.parentAgentId) : null
  let home = parent?.home ?? liveBar()?.id
  const act = activityOpen()
  if (!home && act) {
    home = 'activity'
    if (act.agentsDoneAt) clearActivityAgentsDone()
  }
  if (!home) {
    if (!bars.has('agents') || barState(bars.get('agents')) === 'done') {
      for (const a of [...agents.values()]) if (a.home === 'agents') agents.delete(a.id)
      placeBar(newBar('agents', 'Agents', 'agents', []))
    }
    home = 'agents'
  }
  const bar = bars.get(home)
  if (bar && bar.agentsDoneAt) {
    for (const a of [...agents.values()]) if (a.home === home && a.state === 'done') agents.delete(a.id)
    bar.agentsDoneAt = null
  }
  agents.set(id, {
    id,
    title: trunc(e.description || e.subagentType, 60),
    state: 'running',
    tool: 'Starting',
    model: started.model ? shortModel(started.model) : '',
    startedAt: Date.now(),
    endedAt: null,
    depth: parent ? 1 : 0,
    home,
    todo: null,
  })
  syncAgentsBar()
  $.ui.invalidate('ui.render')
  return started
}

export async function deck_classic_SubagentStop($: EngineInterface, e: Any, next: Any): Promise<Any> {
  if (agents.has(e.agent_id)) {
    finishAgent(e.agent_id, 'done', 'Done')
    $.ui.invalidate('ui.render')
  }
  return next(e)
}

export async function deck_classic_TaskCreated($: EngineInterface, e: Any, next: Any): Promise<Any> {
  if (!tasks.has(String(e.task_id))) tasks.set(String(e.task_id), { subject: trunc(e.task_subject, 80), status: 'pending' })
  syncTasksBar()
  $.ui.invalidate('ui.render')
  return next(e)
}

export async function deck_classic_TaskCompleted($: EngineInterface, e: Any, next: Any): Promise<Any> {
  const t = tasks.get(String(e.task_id))
  if (t) t.status = 'completed'
  syncTasksBar()
  $.ui.invalidate('ui.render')
  return next(e)
}

/** A reply that ends in a question leaves the live bar waiting on the person. */
export async function deck_classic_Stop($: EngineInterface, e: Any, next: Any): Promise<Any> {
  const result = await next(e)
  if (/\?\s*$/.test(e.last_assistant_message ?? '')) {
    const bar = liveBar()
    if (bar) {
      bar.explicit = 'needs_input'
      flags.askedUser = true
      $.ui.invalidate('ui.render')
    }
  }
  return result
}

// ---------- drawing ----------

function rowSvg(row: Any, W: number, nowMs: number): { source: string; width: number; height: number } {
  const stripsH = row.strips ? 5 + stripsHeight(row.strips) : 0
  const height = TRACK_H + stripsH + PAD * 2
  const total = W + RIGHT_W
  const track = pixel(row, W, nowMs, lastHead)
  const strips = row.strips
    ? `<g transform="translate(0 ${TRACK_H + 5})">${stripsSvg(row.strips, W, nowMs, stripTool, (m: string) => tierColor(m), lastStrip)}</g>`
    : ''
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${height}" viewBox="0 ${-PAD} ${total} ${height}">` +
    track +
    `<text x="${total - 4}" y="${TRACK_H / 2 + 4.2}" text-anchor="end" style="font:400 12px 'Anthropic Sans',ui-sans-serif,system-ui,sans-serif;fill:#9a9893;font-variant-numeric:tabular-nums">${String(row.right).replace(/[&<>]/g, '')}</text>` +
    strips +
    '</svg>'
  return { source, width: total, height }
}

/** The Pixel rows to draw in a band `fullW` px wide: one `{ source, width, height, alt }` each. */
export function deckBand(fullW: number, nowMs: number): { key: string; source: string; width: number; height: number; alt: string }[] {
  const W = Math.max(120, fullW - RIGHT_W)
  const rows = collectRows(nowMs).slice(-MAX_ROWS)
  for (const row of rows) if (!(row.style in STYLE)) row.style = 'run'
  if (!rows.length) {
    lastHead.clear()
    return []
  }
  // A bar that has gone forgets where its head was.
  const ids = new Set(rows.map(r => r.id))
  for (const id of [...lastHead.keys()]) if (!ids.has(id)) lastHead.delete(id)
  return rows.map(row => ({
    key: row.id,
    ...rowSvg(row, W, nowMs),
    alt: `${row.title}: ${row.name}${row.count ? ' ' + row.count : ''}, ${row.right}`,
  }))
}
