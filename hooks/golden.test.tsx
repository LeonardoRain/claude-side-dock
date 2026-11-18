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

const BAND = {
  plugin: 'side-dock-claude',
  component: 'AbovePrompt',
  surface: 'desktop',
  props: { hasSurvey: false, isWorking: false, bodyColumns: 100 },
} as never

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

// PROBE (temporary): learn the shape of a mounted tree.
test('probe', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...DOCK, surface: 'desktop' })
  console.log('KEYS', Object.keys(ui as object).join(','))
  console.log('PROTO', Object.getOwnPropertyNames(Object.getPrototypeOf(ui) ?? {}).join(','))
  const all = await ui.findAll({})
  console.log('ALL_LEN', all.length)
  console.log('ALL0', JSON.stringify(all[0], (k, v) => (typeof v === 'function' ? '[fn]' : v)).slice(0, 800))
  console.log('ROOT', JSON.stringify((ui as any).root ?? (ui as any).tree ?? null, (k, v) => (typeof v === 'function' ? '[fn]' : v)).slice(0, 800))
  await ui.unmount()
})
