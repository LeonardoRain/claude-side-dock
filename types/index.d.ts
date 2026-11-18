// The merged contract of crab-cam, lot-map and savvy-progress, under one plugin name.

// ---- from crab-cam
export type Activity =
  | 'idle'
  | 'thinking'
  | 'reading'
  | 'coding'
  | 'writing'
  | 'designing'
  | 'terminal'
  | 'searching'
  | 'web'
  | 'briefing'
  | 'delegating'
  | 'talking'
  | 'asking'
  | 'planning'
  | 'tool'
  | 'done'
  | 'permission'
  | 'compacting'
  | 'error'
  | 'waiting'
  | 'testing'
  | 'git'
  | 'installing'
  | 'skill'
  | 'memory'
  | 'sharing'

export type Scene = { activity: Activity; detail: string }

// What the shell meter shows, each in whole percents used: the context
// window's fill, and the five-hour and weekly rate-limit windows. `null` where
// there is no reading: before the first response, or off a subscription.
export type Meter = { context: number | null; fiveHour: number | null; week: number | null }

// A helper in the Crab crew pane: a subagent or one of a workflow's agents,
// from its first event until the next round of helpers starts. Its group is
// null until it is known which of the two it is; it is not drawn till then.
export type CrewGroup = 'subagent' | 'workflow'
export type CrewPhase = 'working' | 'done' | 'failed'
export type CrewMember = {
  id: string
  group: CrewGroup | null
  // What the call that started it says it is for; workflow agents have none.
  about: string | null
  // The agent definition it runs as (`Explore`, `general-purpose`), once known.
  type: string | null
  // Which colour its crab has: its place in the round.
  seat: number
  startedAt: number
  endedAt: number | null
  // When the scene its crab acts out now began: a new one starts from its
  // beginning, as the band's do.
  sceneAt: number
  phase: CrewPhase
  activity: Activity
  detail: string
  // Its calls in the band's wording, the latest last, at most 50.
  steps: string[]
  model: string | null
  // The tokens of its latest request: what it has in hand.
  tokens: number | null
}

// The round of helpers the pane shows, the names of the workflows running in
// it, and the time the elapsed times run to.
export type Crew = { members: CrewMember[]; workflows: string[]; now: number }

// Which cards have their steps unfolded and which groups are folded, by id.
export type CrewView = { open: string[]; folded: string[] }

// The crew as the band shows it: each helper the pane shows, in its colour and
// phase, in start order, and when the first of them began.
export type CrewBand = { since: number; crabs: { colour: string; phase: CrewPhase }[] }

// ---- from lot-map
export type StationId =
  | 'you' | 'model' | 'memory' | 'files' | 'shell'
  | 'web' | 'browser' | 'agents' | 'skills' | 'hooks'

export type Status = 'run' | 'ok' | 'err' | 'block'

/** One action on the map. Labels carry names and record numbers, never the text of a memory. */
export type Entry = {
  id: string
  station: StationId
  label: string
  /** Where the pulse starts: the core, the agents station, or the station itself (a signal coming in). */
  from: 'core' | 'agents' | 'inbound'
  startedAt: number
  endedAt?: number
  status: Status
  /** The subagent whose loop made the call; absent for the main loop. */
  agentId?: string
  /** The background task the call started; the row stays open until that task reports back. */
  task?: string
  /** A moment the map marks: the model changed, or the answer is ready. */
  mark?: 'switch' | 'done'
  /** With `contextCost`: about how many tokens the context grew by with this call's answer. A number, never content. */
  tokens?: number
  /** The growth was one step's, shared evenly with the other calls of that step: shown with `~`. */
  shared?: boolean
}

export type Board = {
  entries: Entry[]
  counts: Partial<Record<StationId, number>>
  model?: string
  step?: number
  /** How many of the memory station's count a hook brought unasked. */
  pushed?: number
  /** Errors and refusals per station since the person's last message. */
  faults?: Partial<Record<StationId, number>>
  /** Subagents whose loops are still going. */
  agents?: string[]
  /** How full the context window is, 0 to 100. */
  context?: number
  /** With `contextCost`: about how many tokens each station's calls added to the context this session. */
  spent?: Partial<Record<StationId, number>>
  /** When the model last changed. */
  switchedAt?: number
  /** The row of the feed the person opened to read whole: its entry's id. */
  open?: string
  /** The editor's pane folded to its line of now; kept between sessions as well. */
  minimized?: boolean
  /** How wide the editor draws the map, in CSS pixels; absent, as wide as the pane. Kept between sessions as well. */
  zoom?: number
}

