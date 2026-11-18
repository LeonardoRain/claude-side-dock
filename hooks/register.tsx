import { atom, read } from 'claude-code'
import type { EngineInterface, HookFor, Register } from 'claude-code'

import { init as crabInit, crab_agent_spawn, crab_classic_PermissionRequest, crab_classic_Stop, crab_classic_SubagentStart, crab_command_run_COMMAND, crab_session_compact, crab_session_end, crab_session_measure, crab_session_start, crab_tool_call, crab_turn_complete, crab_turn_start, crab_turn_step, crab_ui_press_side_dock_claude, crab_ui_render_AbovePrompt, crab_ui_render_Pane_PANE } from './crab/register'
import type { DockSections } from '../types'
import { deck_agent_spawn, deck_classic_Stop, deck_classic_SubagentStop, deck_classic_TaskCompleted, deck_classic_TaskCreated, deck_prompt_submit, deck_session_end, deck_session_start, deck_tool_call, deck_tool_check, deck_turn_complete, deck_turn_start } from './deck/register'
import { DOCK, dockClose, setDockTitle } from './dock'
import { init as lotInit, lot_agent_spawn, lot_classic_PreToolUse, lot_classic_SessionStart, lot_classic_UserPromptSubmit, lot_command_run_lot_map, lot_prompt_submit, lot_session_compact, lot_session_start, lot_skill_prompt, lot_tool_call, lot_turn_complete, lot_turn_start, lot_turn_step, lot_ui_render_Pane_PANE } from './lot/register'
import { init as savvyInit, savvy_agent_spawn, savvy_command_run_agent_routing, savvy_command_run_agents_info, savvy_prompt_submit, savvy_session_measure, savvy_session_start, savvy_tool_call_Agent, savvy_tool_call_STEP_TOOL, savvy_tool_call_TOOL, savvy_turn_complete, savvy_turn_start, savvy_turn_step, savvy_ui_close, savvy_ui_render_AbovePrompt, savvy_ui_render_Pane_PANE } from './savvy/register'

// side-dock-claude: crab-cam, lot-map and savvy-progress as they are, gathered into one
// pane at the right, top to bottom:
//   crab-cam: the crab and its shell, then the Crab crew while it is open
//   lot-map: the work map and its rows
//   savvy-progress: the Session panel (cost, context, tokens, subagents) at the top, folded away by Details;
//   its stats row and the flow's progress bar stand under the crab, above the prompt
//
// A plugin registers each event once, so each event below runs the parts' hooks
// as one chain, crab-cam outermost, as the three plugins ran one above the other.
// Their drawings of the band and of their own panes are drawn as the dock's sections.

// Which of the closable sections are up; dock.ts writes the same value.
const sections = atom({ plugin: 'side-dock-claude', key: 'sections' } as const, { crew: false, agents: true } as DockSections)

// biome-ignore lint: the parts' hooks each take their own narrowed input.
type Any = any

// savvy-progress matched its tool calls by name; the rest pass beneath it.
function savvyToolCall($: EngineInterface, e: Any, next: Any): Any {
  if (e.tool === 'mcp__side-dock-claude__progress') return savvy_tool_call_TOOL($, e, next)
  if (e.tool === 'mcp__side-dock-claude__step') return savvy_tool_call_STEP_TOOL($, e, next)
  if (e.tool === 'Agent') return savvy_tool_call_Agent($, e, next)
  return next(e)
}

// savvy-flow's skill names savvy-progress's tools, which the dock serves now under its own name.
const renameTools: HookFor<'skill.prompt'> = ($, e, next) =>
  e.text.includes('mcp__savvy-progress__')
    ? next({ ...e, text: e.text.split('mcp__savvy-progress__').join('mcp__side-dock-claude__') })
    : next(e)

const none = async () => null

// A part's `next` is the next part's hook: typed as any `next`, as the engine's own is.
const then = (fn: (e: Any) => Any): never => fn as never

// One part's drawing, or null where it draws nothing or fails: a part that throws
// never blanks the others.
async function settled(drawing: Promise<unknown> | unknown): Promise<unknown> {
  try {
    const tree = await drawing
    return tree && typeof tree === 'object' && (tree as { type?: string }).type !== 'engine' ? tree : null
  } catch {
    return null
  }
}

const DOCK_WORDS = {
  en: {
    title: 'Dock',
    crew: 'Crab crew',
    map: 'Work map',
    empty: 'Nothing to show yet.',
  },
  zh: {
    title: '侧边面板',
    crew: '螃蟹小组',
    map: '工作地图',
    empty: '暂时没有内容。',
  },
} as const

