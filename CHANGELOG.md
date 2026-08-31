# Changelog

## v1.5.2 - 2026-08-31

### Fixed

- Wide chat mode had no visible effect: Claude's web app now wraps the chat column in an additional `[data-testid="chat-column"]` element with its own fixed `max-w-[50.5rem]` class, which constrained the width regardless of the inner `.max-w-3xl` overrides. The wide-mode width variable is now also applied to that wrapper

## v1.5.1 - 2026-08-30

### Fixed

- Mini view tooltip was clipped by the composer: Claude's web app now wraps the model selector area in an `overflow: hidden` element. The tooltip is rendered at the document root with fixed positioning (and clamped to the viewport) so it stays fully visible
- Mini view donuts and the status lamp were vertically misaligned with the model selector: they are now `vertical-align: middle` so they stay centered even when the surrounding element is a block box

## v1.5.0 - 2026-07-15

### Added

- Model-scoped weekly usage: when a model has its own weekly limit (e.g. Fable 5's weekly quota), it's now shown alongside the session/weekly/extra bars in all three display modes (Graph, Bar, Mini)

## v1.4.1 - 2026-07-15

### Fixed

- Mini usage display did not appear when the Fable 5 model was selected

## v1.4.0 - 2026-06-04

### Added

- Claude Status monitoring: fetches `claude.ai` status from the Anthropic status API.
- Status section added to the popup: always visible, shows current status with a colored indicator; active incident name displayed as a link

## v1.3.0 - 2026-05-29

### Added

- Mini view mode: embeds three small donut charts directly in the composer toolbar (left of the model selector); hover to see a tooltip with all usage details and a progress bar for each quota
- Three-way view mode toggle in the popup: Graph / Bar / Mini

### Changed

- Popup view mode buttons now show SVG icons only (no text labels)
- Section titles in the popup now include SVG icons (Chat Width, Sidebar, Usage, Language)

## v1.2.0 - 2026-05-26

### Added

- Sidebar width adjustment: drag the handle on the right edge of the sidebar to resize
- Enable/disable sidebar adjustment from the extension popup

## v1.1.4 - 2026-05-25

### Added

- Japanese and English UI for popup settings, usage overlay labels, and page notices

### Changed

- Weekly quota reset label now shows days remaining (e.g. `in 3 days` / `3日後`) instead of weekday name; shows “Soon” when the reset time has passed

## v1.1.3 - 2026-05-25

### Changed

- Chat width and usage display are now only active on chat pages (`/new`, `/chat/*`)
- Popup shows a notice message and hides the settings panel on non-chat pages

### Fixed

- Fixed display color when usage data is unavailable

## v1.1.2 - 2026-05-25

### Fixed

- Fixed behavior on logout and for free plan users

## v1.1.1 - 2026-05-25

### Changed

- Minor fixes

## v1.1.0 - 2026-05-25

### Added

- Donut chart view for usage display
- Toggle between bar and graph view from the popup

### Changed

- Default chat width changed to 1000px, range changed to 650–2000px
- Usage display background changed from transparent to opaque

## v1.0.2 - 2026-05-25

### Fixed

- Fixed a bug in popup settings

## v1.0.1 - 2026-05-25

### Changed

- Improved popup UI

## v1.0.0 - 2026-05-24

### Added

- Usage bar (5-hour session, weekly, and extra quota)
- Auto-refresh usage after Claude finishes responding
- Chat width adjustment (800–2000px)
- Popup UI (slider, number input, reset to default button)
- Pause monitoring on inactive tabs
