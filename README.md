# claude-side-dock

A Claude Code (desktop app) mod that puts everything in one right-side **Dock** pane and one row above the prompt. 把 crab-cam、lot-map、savvy-progress 合在一起的右侧面板 mod。

Dock, top to bottom / 右侧面板从上到下：

1. **Session panel / 会话面板**: cost, context window, tokens, subagents. The **Details** button above the prompt (or `/agents-info`) folds it. 会话成本、上下文窗口、令牌、子代理。
2. **Work map / 工作地图**: tools and calls on a map; `/lot-map` opens the pane.
3. **Crab crew**: `/crab-cam crew`.

Above the prompt: the crab, then a stats row (Cost / Tokens / Context / Elapsed / Details), plus a progress row while savvy-flow runs. 输入框上方：螃蟹和统计行。

## Install / 安装

```
/plugin marketplace add LeonardoRain/claude-side-dock
/plugin install side-dock --marketplace claude-side-dock
```

Disable the original crab-cam, lot-map and savvy-progress mods first, or commands and drawings appear twice. 请先停用原来的三个 mod，否则命令和画面会重复。

The plugin id is `side-dock` (the repository is `claude-side-dock`); tools are `mcp__side-dock__progress` and `mcp__side-dock__step`.

## Features added on top of the originals

- State lives under the `side-dock` plugin; the three parts share one pane.
- Session cost is kept across restarts per session id (`$.store`, key `cost:<session id>`); entries whose transcript is gone are removed at the next start. Archiving cannot be detected by a mod, so archived sessions keep theirs.
- Cards fill the pane width.

## Development / 开发

The Dock is drawn by `hooks/register.tsx` from three sources: `hooks/crab`, `hooks/lot`, `hooks/savvy`.

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .          # hot reload while editing
```

Installed copies are cached by version: bump `version` in `.claude-plugin/plugin.json` and run `claude plugin update side-dock@claude-side-dock` for changes to take effect.

## Credits and licence / 来源与许可

Adapted from three MIT-licensed mods: [crab-cam](https://github.com/sTomerG/agent-kit) (Tomer Gabay), [lot-map](https://github.com/alexeyw/lot-map) (Aleksei Volodin) and savvy-progress ([sgs-kit](https://github.com/Phalegethon/sgs-kit) by Gürkan Süerdem, forked from [claude-kit](https://github.com/johnnyvizz/claude-kit) by johnnyvizz). Their licences are kept as `LICENSE.crab-cam`, `LICENSE.lot-map` and `LICENSE.savvy-progress`; details in `THIRD_PARTY.md`. The combination and the changes listed above are MIT too (`LICENSE`).
