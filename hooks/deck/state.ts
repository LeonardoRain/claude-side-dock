// @ts-nocheck — task collection adapted from claude-deck (nvr0x5, MIT; see LICENSE.claude-deck).
// What Claude is working on, as the Pixel bar shows it: todo lists, task tools, approved plans,
// subagents, and a plain activity row for a turn with none of those. Pure state, no `$`.
import { trunc } from './theme'

export const MAX_BARS = 4
const FOLD_MS = 5000
export const MAX_STRIPS = 4

export const STATE_STYLE = { running: 'run', needs_input: 'ask', error: 'hot', done: 'done' }

// id -> { id, title, source, stages:[{name, steps:[{title, active, status}]}], explicit, startedAt, doneAt, agentsDoneAt, dismissed }
export const bars = new Map()
// agentId -> { id, title, state, tool, model, startedAt, endedAt, depth, home, todo }
export const agents = new Map()
// task tools: id -> { subject, active, status }
export const tasks = new Map()
export const inFlight = new Map()
export const waiting = new Set()
export const flags = { askedUser: false, lastPrompt: '' }
export let activity = null // { title, start, tools, action, done, doneAt, agentsDoneAt }

const isFinished = s => s === 'done' || s === 'skipped'
const todoStatus = s => (s === 'completed' ? 'done' : s === 'in_progress' ? 'active' : 'pending')
const allSteps = bar => bar.stages.flatMap(s => s.steps)

/** A finished row stays up until the person sends the next message; this clears them then. */
export function clearFinished() {
  for (const bar of [...bars.values()]) {
    if (barState(bar) !== 'done') continue
    for (const a of [...agents.values()]) if (a.home === bar.id) agents.delete(a.id)
    bars.delete(bar.id)
  }
  if (activity?.done) {
    for (const a of [...agents.values()]) if (a.home === 'activity' && a.state !== 'running' && a.state !== 'waiting') agents.delete(a.id)
    activity = null
  }
}

export function reset() {
  bars.clear()
  agents.clear()
  tasks.clear()
  activity = null
}

function where(bar) {
  const flat = bar.stages.flatMap((s, i) => s.steps.map((step, j) => ({ i, j, step })))
  const at = flat.findIndex(x => !isFinished(x.step.status))
  const pos = at < 0 ? flat.length : at
  const cur = flat[Math.min(pos, flat.length - 1)]
  const stage = cur?.i ?? 0
  return {
    pos,
    total: flat.length,
    finished: flat.filter(x => isFinished(x.step.status)).length,
    active: flat.find(x => x.step.status === 'active')?.step ?? null,
    stage,
    step: pos >= flat.length ? (bar.stages[stage]?.steps.length ?? 0) : (cur?.j ?? 0) + 1,
    stageSize: bar.stages[stage]?.steps.length ?? 0,
  }
}

export function newBar(id, title, source, stages) {
  return { id, title, source, stages, explicit: null, startedAt: Date.now(), doneAt: null, agentsDoneAt: null, dismissed: false }
}

export const agentsOf = bar => [...agents.values()].filter(a => a.home === bar.id)

export function barState(bar) {
  if (bar.explicit === 'error') return 'error'
  if (bar.id === 'agents') {
    const list = agentsOf(bar)
    if (list.some(a => a.state === 'waiting')) return 'needs_input'
    if (list.length && list.every(a => a.state === 'done' || a.state === 'error')) return list.some(a => a.state === 'error') ? 'error' : 'done'
    return 'running'
  }
  const steps = allSteps(bar)
  if (steps.length && steps.every(s => isFinished(s.status))) return 'done'
  if (bar.explicit === 'needs_input') return 'needs_input'
  if (agentsOf(bar).some(a => a.state === 'waiting')) return 'needs_input'
  return 'running'
}

export const liveBar = () => [...bars.values()].reverse().find(b => b.id !== 'agents' && !b.dismissed && barState(b) !== 'done')

export function placeBar(bar) {
  bars.delete(bar.id)
  bars.set(bar.id, bar)
  while (bars.size > MAX_BARS) {
    const done = [...bars.values()].find(b => barState(b) === 'done')
    bars.delete((done ?? bars.values().next().value).id)
  }
}