// ---- from savvy-progress
export type Phase = 'plan' | 'design' | 'delegate' | 'review' | 'close'

export type PlannedTask = {
  title: string
  tier: string
  after: number[]
  /** The model the task will run on, when the orchestrator names it; the tier's default otherwise. */
  model?: string
  effort?: string
}

/** Token counts by kind, summed over model requests. */
export type TokenSplit = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

/** The main loop's own model requests: an API-equivalent estimate, never a bill. */
export type MainUsage = {
  model: string
  tokens: number
  costUsd: number
  steps: number
  split?: TokenSplit
  /** Estimated cost and tokens of the main loop per model display name. */
  byModel?: Record<string, { costUsd: number; tokens: number }>
  /** Wall-clock time of finished main-loop turns. */
  activeMs?: number
  turns?: number
  /** Set while a main-loop turn runs. */
  turnStartedAt?: number
  /** The main loop's current or last turn. */
  turnId?: string
}

export type RateWindow = {
  kind: string
  percentUsed: number
  resetsAt?: string
}

export type ContextSlice = {
  name: string
  tokens: number
  kind: string
}

/** The engine's own session figures (`$.session.usage()` and `session.measure`). */
export type SavvyMeter = {
  startedAt: number
  contextTokens?: number
  contextWindow: number
  contextPercent?: number
  rateLimits: RateWindow[]
  /** The engine's ledger, as /cost totals it; absent where the host keeps none. */
  costUsd?: number
  categories?: ContextSlice[]
  categoriesMax?: number
  breakdownAt?: number
}

export type Flow = {
  title: string
  total: number
  done: number
  running: number
  phase: Phase
  isFinished: boolean
  tasks: PlannedTask[]
  /** When the flow began: runs that started earlier belong to an earlier flow. */
  startedAt?: number
}

export type AgentStatus = 'running' | 'done' | 'failed'

export type AgentRun = {
  id: string
  agentId?: string
  type: string
  description: string
  model: string
  effort?: string
  status: AgentStatus
  startedAt: number
  endedAt?: number
  contextTokens: number
  contextMax: number
  tokens: number
  costUsd: number
  steps: number
  round: number
  split?: TokenSplit
  /** The model routing gave the run, when the Agent call named none (`exploreModel`, `generalModel`). */
  routedModel?: string
  /** The run whose loop started this one; absent when the main loop did. */
  parentAgentId?: string
  /** The workflow run (`wf_...`) and the agent's place in it, for a workflow's agent. */
  workflowRunId?: string
  workflowIndex?: number
  /** What SendMessage addresses it by, when the call named it. */
  name?: string
  /** Self-reported by the worker through the `step` tool. */
  stepDone?: number
  stepTotal?: number
  stepNote?: string
}

export type Panel = {
  isCompact: boolean
  isDoneCollapsed: boolean
  /** The flow title or main turn the panel last opened itself for. */
  autoOpenedFor: string
  /** The person closed the panel: subagents outside a flow leave it closed until they open it. */
  isAutoOff?: boolean
  /** The run the person picked to keep in view on a surface with no agent view of its own. */
  focusAgentId?: string
}

/**
 * What the drawings read: a copy of the live values, published at most every two
 * seconds while tokens stream in, so a press does not land on a retired handle.
 */
export type Frame = {
  flow: Flow | null
  agents: AgentRun[]
  main: MainUsage
  meter: SavvyMeter
  /** The time the frame was taken. */
  at: number
}


// ---- the dock's own
export type DockSection = 'crew' | 'agents'
export type DockSections = Record<DockSection, boolean>

declare module 'claude-code' {
  interface PluginState {
    'side-dock': {
      // crab-cam
      scene: Scene
      isHidden: boolean
      frame: number
      meter: Meter
      isMetered: boolean
      isDetailed: boolean
      isRaw: boolean
      crew: Crew
      demoCrew: Crew | null
      crewView: CrewView
      // lot-map
      board: Shaped<Board>
      // savvy-progress
      flow: Flow | null
      agents: AgentRun[]
      panel: Panel
      savvyFrame: Frame
      savvyMain: MainUsage
      savvyMeter: SavvyMeter
      // dock
      sections: DockSections
    }
  }
}
