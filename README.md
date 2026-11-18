# side-dock-claude

> 把 **crab-cam**、**lot-map**、**savvy-progress** 三个公开 mod 合并重制的 Claude Code 桌面版侧边面板。
> A Claude Code (desktop app) mod that merges three public mods into one right-side **Dock** pane plus one row above the prompt.

三个原版 mod 各占一个面板、各自注册命令，同时装三个会挤占界面、互相重复。这个 mod 把它们收进**同一个右侧 Dock**，并补上了原版没有的几处能力（费用持久化、人民币估价、子代理模型路由、中文界面等），按我自己的使用习惯打磨而成。

- 插件 id、marketplace 名与仓库名都是 `side-dock-claude`
- 当前版本：0.2.5
- 技术栈：TypeScript / TSX，通过 Claude Code mod 的 `hooks` 机制运行，无构建步骤、无外部运行时依赖
- 许可：MIT（上游三个项目同为 MIT，版权声明原样保留，见文末）

---

## 它长什么样

### 右侧 Dock 面板（自上而下）

| 区块 | 内容 | 来源 |
| --- | --- | --- |
| **会话面板 Session** | 会话成本、上下文窗口占用、令牌拆分（输入 / 输出 / 缓存读 / 缓存写 / 缓存命中率）、5 小时与 7 天用量限额、主会话与各子代理的模型、上下文和花费 | savvy-progress |
| **工作地图 Work map** | 以"地图"形式实时展示 Claude 当前在做什么：中心是 Claude，周围是各个站点（你、模型、记忆、文件、Shell、网络、浏览器、子代理、技能、钩子等），每次工具调用会点亮对应站点和连线；地图下方是按时间排列的调用记录行 | lot-map |
| **螃蟹小组 Crab crew** | 每个子代理一张卡片，显示状态和已用时间；默认关闭，`/crab-cam crew` 打开 | crab-cam |

### 输入框上方

- **螃蟹**：随 Claude 的状态切换场景（思考、读文件、写代码、跑测试、git、装依赖、搜索、联网、等待权限、出错、压缩上下文、完成等共 25 种）。
- **统计行**：费用 / 令牌 / 上下文 / 已用时间 / **Details** 按钮（点击或输入 `/agents-info` 折叠、展开会话面板）。
- **进度条**：运行 `savvy-flow`（多子代理编排流程）时，显示计划任务的完成进度。

---

## 安装

```
/plugin marketplace add LeonardoRain/side-dock-claude
/plugin install side-dock-claude --marketplace side-dock-claude
```

> **请先停用原来的 crab-cam、lot-map、savvy-progress 三个 mod**，否则命令和画面会重复出现。

安装后会提供两个 MCP 工具，供 `savvy-flow` 技能上报进度：`mcp__side-dock-claude__progress`（整体计划）与 `mcp__side-dock-claude__step`（单个子代理的步骤）。技能文本里原有的 `mcp__savvy-progress__*` 名称会被自动改写为 `mcp__side-dock-claude__*`，无需手改技能。

---

## 命令

| 命令 | 作用 |
| --- | --- |
| `/crab-cam` | 隐藏 / 显示螃蟹 |
| `/crab-cam demo` | 依次播放全部 25 个场景（每个 3 秒），结尾附带一组示例子代理 |
| `/crab-cam meter` | 显示 / 隐藏螃蟹壳上的用量仪表（肋骨 = 上下文，珍珠 = 5 小时 / 一周限额） |
| `/crab-cam details` | 在仪表旁用数字写出具体读数 |
| `/crab-cam commands` | 命令按原文显示，而非按"它做什么"的描述显示（切换） |
| `/crab-cam crew` | 打开 / 关闭螃蟹小组区块 |
| `/lot-map` | 打开 Dock 面板（工作地图） |
| `/agents-info` | 折叠 / 展开会话面板 |
| `/agent-routing` | 查看或设置子代理模型路由（见下） |

---

## 在三个原版之上做的改动

1. **合并为一个面板**：三个原版各开自己的面板，这里统一画进同一个 Dock，所有状态（atom）都归在 `side-dock-claude` 插件名下。三个 mod 的同名事件钩子被串成一条链（crab-cam 在最外层），某一部分绘制失败只会让自己那块留空，不会拖垮其他部分。
2. **会话成本跨重启保留**：成本按会话 id 存入 `$.store`（键 `cost:<session id>`），重启后恢复；下次启动时清理对话记录已不存在的条目。注意：mod 无法感知"归档"，被归档的会话会保留其成本记录。
3. **人民币（¥）估价**：引擎只上报令牌数，不报金额，所以面板里的费用都是按令牌数乘价目表**估算**的，单位 ¥ / 百万令牌，代码里内置的价目表只是**示例**（Opus、Sonnet、Haiku 三档，Haiku 按单次请求的提示长度分两档），并不代表官方定价或任何特定服务商的价格。未识别的模型按最贵的 Opus 计价，宁可高估也不低估。**这是估算值，不是账单**；请按自己实际使用的服务商价格修改 `hooks/savvy/register.tsx` 中的 `PRICES`。
4. **子代理模型路由**：当 `Agent` 调用没有指定模型时，可为 `Explore` 与 `general-purpose` 两类内置子代理分别指定默认模型。
   - `/agent-routing on`：Explore → haiku，general-purpose → sonnet
   - `/agent-routing off`：都恢复为继承主会话模型
   - `/agent-routing explore <模型>` / `/agent-routing general <模型>`：单独设置，模型可选 `inherit | haiku | sonnet | opus | fable`
   - 调用里显式写了模型、fork、workflow 子代理、teammate 以及自定义类型的子代理不受路由影响（钩子读不到自定义类型的模型定义，显式模型本就应当优先）。被路由的子代理会在面板里标"auto"。
