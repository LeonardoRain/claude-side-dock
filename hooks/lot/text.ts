// Every word the map shows, in each language it speaks.
// A new language is one more table here and one more value of `language` in plugin.json.
import type { StationId } from '../../types'

export type Strings = {
  title: string
  command: string
  opened: string
  cannotOpen: (reason: string) => string
  /** The pane's buttons in an editor, where the pane cannot be made taller. */
  zoomOut: string
  zoomIn: string
  hideMap: string
  showMap: string
  stations: Record<StationId, string>
  newMessage: string
  answerReady: string
  turnAborted: string
  step: (n: number) => string
  subagent: string
  compacting: string
  addedContext: (when: string) => string
  addedMemory: (when: string) => string
  toMessage: string
  atStart: string
  records: (n: number, shown: string) => string
  stopped: (tool: string) => string
  askedPermission: (tool: string) => string
  checkBefore: (tool: string) => string
  running: string
  nothingYet: string
  noCounts: string
  /** In place of the terminal picture, in a terminal that keeps every picture it is sent. */
  noPictureHere: string
  idle: string
  context: string
  andMore: (n: number) => string
  webSearch: string
  artifact: string
  workflow: string
  skill: string
  loadingTools: string
  questionForYou: string
  fileForYou: string
  ms: (n: number) => string
  seconds: (s: string) => string
  minutes: (m: number, s: number) => string
}

const en: Strings = {
  title: 'Work map',
  command: 'Open the work map beside the chat',
  opened: 'Work map opened.',
  cannotOpen: reason => `Nowhere to show the map right now: ${reason}`,
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  hideMap: 'Hide map',
  showMap: 'Show map',
  stations: {
    you: 'You',
    model: 'Model',
    memory: 'Memory',
    files: 'Files',
    shell: 'Shell',
    web: 'Network',
    browser: 'Browser',
    agents: 'Agents',
    skills: 'Skills',
    hooks: 'Hooks',
  },
  newMessage: 'new message',
  answerReady: 'answer ready',
  turnAborted: 'turn interrupted',
  step: n => `step ${n}`,
  subagent: 'subagent',
  compacting: 'compacting context',
  addedContext: when => `added context ${when}`,
  addedMemory: when => `added memory ${when}`,
  toMessage: 'to the message',
  atStart: 'at session start',
  records: (n, shown) => `${n} record${n === 1 ? '' : 's'}: ${shown}`,
  stopped: tool => `stopped ${tool}`,
  askedPermission: tool => `asked permission: ${tool}`,
  checkBefore: tool => `check before ${tool}`,
  running: 'running',
  nothingYet: 'Nothing yet.',
  noCounts: 'No counts yet.',
  noPictureHere: "No picture in iTerm2: it keeps every frame in memory. See the README.",
  idle: 'Nothing is running.',
  context: 'context',
  andMore: n => ` and ${n} more`,
  webSearch: 'web search',
  artifact: 'artifact',
  workflow: 'workflow',
  skill: 'skill',
  loadingTools: 'loading tools',
  questionForYou: 'question for you',
  fileForYou: 'file for you',
  ms: n => `${n} ms`,
  seconds: s => `${s} s`,
  minutes: (m, s) => `${m} min ${s} s`,
}

const zh: Strings = {
  title: '工作地图',
  command: '在聊天旁打开工作地图',
  opened: '工作地图已打开。',
  cannotOpen: reason => `现在无处显示地图：${reason}`,
  zoomOut: '缩小',
  zoomIn: '放大',
  hideMap: '隐藏地图',
  showMap: '显示地图',
  stations: {
    you: '你',
    model: '模型',
    memory: '记忆',
    files: '文件',
    shell: '终端',
    web: '网络',
    browser: '浏览器',
    agents: '代理',
    skills: '技能',
    hooks: '钩子',
  },
  newMessage: '新消息',
  answerReady: '回答已就绪',
  turnAborted: '本轮已中断',
  step: n => `第 ${n} 步`,
  subagent: '子代理',
  compacting: '正在压缩上下文',
  addedContext: when => `已添加上下文${when}`,
  addedMemory: when => `已添加记忆${when}`,
  toMessage: '到消息',
  atStart: '会话开始时',
  records: (n, shown) => `${n} 条记录：${shown}`,
  stopped: tool => `已停止 ${tool}`,
  askedPermission: tool => `请求权限：${tool}`,
  checkBefore: tool => `${tool} 前检查`,
  running: '运行中',
  nothingYet: '暂无内容。',
  noCounts: '暂无计数。',
  noPictureHere: 'iTerm2 不显示图片：它会把每一帧都留在内存里。见 README。',
  idle: '当前没有运行中的任务。',
  context: '上下文',
  andMore: n => `，另有 ${n} 项`,
  webSearch: '网页搜索',
  artifact: '产物',
  workflow: '工作流',
  skill: '技能',
  loadingTools: '正在加载工具',
  questionForYou: '等你回答的问题',
  fileForYou: '给你的文件',
  ms: n => `${n} 毫秒`,
  seconds: s => `${s} 秒`,
  minutes: (m, s) => `${m} 分 ${s} 秒`,
}

const TABLES = new Map<unknown, Strings>([['en', en], ['zh', zh]])

export const stringsFor = (language: unknown): Strings => TABLES.get(language) ?? en
