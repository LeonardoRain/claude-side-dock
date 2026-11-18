import { expect, test } from 'claude-code/testing'

const DOCK = {
  plugin: 'side-dock-claude',
  component: 'Pane',
  requestId: 'side-dock-claude',
  props: {
    title: 'Dock',
    isFocused: false,
    bodyColumns: 48,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

// Stands for the engine beneath the plugin: each call on `$` answered.
// biome-ignore lint: the test's own `on`.
function engine(on: any) {
  on('command.register', () => ({ value: {} }))
  on('tool.register', () => ({ value: {} }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.panes', () => ({ value: [{ id: 'side-dock-claude', title: 'Dock', isShown: true, isFocused: false, isPlaced: true }] }))
  on('session.usage', () => ({ value: { context: {}, rateLimits: [] } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('command.run', () => ({ text: '' }))
  on('env.get', () => ({ value: undefined }))
  on('settings.read', () => ({ value: {} }))
  on('clock.now', () => ({ value: 1_000_000 }))
  on('clock.after', () => ({ value: {} }))
  on('clock.every', () => ({ value: {} }))
  on('session.surfaces', () => ({ value: [] }))
  on('agent.list', () => ({ value: [] }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.blit', () => ({ value: undefined }))
}

test('the dock stacks the crab, the work map and their rows', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'ls' })

  const ui = await $.ui.mount({ ...DOCK, surface: 'desktop' })
  // The crab stands above the prompt now, not in the dock.
  expect(await ui.find({ type: 'Text', text: /^Crab cam$/ })).toBeUndefined()
  // The work map has no heading of its own now; its feed window under the map is what shows it is there.
  expect(await ui.find({ type: 'Text', text: /^Work map$/ })).toBeUndefined()
  expect(await ui.find({ key: 'feed-window' })).toBeDefined()
  // No savvy flow and no open sections yet.
  expect(await ui.find({ type: 'Text', text: /^Savvy progress$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^Agents$/ })).toBeUndefined()
  await ui.unmount()
})

test('the Session panel stands at the top of the dock, above the work map', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...DOCK, surface: 'desktop' })
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  // The work map has no heading of its own now; its feed window under the map is what shows it is there.
  expect(await ui.find({ type: 'Text', text: /^Work map$/ })).toBeUndefined()
  expect(await ui.find({ key: 'feed-window' })).toBeDefined()
  await ui.unmount()
})

test('a savvy flow shows its progress bar above the prompt', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'mcp__side-dock-claude__progress', title: 'Demo', total: 3, done: 1, phase: 'delegate' })

  const band = await $.ui.mount({
    plugin: 'side-dock-claude',
    component: 'AbovePrompt',
    surface: 'desktop',
    props: { hasSurvey: false, isWorking: false, bodyColumns: 100 },
  } as never)
  expect(await band.find({ type: 'Svg' })).toBeDefined()
  await band.unmount()
})

test('the terminal draws the dock too', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...DOCK, surface: 'terminal' })
  // No heading; the terminal's map ends with its tally line.
  expect(await ui.find({ type: 'Text', text: /^Work map$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^No counts yet\.$/ })).toBeDefined()
  await ui.unmount()
})

const BAND = {
  plugin: 'side-dock-claude',
  component: 'AbovePrompt',
  surface: 'desktop',
  props: { hasSurvey: false, isWorking: false, bodyColumns: 100 },
} as never

test('a todo list draws the Pixel plan bar above the prompt, with no savvy flow', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [
      { content: 'Read routes', activeForm: 'Reading routes', status: 'in_progress' },
      { content: 'Fix the bug', activeForm: 'Fixing the bug', status: 'pending' },
    ],
  } as never)

  const band = await $.ui.mount(BAND)
  const svgs = await band.findAll({ type: 'Svg' })
  expect(svgs.some(s => String((s as { props?: { source?: string } }).props?.source).includes('pxd'))).toBe(true)
  await band.unmount()
})

test('a spawned subagent shows as a strip under the bar', async ($, on) => {
  engine(on)
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'a1' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.agent.spawn({ tool_use_id: 't1', prompt: 'look', description: 'Map the routes', subagentType: 'Explore' } as never)

  const band = await $.ui.mount(BAND)
  const svgs = await band.findAll({ type: 'Svg' })
  expect(svgs.some(s => String((s as { props?: { source?: string } }).props?.source).includes('Map the routes'))).toBe(true)
  await band.unmount()
})

const pixelSources = async (band: { findAll: (q: { type: string }) => Promise<unknown[]> }): Promise<string[]> =>
  (await band.findAll({ type: 'Svg' })).map(s => String((s as { props?: { source?: string } }).props?.source))

test('a finished bar stays up until the next message', async ($, on) => {
  engine(on)
  on('prompt.submit', (_: unknown, e: unknown) => e)
  on('turn.start', (_: unknown, e: unknown) => e)
  on('turn.complete', (_: unknown, e: unknown) => e)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [{ content: 'Only step', activeForm: 'Doing it', status: 'completed' }],
  } as never)

  const band = await $.ui.mount(BAND)
  expect((await pixelSources(band)).some(s => s.includes('Done'))).toBe(true)
  await $.prompt.submit({ text: 'next question', origin: { kind: 'human' } } as never)
  await band.unmount()
  const after = await $.ui.mount(BAND)
  expect((await pixelSources(after)).some(s => s.includes('Done'))).toBe(false)
  await after.unmount()
})
