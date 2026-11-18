# CLAUDE.md — side-dock-claude

## 改完 mod 必须同步升版本号

每次修改本 mod（`hooks/`、`types/`、`.claude-plugin/` 下影响行为或配置的内容）后，**同一次改动里**同步更新 `.claude-plugin/plugin.json` 的 `version`，并在 `CHANGELOG.md` 顶部加一条对应记录。

- 原因：已安装的副本按版本号缓存，版本号不变，`claude plugin update` 不会拉到新代码，改动不会生效。
- 默认递增补丁号（0.2.3 → 0.2.4）；新增功能或不兼容改动再递增次版本号。
- 只改 README、LICENSE、THIRD_PARTY.md 等不影响运行的文档时，可以不升。
- 升完版本后，生效流程是：`claude plugin update <插件名>@<marketplace 名>`，重启 Claude。
