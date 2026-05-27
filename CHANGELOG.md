# Changelog

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