5. **卡片撑满面板宽度**：会话卡片随面板宽度缩放，右侧不再留空白条。
6. **界面语言只保留英文和简体中文**：工作地图、Dock 标题和会话面板都只支持 `en` 与 `zh`，上游的俄、西、法、德、意、葡、土耳其语文案已删除。

---

## 配置项

在插件设置里调整（`.claude-plugin/plugin.json` 的 `userConfig`），常用的有：

| 配置 | 说明 | 默认 |
| --- | --- | --- |
| `language` | 工作地图与 Dock 标题的语言，`zh` 为简体中文 | `en` |
| `agentsLanguage` | 会话面板语言：`auto`（跟随 Claude Code 语言设置，再跟随系统）/ en / zh | `en` |
| `coreName` | 地图中心圆圈显示的文字，最多 10 个字符 | `CLAUDE` |
| `theme` / `background` | 地图配色（auto / dark / light）与背景（solid / transparent）；`colors` 可按 `name=#rrggbb` 自定义单个颜色 | `auto` / `transparent` |
| `layout` / `motion` / `textSize` | 地图布局（你在上或在下）、动效（`reduced` 关闭飞行与旋转）、下方文字行字号 | `you-bottom` / `full` / `footnote` |
| `terminalView` / `cellShape` | 在终端中的显示方式：`text` / `picture`（kitty、Ghostty 等）/ `braille`（盲文点阵） | `picture` / `2.4` |
| `memoryServers` / `memoryCommands` / `memorySubcommands` / `memoryPaths` / `memoryLabels` | 哪些 MCP 服务器、命令、路径算作"记忆"，用来点亮地图上的记忆站点 | `memory` |
| `hookRecords` / `hookReasons` | 钩子产生的 `[#123]` 编号记录是否显示在记忆站点；是否显示钩子拒绝的原因（默认只显示哪个工具被拦，避免泄露钩子读到的内容） | 关 |
| `subagentNames` / `contextCost` | 行内显示子代理名称；显示每次调用让上下文增长的估算令牌数 | 关 |
| `autoOpen` | `savvy`：savvy-flow 启动时自动打开面板；`any`：任意子代理启动都打开 | `any` |
| `exploreModel` / `generalModel` | 子代理模型路由的持久化选项，与 `/agent-routing` 等效 | `haiku` / `sonnet` |

---

## 项目结构

```
.claude-plugin/
  plugin.json          插件清单与全部配置项
  marketplace.json     单插件 marketplace
hooks/
  register.tsx         入口：把三部分的钩子串成链，绘制 Dock 面板与输入框上方一行
  dock.ts              Dock 面板的开合与区块状态（crew / agents）
  crab/                crab-cam：螃蟹场景、活动识别、子代理小组、用量仪表
  lot/                 lot-map：站点分类、地图绘制、盲文 / 图片终端渲染、调用记录
  savvy/               savvy-progress：会话面板、费用估算、进度条、子代理路由
  *.test.ts(x)         测试
types/index.d.ts       共享类型
```

三个目录各自保持上游的结构，方便以后对照上游更新合并。

---

## 开发

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .          # 编辑时热加载
```

已安装的副本按版本号缓存：改动后需要把 `.claude-plugin/plugin.json` 的 `version` 加一，再运行 `claude plugin update side-dock-claude@side-dock-claude` 才会生效。

---

## 来源与许可 / Credits and licence

本 mod 改编自三个 MIT 许可的开源 mod，感谢原作者：

| 部分 | 上游 | 作者 |
| --- | --- | --- |
| crab-cam 0.4.0 → `hooks/crab` | [sTomerG/agent-kit](https://github.com/sTomerG/agent-kit) | Tomer Gabay |
| lot-map → `hooks/lot` | [alexeyw/lot-map](https://github.com/alexeyw/lot-map) | Aleksei Volodin |
| savvy-progress 1.2.0-sgs → `hooks/savvy` | [Phalegethon/sgs-kit](https://github.com/Phalegethon/sgs-kit)（fork 自 [johnnyvizz/claude-kit](https://github.com/johnnyvizz/claude-kit)） | Gürkan Süerdem、johnnyvizz |

各上游的许可全文保留为 `LICENSE.crab-cam`、`LICENSE.lot-map`、`LICENSE.savvy-progress`，核对详情见 [THIRD_PARTY.md](THIRD_PARTY.md)，改动清单见 [CHANGELOG.md](CHANGELOG.md)。合并后的整体及上述改动同样以 MIT 发布（[LICENSE](LICENSE)）。原作者不为本项目背书。