export const register: Register = (on, options) => {
  // The dock's own words follow the map's language setting.
  const words = DOCK_WORDS[options.language === 'zh' ? 'zh' : 'en']
  setDockTitle(words.title)
  crabInit(options)
  lotInit(options)
  savvyInit(options)

  // `then(fn)` hands a part the hook beneath it as its `next`.
  on('session.start', ($, e, next) => crab_session_start($, e, then((e1: Any) => lot_session_start($, e1, then((e2: Any) => savvy_session_start($, e2, then((e3: Any) => deck_session_start($, e3, next))))))))
  on('session.compact', ($, e, next) => crab_session_compact($, e, then((e1: Any) => lot_session_compact($, e1, next))))
  on('session.end', ($, e, next) => crab_session_end($, e, then((e1: Any) => deck_session_end($, e1, next))))
  on('turn.step', async function* ($, e, next) {
    return yield* crab_turn_step($, e, then((e1: Any) => lot_turn_step($, e1, then((e2: Any) => savvy_turn_step($, e2, next)))))
  })
  on('turn.complete', ($, e, next) => crab_turn_complete($, e, then((e1: Any) => lot_turn_complete($, e1, then((e2: Any) => savvy_turn_complete($, e2, then((e3: Any) => deck_turn_complete($, e3, next))))))))
  on('tool.call', ($, e, next) => crab_tool_call($, e, then((e1: Any) => lot_tool_call($, e1, then((e2: Any) => savvyToolCall($, e2, then((e3: Any) => deck_tool_call($, e3, next))))))))
  on('agent.spawn', ($, e, next) => crab_agent_spawn($, e, then((e1: Any) => lot_agent_spawn($, e1, then((e2: Any) => savvy_agent_spawn($, e2, then((e3: Any) => deck_agent_spawn($, e3, next))))))))
  on('prompt.submit', ($, e, next) => lot_prompt_submit($, e, then((e1: Any) => savvy_prompt_submit($, e1, then((e2: Any) => deck_prompt_submit($, e2, next))))))
  on('skill.prompt', ($, e, next) => renameTools($, e, then((e1: Any) => lot_skill_prompt($, e1, next))))
  on('command.run', { command: 'crab-cam' }, ($, e) => crab_command_run_COMMAND($, e as never))
  on('command.run', { command: 'lot-map' }, $ => lot_command_run_lot_map($))
  on('session.measure', ($, e, next) => crab_session_measure($, e, then((e1: Any) => savvy_session_measure($, e1, next))))
  on('turn.start', ($, e, next) => crab_turn_start($, e, then((e1: Any) => lot_turn_start($, e1, then((e2: Any) => savvy_turn_start($, e2, then((e3: Any) => deck_turn_start($, e3, next))))))))
  on('ui.close', ($, e, next) => savvy_ui_close($, e, next))
  on('command.run', { command: 'agents-info' }, ($, e, next) => savvy_command_run_agents_info($, e, next))
  on('command.run', { command: 'agent-routing' }, ($, e, next) => savvy_command_run_agent_routing($, e, next))
  on('classic.PermissionRequest', ($, e, next) => crab_classic_PermissionRequest($, e, next))
  on('classic.SubagentStart', ($, e, next) => crab_classic_SubagentStart($, e, next))
  on('classic.Stop', ($, e, next) => crab_classic_Stop($, e, then((e1: Any) => deck_classic_Stop($, e1, next))))
  on('classic.SubagentStop', ($, e, next) => deck_classic_SubagentStop($, e, next))
  on('classic.TaskCreated', ($, e, next) => deck_classic_TaskCreated($, e, next))
  on('classic.TaskCompleted', ($, e, next) => deck_classic_TaskCompleted($, e, next))
  on('tool.check', ($, e, next) => deck_tool_check($, e, next))
  on('classic.PreToolUse', ($, e, next) => lot_classic_PreToolUse($, e, next))
  on('classic.UserPromptSubmit', ($, e, next) => lot_classic_UserPromptSubmit($, e, next))
  on('classic.SessionStart', ($, e, next) => lot_classic_SessionStart($, e, next))
  on('ui.press', { plugin: 'side-dock-claude' }, ($, e, next) => crab_ui_press_side_dock_claude($, e, next))

  // Above the prompt, one row of the dock's: the crab on top, and under it savvy-progress's
  // stats row (cost, tokens, context, time, Details) with the flow's progress bar while one runs.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { Box } = $.ui.resolve(e)
    const [crab, row] = await Promise.all([
      settled(crab_ui_render_AbovePrompt($, e as never, none as never)),
      settled(savvy_ui_render_AbovePrompt($, e, none)),
    ])
    if (crab === null && row === null) return next(e)
    return (
      <Box flexDirection="column" width="100%">
        {crab === null ? [] : [<Box key="dock-crab" width="100%">{crab as never}</Box>]}
        {row === null ? [] : [<Box key="dock-savvy" width="100%">{row as never}</Box>]}
      </Box>
    )
  })

  // The pane: the Session panel on top (Details folds it), the work map under it,
  // and the Crab crew last, while it is open.
  on('ui.render', { component: 'Pane', requestId: DOCK }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const open = await read($, sections)
    const [session, map, crew] = await Promise.all([
      open.agents ? settled(savvy_ui_render_Pane_PANE($, e, none)) : null,
      settled(lot_ui_render_Pane_PANE($, e as never)),
      open.crew ? settled(crab_ui_render_Pane_PANE($, e as never)) : null,
    ])

    const blocks: never[] = []
    // A section with a title and, where it can be closed, a ✕; the Session panel has its own cards.
    const section = (key: string, title: string | null, body: Any, closing?: 'crew') => {
      if (body === null) return
      blocks.push(
        <Box key={`dock-${key}`} flexDirection="column" gap={1}>
          {title === null ? (
            []
          ) : (
            <Box flexDirection="row" justifyContent="space-between" alignItems="center">
              <Text bold dimColor>
                {title}
              </Text>
              {closing === undefined
                ? []
                : [<Button key={`dock-close-${key}`} plain dimColor label="✕" onPress={() => void dockClose($, closing)} />]}
            </Box>
          )}
          {body}
        </Box> as never,
      )
    }

    section('session', null, session)
    section('map', words.map, map)
    section('crew', words.crew, crew, 'crew')

    return (
      <Box flexDirection="column" gap={2}>
        {blocks.length > 0 ? blocks : [<Text dimColor>{words.empty}</Text>]}
      </Box>
    )
  })
}
