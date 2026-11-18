import { atom, read, update } from 'claude-code'
import type { EngineInterface, UiOpenResult } from 'claude-code'

import type { DockSection, DockSections } from '../types'

// The one pane every part draws into, stacked top to bottom.
export const DOCK = 'side-dock-claude'
// The tab's title follows the language the dock is set to; register sets it.
let title = 'Dock'
export const setDockTitle = (next: string): void => {
  title = next
}

// Which optional sections are up. The crab's band and the map are always drawn;
// the Crab crew and the Session panel were panes of their own that opened and
// closed, and now they are sections that do the same inside the dock; the Session panel starts open.
export const sections = atom({ plugin: 'side-dock-claude', key: 'sections' } as const, { crew: false, agents: true } as DockSections)

async function isDockShown($: EngineInterface, mustBeShown: boolean): Promise<boolean> {
  const panes = await $.ui.panes().catch(() => [])
  return panes.some(pane => pane.id === DOCK && (!mustBeShown || pane.isShown))
}

/** Opens the dock, and the section with it when it is one that can close. */
export async function dockOpen($: EngineInterface, section: DockSection | 'map'): Promise<UiOpenResult> {
  if (section !== 'map') await update($, sections, s => ({ ...s, [section]: true }))
  return $.ui.open({ id: DOCK, title })
}

/** Folds a section away; the dock itself stays, as the map is always in it. */
export async function dockClose($: EngineInterface, section: DockSection): Promise<void> {
  await update($, sections, s => ({ ...s, [section]: false }))
}

/** Whether the section is up and the dock is open (and, with `mustBeShown`, the tab in front). */
export async function dockIsOpen($: EngineInterface, section: DockSection, mustBeShown: boolean): Promise<boolean> {
  const s = await read($, sections)
  return s[section] && (await isDockShown($, mustBeShown))
}
