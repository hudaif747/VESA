# Changelog

All notable changes to VESA are documented here, grouped by milestone date.

---

## 2026-04-22 — New UI Flow & Ingestion Lifecycle

### Added
- ArangoDB initialisation service for automated database and collection setup on first run
- Status and resumption logic: frontend and backend now track and recover sync state across sessions
- "Data source already exists" guard — frontend and backend both detect and handle duplicate source prefixes
- Navigation buttons in the application bar

### Changed
- Renamed the `/init` route to `/setup` across frontend and backend

---

## 2026-04-20 — Ingestion UI

### Added
- Ingestion UI flow: `HandshakeForm` component, `SyncControl` component, and full stepper-based Setup page
- `syncApi` RTK Query slice in the frontend with related types
- `react-router-dom` routing wired into the application root

### Fixed
- Backend sync orchestration now correctly surfaces upstream validation errors with their original status codes (e.g. 503)

---

## 2026-04-19 — IDataAdapter Simplification

### Changed
- `IDataAdapter` contract simplified and aligned across ingestion services
- AQL queries rewritten to support the simplified `IDataAdapter` structure and optimised for performance

---

## 2026-04-17 — Data Quality & Cleanup

### Added
- Regex filter in keyword mapping to strip keywords that are numeric or match internal PANGAEA metadata categories (param, method, author, etc.)
- Boolean flag in `GraphWriter` to control whether null min/max timestamps are permitted in the database

### Removed
- Response transformer files and all their dependencies from routes — transformation now happens entirely in proxies

---

## 2026-04-16 — Ingestion Pipeline

### Added
- Full ingestion pipeline: `SyncOrchestrator`, `PrefixingService`, `RelationExtractor`, `GraphWriter`
- `HandshakeValidator` — fetches exactly one record before committing to a full sync
- PANGAEA proxy (`pangaeaProxy.ts`) — OAI-PMH fetcher that maps records to `IDataAdapter`
- Route endpoints for `/sync/validate`, `/sync/start`, `/sync/status`, `/sync/stop`
- `initEmptyDb` endpoint to programmatically create the ArangoDB database and collections

### Removed
- Adapter-Registry model removed entirely — `VesaAdapter` is now the sole read interface for runtime queries

---

## 2026-04-14 — Architecture Restructuring

### Changed
- `ArangoAdapter` redesigned and renamed to `VesaAdapter` to generalise and decouple from the adapter-registry pattern
- Revised architecture document committed as the canonical design reference for the new ingestion-first model

---

## 2026-04-10 — First Working VESA Backend

### Added
- PANGAEA OAI-PMH harvester: fully working batch fetcher with pagination and resumption token support

### Changed
- AQL queries adjusted to target the new `VESAdb` ArangoDB database

### Removed
- Legacy adapter ID mapping removed — first fully working backend under the new architecture

---

## 2026-01-30 — Adapter-Registry Model *(superseded)*

### Added
- Major refactor introducing an Adapter-Registry model for data source abstraction
- `ArangoAdapter` and ID/type mapper for simulating API data from the local ArangoDB instance

> ⚠️ This model was later superseded by the Ingestion-First Knowledge Graph architecture (see 2026-04-14).

---

## 2025-03-19 — Docker Fix

### Fixed
- Docker build issue resolved; import file rewritten

---

## 2024-12-02 — Minor UI

### Changed
- Toggle legends button icon updated

---

## 2024-11-26 — Resizable Grid Layout

### Added
- Resizable and reorderable chart layout using `react-grid-layout`
- UI slice for global layout edit control and layout menu
- Grid settings menu in the application bar

---

## 2024-11-13 — Repository Housekeeping

### Added
- `.github` directory with issue and pull request templates

---

## 2024-10-30 — Health Check

### Added
- Backend `/health` endpoint and health check services

---

## 2024-10-23 — InfoCard & Chart Tooltips

### Added
- `InfoCard` component with per-chart descriptions sourced from data
- `ChartsPaper` converted to flippable cards that reveal chart info on the reverse side

---

## 2024-10-22 — Column Series Chart

### Added
- `ColumnSeriesChart` component as an alternative to the line series view

### Fixed
- Map point cluster zoom-out bug resolved
- `0` values in column series replaced with `null` to avoid misleading data points

---

## 2024-10-17 — amCharts Stability

### Fixed
- Downgraded amCharts to `5.9.11` — version `5.9.12` introduced a regression in initial map clustering

---

## 2024-10-15 — Map Chart Refactor

### Changed
- Clustered point series rebuilt against the latest amCharts API
- Map chart component reorganised into a cleaner module structure

---

## 2024-10-14 — Map & Navbar

### Added
- Tooltips on map control buttons
- Legend toggle added to the zoom control
- `PopoverComponent` for the restructured application navbar

### Changed
- Map legends are now enabled by default

---

## 2024-10-10 — Docker

### Added
- Initial Docker configuration and `docker-compose.yml` for the full application stack

---

## 2024-10-02 — Vite Migration

### Changed
- Frontend migrated from Create React App to Vite; import issues resolved

---

## 2024-08-29 — Project Initialisation

### Added
- Initial project setup and repository structure