export function syncAgentsBar() {
  const bar = bars.get('agents')
  if (!bar) return
  const rank = a => (a.state === 'done' ? 0 : a.state === 'error' ? 1 : 2)
  const list = agentsOf(bar).sort((a, b) => rank(a) - rank(b))
  bar.stages = [{ name: 'Agents', steps: list.map(a => ({ title: a.title, status: a.state === 'done' ? 'done' : a.state === 'error' ? 'error' : 'active' })) }]
}

// a new turn replaces the activity row; its background agents still running move to the Agents bar
export function adoptRunningAgents() {
  const running = [...agents.values()].filter(a => a.home === 'activity' && (a.state === 'running' || a.state === 'waiting'))
  if (!running.length) return
  if (!bars.has('agents') || barState(bars.get('agents')) === 'done') {
    for (const a of [...agents.values()]) if (a.home === 'agents') agents.delete(a.id)
    placeBar(newBar('agents', 'Agents', 'agents', []))
  }
  const bar = bars.get('agents')
  bar.agentsDoneAt = null
  bar.dismissed = false
  for (const a of running) a.home = 'agents'
  syncAgentsBar()
}

export function finishAgent(id, state, tool) {
  const a = agents.get(id)
  if (!a || a.state === 'done' || a.state === 'error') return
  a.state = state
  a.tool = tool
  a.endedAt = Date.now()
  waiting.delete(id)
  syncAgentsBar()
  const bar = a.home === 'activity' ? activity && { id: 'activity', set agentsDoneAt(v) { activity.agentsDoneAt = v } } : bars.get(a.home)
  if (bar && agentsOf(bar).every(x => x.state === 'done' || x.state === 'error')) bar.agentsDoneAt = Date.now()
}

// an approved plan's markdown: headings become stages, top-level list items steps
export function parsePlan(markdown) {
  const clean = s => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/^(\d+[.)]|[-*+]|\[[ xX]\])\s+/, '').trim()
  let title = ''
  const headed = []
  const items = []
  for (const line of String(markdown).split(/\r?\n/)) {
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const text = clean(h[2] ?? '')
      if (h[1] === '#' && !title) title = text
      else headed.push({ name: trunc(text, 60), steps: [] })
      continue
    }
    const li = line.match(/^(\s*)(\d+[.)]|[-*+])\s+(.*)$/)
    if (!li) continue
    const depth = Math.floor(li[1].replace(/\t/g, '  ').length / 2)
    const text = trunc(clean(li[3] ?? ''), 80)
    if (!text) continue
    items.push({ depth, text })
    const stage = headed[headed.length - 1]
    if (stage && depth === 0) stage.steps.push({ title: text, status: 'pending' })
  }
  let stages = headed.filter(s => s.steps.length > 0)
  if (!stages.length && items.length) stages = [{ name: 'Plan', steps: items.filter(i => i.depth === 0).map(i => ({ title: i.text, status: 'pending' })) }]
  stages = stages.filter(s => s.steps.length > 0)
  if (!stages.length) return null
  stages[0].steps[0].status = 'active'
  return { title: trunc(title, 60) || 'Plan', stages }
}

export function upsertTodos(key, todos) {
  const steps = todos.map(t => ({ title: trunc(t.content, 80), active: trunc(t.activeForm, 80), status: todoStatus(t.status) }))
  if (key !== 'main') {
    const a = agents.get(key)
    if (a) {
      const cur = steps.find(s => s.status === 'active')
      a.todo = { done: steps.filter(s => s.status === 'done').length, total: steps.length, active: cur ? cur.active || cur.title : '' }
    }
    return
  }
  const prev = bars.get('todo')
  const fresh = !prev || barState(prev) === 'done' || prev.dismissed
  const bar = fresh ? newBar('todo', flags.lastPrompt || 'Tasks', 'todo', []) : prev
  bar.stages = [{ name: 'Tasks', steps }]
  bar.explicit = null
  placeBar(bar)
}

