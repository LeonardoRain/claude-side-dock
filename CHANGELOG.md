# Changelog

## 0.2.4
- Renamed the plugin from `side-dock` to `side-dock-claude` (a plugin name may not start with `claude-`): tools are now `mcp__side-dock-claude__progress` and `mcp__side-dock-claude__step`, and options and saved state live under `side-dock-claude`. Install it as `side-dock-claude@side-dock-claude`; settings kept under the old id are not carried over. The repository is renamed to `side-dock-claude` too.

## 0.2.3
- Session cost survives a restart: totals are saved per session in `$.store` and restored on start; entries of deleted sessions are pruned on the next start.
- Session cards scale to the pane's full width (no blank strip on the right).
