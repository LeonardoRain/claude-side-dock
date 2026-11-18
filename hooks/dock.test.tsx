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
  expect((await ui.find({ type: 'Text', text: /^Work map$/ }))?.text).toBe('Work map')
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
  expect((await ui.find({ type: 'Text', text: /^Work map$/ }))?.text).toBe('Work map')
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
  expect((await ui.find({ type: 'Text', text: /^Work map$/ }))?.text).toBe('Work map')
  await ui.unmount()
})