export function syncTasksBar() {
  const list = [...tasks.values()].filter(t => t.status !== 'deleted')
  if (!list.length) return
  const steps = list.map(t => ({ title: t.subject, active: t.active || t.subject, status: todoStatus(t.status) }))
  const prev = bars.get('tasks')
  const bar = prev && !prev.dismissed && barState(prev) !== 'done' ? prev : newBar('tasks', flags.lastPrompt || 'Tasks', 'tasks', [])
  bar.stages = [{ name: 'Tasks', steps }]
  placeBar(bar)
}

export function applyTaskResult(input, result) {
  if (input.tool === 'TaskCreate') {
    const id = result?.task?.id
    if (id == null) return
    const list = [...tasks.values()].filter(t => t.status !== 'deleted')
    if (list.length && list.every(t => t.status === 'completed')) tasks.clear()
    tasks.set(String(id), { subject: trunc(input.subject ?? result.task.subject, 80), active: trunc(input.activeForm, 80), status: 'pending' })
  } else if (input.tool === 'TaskUpdate') {
    if (result && result.success === false) return
    const t = tasks.get(String(input.taskId))
    if (!t) return
    if (input.status) t.status = input.status
    if (input.subject) t.subject = trunc(input.subject, 80)
    if (input.activeForm) t.active = trunc(input.activeForm, 80)
  } else if (Array.isArray(result?.tasks)) {
    const ids = new Set()
    for (const r of result.tasks) {
      const id = String(r.id)
      ids.add(id)
      const t = tasks.get(id)
      if (t) t.status = r.status
    }
    for (const id of [...tasks.keys()]) if (!ids.has(id)) tasks.delete(id)
  }
  syncTasksBar()
}

// ---------- the activity row ----------

export function actionOf(e) {
  const base = p => String(p ?? '').split('/').pop()
  switch (e.tool) {
    case 'Read':
      return 'Reading ' + base(e.file_path)
    case 'Grep':
    case 'Glob':
      return 'Searching'
    case 'Edit':
    case 'MultiEdit':
    case 'Write':
    case 'NotebookEdit':
      return 'Editing ' + base(e.file_path ?? e.notebook_path)
    case 'Bash':
      return 'Running ' + trunc(String(e.command ?? '').trim().split(/\s+/).slice(0, 2).join(' '), 22)
    case 'WebFetch':
    case 'WebSearch':
      return 'Browsing'
    case 'Agent':
    case 'Task':
      return 'Delegating'
    case 'TodoWrite':
      return 'Planning'
    default:
      return String(e.tool).replace(/^mcp__.+?__/, '')
  }
}

export function startActivity() {
  activity = { title: flags.lastPrompt || 'Working', start: Date.now(), tools: 0, action: 'Thinking', done: false, doneAt: 0, agentsDoneAt: null }
}

export const activityOpen = () => (activity && !activity.done ? activity : null)

export function finishActivity() {
  if (activity && !activity.done) {
    activity.done = true
    activity.doneAt = Date.now()
  }
}

export function setActivityAgentsDone(v) {
  if (activity) activity.agentsDoneAt = v
}

export const clearActivityAgentsDone = () => {
  if (!activity) return
  for (const a of [...agents.values()]) if (a.home === 'activity' && a.state === 'done') agents.delete(a.id)
  activity.agentsDoneAt = null
}

export function elapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + (s % 60) + 's'
}

function visibleStrips(bar, now) {
  const list = agentsOf(bar)
  if (!list.length) return null
  const hasError = list.some(a => a.state === 'error')
  if (bar.agentsDoneAt && now - bar.agentsDoneAt > FOLD_MS && !hasError) return null
  if (list.length <= MAX_STRIPS) return { shown: list, hidden: [] }
  const keep = new Set(list.filter(a => a.state !== 'done').slice(0, MAX_STRIPS - 1).map(a => a.id))
  for (const a of [...list].reverse()) {
    if (keep.size >= MAX_STRIPS - 1) break
    keep.add(a.id)
  }
  return { shown: list.filter(a => keep.has(a.id)), hidden: list.filter(a => !keep.has(a.id)) }
}

