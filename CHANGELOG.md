# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] - 2026-03-04

### Added
- Added `createSearchDataMatcher({ fields, filters })` helper export for the documented `searchData` integration pattern.
- Added `filterListingsBySearchData(listings, payload, config)` helper export for consumer-side search wiring.
- Added CI workflow coverage for test and CSS build verification.

### Changed
- Replaced the toolbar sort control with the shared `BPUISelect` path when the BPUI runtime is present, while keeping a native fallback for standalone usage.
- Removed duplicated inline reset styles and now apply `.bp-widget-reset` at the widget root.
- Bundled shared BPUI styles into the compiled package stylesheet.
- Upgraded local release/build tooling and test coverage around integration behavior.

## [1.0.1] - 2026-02-28

### Changed
- Added auto-release script
- Clean ups

## [1.0.0] - 2026-02-27

### Added
- Initial release of `bp-listings` package.
- Airbnb-style listings + map widget built with vanilla JavaScript and Leaflet.
