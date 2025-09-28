# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - Initial MVP scaffold
- Project configuration (TypeScript, ESLint, Prettier, tsup)
- Minimal src structure and public types
- No-op tick service and Engine facade
- Vitest setup with basic tests
- Docs scaffolding

## [0.1.1] - MVP features complete and pricing refactor
- Core features implemented: resources, generators (resource & item outputs), items/inventory, upgrades/modifiers
- Deterministic tick with modifier ordering (add → mult), item production support
- Persistence with versioned schema, Zod validation, offline progress helpers
- Events + EventBus with controller operations: buyGenerators, applyUpgrade, add/consume items, stepWithEvents
- Bulk-buy math (1/10/100/max) and number formatting utility
- Tasks/Quests system with evaluate/claim services
- Loop adapter: fixed-step with backpressure
- Generator pricing moved into registry (`GeneratorDefinition.pricing`); `Engine.buyGenerators` args simplified
- README expanded; API docs regenerated

## [0.2.0] - Controllers/Services split, single-touchpoint Game (breaking)
- Introduced controller/service architecture split:
  - Controllers (stateful): Game, TickRunner, Economy, InventoryManager, TaskManager.
  - Services (pure): TickService, InventoryService, TaskService.
- Event bus consolidated into `core/EventBus.ts` with `InMemoryEventBus` class + factory.
- Added `BaseSubsystem` for controller cohesion.
- Added `Game` single-touchpoint forwards (step/buy/apply/add/consume/claim).
- Removed legacy service adapters: `service/tick`, `service/tickEvents`, `service/inventory`, `service/generators`, `service/upgrades`, `service/tasks`.
- Removed top-level shims `tick`, `inventory`, `evaluateTasks/claimTask` in favor of services/controllers.
- Migration: use `TickService`, `InventoryService`, `TaskService`, or `Game`.
  - Removed `Engine` facade; use `Game` or `TickRunner` directly.
  - `createFixedStepLoop` now accepts any object with `stepWithEvents(dt)` (e.g., `Game`).
