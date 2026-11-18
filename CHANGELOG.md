# Changelog

## 0.2.3
- Session cost survives a restart: totals are saved per session in `$.store` and restored on start; entries of deleted sessions are pruned on the next start.
- Session cards scale to the pane's full width (no blank strip on the right).
