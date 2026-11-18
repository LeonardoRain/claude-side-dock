# Changelog

## 0.2.14
- The band is counted at 8.9 px per column and the Pixel bar's right-hand time slot is narrower (92 → 76 px), so the bar's track and the rows run closer to the right edge.

## 0.2.14
- The work map is easier to read: the spokes, the contour rings and the node rims are clearer on the dark palette, the glyphs and the station names are a little bigger, and the core has a hairline ring inside. Nothing else about it changed.

## 0.2.13
- The stats row and the Pixel bar under the crab now run to the right edge of the band, under the crew's fan, instead of stopping about a tenth short: the band is counted at 8.5 px per column, and the rows' boxes take the full width.

## 0.2.12
- With the language set to Chinese (`agentsLanguage` zh, or auto resolving to zh), the line above the crab ("Claude is thinking" and the rest) and the "Watch crew" button are in Chinese too.

## 0.2.11
- Chinese labels no longer overlap their values on the band and in the cost legend: text width now counts a CJK character as a full em.

## 0.2.10
- Settings descriptions shortened, and each now puts the English and the Chinese on separate lines.

## 0.2.9
- Prices now have one box per family: `priceFable`, `priceOpus`, `priceSonnet`, `priceHaiku`, each written `input/output/cacheRead/cacheWrite` (e.g. `28/140/1.4/35`), with `, promptTokens>prices` for a longer-prompt tier. A filled box replaces every default price of that family. `modelPrices` stays for pricing an exact model name.

## 0.2.8
- New options `currency` (`USD` or `CNY`) and `modelPrices` for what the panel's cost is counted in. Prices are per million tokens in the chosen currency, one line per model (`opus-5-5=4/20/0.2/5`, with `model>promptTokens=` for prompt-length tiers). Without your own prices the defaults are Anthropic's list prices in USD (checked 2026-11-18); CNY turns them at a fixed 7 ¥ per $. The panel's `$`/`¥` symbol follows the option.
- The price table moved out of `savvy/register.tsx` into `savvy/pricing.ts`. Its default changed from the old ¥ example table to the official USD list, and the default currency is now USD (it was always ¥ before): set `currency` to `CNY` to keep ¥.
- A saved session's cost is converted when the currency changes; an entry saved before this version counts as ¥.

## 0.2.7
- The Pixel bar's finished rows (Done) now stay up until the next message you send, instead of fading after 20 s to 2 min; the next message clears them.
- An MCP tool name on the activity row drops its server prefix even when the server name has an underscore (`mcp__ccd_turn__update_plan` now shows as `update_plan`).

## 0.2.6
- Ported claude-deck's Pixel plan bar (desktop only) to the band above the prompt, under the stats row. It collects its own work, as claude-deck does: todo lists, task tools, approved plans, subagents (as strips) and a plain activity row, so it shows in every session, not only while a savvy flow runs. It replaces the savvy flow's own progress bar there; the Session panel and the stats row stay. The model-route row is not ported. See `LICENSE.claude-deck` and `THIRD_PARTY.md`.

## 0.2.5
- Defaults now match the author's setup: `background` transparent, `layout` you-bottom, `terminalView` picture, `autoOpen` any, `exploreModel` haiku, `generalModel` sonnet.

## 0.2.4
- Renamed the plugin from `side-dock` to `side-dock-claude` (a plugin name may not start with `claude-`): tools are now `mcp__side-dock-claude__progress` and `mcp__side-dock-claude__step`, and options and saved state live under `side-dock-claude`. Install it as `side-dock-claude@side-dock-claude`; settings kept under the old id are not carried over. The repository is renamed to `side-dock-claude` too.

## 0.2.3
- Session cost survives a restart: totals are saved per session in `$.store` and restored on start; entries of deleted sessions are pruned on the next start.
- Session cards scale to the pane's full width (no blank strip on the right).