export function stripTool(a) {
  if (a.state === 'waiting') return 'Needs approval'
  if (a.todo && a.todo.total && a.state === 'running') return trunc(a.todo.active || 'Tasks', 24) + ' ' + Math.min(a.todo.total, a.todo.done + 1) + '/' + a.todo.total
  return a.tool
}

function activityRow(now) {
  if (!activity) return null
  const mine = [...agents.values()].filter(a => a.home === 'activity')
  // a plain chat turn: worth a row while it thinks, not once it has answered
  if (activity.done && activity.tools === 0 && !mine.length) return null
  const planned = [...bars.values()].some(b => b.id !== 'agents' && !b.dismissed && b.startedAt >= activity.start - 1000)
  if (planned) return null
  const asking = !activity.done && (waiting.has('main') || mine.some(a => a.state === 'waiting'))
  const style = activity.done ? 'done' : asking ? 'ask' : 'run'
  const pct = activity.done ? 100 : 95 * (1 - Math.exp(-activity.tools / 18))
  const time = elapsed((activity.done ? activity.doneAt : now) - activity.start)
  const name = activity.done ? 'Done' : asking ? 'Needs you' : trunc(activity.action, 28)
  const agentNote = mine.length ? ' · ' + mine.filter(a => a.state === 'done').length + '/' + mine.length + ' agents' : ''
  return {
    id: 'activity',
    kind: 'activity',
    style,
    state: activity.done ? 'done' : asking ? 'needs_input' : 'running',
    title: activity.title,
    pct,
    marks: [],
    name,
    count: activity.tools + (activity.tools === 1 ? ' tool' : ' tools') + agentNote,
    strips: visibleStrips({ id: 'activity', agentsDoneAt: activity.agentsDoneAt }, now),
    right: time,
    animating: !activity.done,
  }
}

function barRow(bar, now) {
  const state = barState(bar)
  const w = where(bar)
  const done = state === 'done'
  const single = bar.stages.length === 1
  const list = agentsOf(bar)
  const agentNote = list.length && bar.id !== 'agents' ? ' · ' + list.filter(a => a.state === 'done').length + '/' + list.length + ' agents' : ''
  let name
  let count
  if (bar.id === 'agents') {
    name = done ? 'Done' : 'Agents'
    count = w.finished + '/' + w.total
  } else if (done) {
    name = 'Done'
    count = w.total + '/' + w.total
  } else if (single) {
    name = w.active ? w.active.active || w.active.title : bar.stages[0].name
    count = Math.min(w.total, w.pos + 1) + '/' + w.total
  } else {
    name = bar.stages[w.stage]?.name ?? ''
    count = w.step + '/' + w.stageSize
  }
  const marks = []
  let k = 0
  for (const s of bar.stages) {
    s.steps.forEach((_, j) => {
      if (k > 0) marks.push({ f: k / w.total, stage: !single && j === 0 })
      k++
    })
  }
  const pct = done ? 100 : ((w.finished + (w.active ? 0.4 : 0)) / Math.max(1, w.total)) * 100
  return {
    id: 'bar:' + bar.id,
    kind: 'bar',
    style: STATE_STYLE[state],
    state,
    title: bar.title || 'Plan',
    pct,
    marks,
    name: trunc(name, 30),
    count: count + agentNote,
    right: Math.round(pct) + '%',
    animating: !done,
    strips: visibleStrips(bar, now),
  }
}

/** The rows the bar draws now, oldest first. Finished rows stay until `clearFinished`. */
export function collectRows(now) {
  for (const bar of bars.values()) {
    const s = barState(bar)
    if (s === 'done' && !bar.doneAt) bar.doneAt = now
    if (s !== 'done') bar.doneAt = null
  }
  const rows = []
  for (const bar of bars.values()) {
    if (bar.dismissed) continue
    if (bar.id === 'agents' && !agentsOf(bar).length) continue
    if (!allSteps(bar).length) continue
    rows.push(barRow(bar, now))
  }
  const act = activityRow(now)
  if (act) rows.push(act)
  return rows
}

export const isWorking = () => [...bars.values()].some(b => !b.dismissed && barState(b) !== 'done') || (activity && !activity.done)
