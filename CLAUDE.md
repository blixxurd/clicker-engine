# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Idle Clicker Engine** (`@fidget/idle-engine`), a TypeScript-first, framework-agnostic engine for building incremental/idle/clicker games. It provides resources, generators with cost scaling, items, upgrades, tasks, persistence with offline progress, and an event system.

## Commands

```bash
# Build the library (uses tsup)
npm run build

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a single test file
npx vitest run tests/unit/bulk.test.ts

# Lint
npm run lint

# Type check
npm run typecheck

# Full check (lint + test + build + typecheck) - run after every change
npm run check

# Generate API documentation
npm run docs
```

## Architecture

The engine follows a **functional core, imperative shell** pattern with strict separation between stateful controllers and pure services.

### Controllers (src/controller/) - Stateful Orchestration
- **Game**: Main entry point facade composing all subsystems
- **Economy**: Handles purchases, upgrades, resource transactions
- **InventoryManager**: Item add/consume operations
- **TaskManager**: Task evaluation and claiming
- **TickRunner**: Game loop driver
- **PersistenceManager**: Save/load with offline progress
- **BaseSubsystem**: Base class providing access to StateAccessor/registries
- **StateAccessor**: Manages mutable game state

Controllers must extend BaseSubsystem, accept a StateAccessor, and delegate pure logic to services.

### Services (src/service/) - Pure Logic
- **TickService**: Core tick simulation (resource production, modifiers)
- **EconomyService**: Purchase logic, upgrades, resource transactions
- **InventoryService**: Inventory math and validation
- **TaskService**: Task requirement evaluation

Services are stateless, accept data, return data/events, and are deterministic (no Date/RNG/network).

### Other Key Directories
- **src/core/**: EventBus, math utilities (bulk buy), formatting, persistence
- **src/core/persistence/migration/**: Schema migration system for save file versioning
- **src/model/**: Type definitions for GameState, resources, generators, items, upgrades, tasks
- **src/types/**: Branded types (ResourceId, GeneratorId, Quantity, etc.)
- **src/repo/**: In-memory registry implementations
- **src/adapters/**: Loop adapters for game loop integration
- **src/errors/**: Typed error classes (no string throws)

### Schema Migrations (src/core/persistence/migration/)
When save schema changes are needed:
1. Create migration in `migrations/v1-to-v2.ts`
2. Register in `migrations/index.ts`
3. Update `CURRENT_SCHEMA_VERSION`
4. Update `serialize()` for new format

See `docs/ROADMAP.md` for detailed migration workflow.

## TypeScript Conventions

- Strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- Uses branded types for compile-time safety (ResourceId, GeneratorId, Quantity, etc.)
- Type assertions needed when creating definitions: `"gold" as ResourceId`
- API methods accept plain strings - no casting needed when calling
- No `any` in public exports; wrap unavoidable `any` with type-safe adapter
- Prefer readonly and immutable patterns; avoid mutation

## Adding Features

1. Outline the change plan (types, data flow, tests)
2. Modify/extend types first (src/types/, src/model/)
3. Implement pure Services (stateless, deterministic)
4. Add/adjust controller methods (stateful orchestration)
5. Ensure controllers extend BaseSubsystem and delegate logic to services
6. Add tests (services unit, controller integration)
7. Update docs (JSDoc, examples, CHANGELOG)

## Testing

- Coverage target ≥ 85%
- Deterministic tests only (seed RNG, no network, fake clocks)
- Given/When/Then naming style
- Tests in `tests/unit/` for unit tests, `tests/basic/` for integration

## Commit Style

Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`
