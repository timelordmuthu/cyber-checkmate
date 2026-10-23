# FE Baseline — FE3-0

_Generated: 2026-10-22 22:10 IST_

## Environment

| Item | Value |
|---|---|
| Node | v24.15.0 |
| npm | 12.1.0 |
| `.nvmrc` | `22` (created in repo root) |
| OS | Windows 11 (PowerShell) |
| Frontend path | `frontend/` (co-located with `backend/`) |

> [!NOTE] Node 24 exceeds the minimum `>=20.19` requirement. No version block.

## Test Results (`npm test -- --run`)

| File | Tests | Status |
|---|---|---|
| `src/__tests__/demo_pass.test.js` | 4 | ✅ passed |
| `src/__tests__/api.test.js` | 5 | ✅ passed |
| `src/__tests__/history.test.js` | 8 | ✅ passed |
| **Total** | **17** | **✅ all pass** |

Duration: 1.53 s

## Build Results (`npm run build`)

| Chunk | Raw | gzip |
|---|---|---|
| `dist/index.html` | 0.63 kB | 0.37 kB |
| `dist/assets/index-*.css` | 37.76 kB | 7.00 kB |
| `dist/assets/index-*.js` | 480.87 kB | **152.70 kB** |

> [!WARNING] Initial JS is **152.70 kB gzip** — within the 250 kB limit, but the FE PRD §12 spec requires ≤ 250 kB and recommends lazy-loading History, Radar, Settings, Golden Hour, Console, and WebGL components. Currently all pages are eager-loaded (see Gap h below).

Build time: 939 ms. No errors.

## Existing Package Inventory

```
Dependencies (production):
  @tailwindcss/vite  4.3.3
  motion             12.43.0
  react              19.3.1
  react-dom          19.3.1
  react-router-dom   7.18.4
  tailwindcss        4.3.3

devDependencies:
  @types/react       19.3.0
  @types/react-dom   19.3.0
  @vitejs/plugin-react 6.1.2
  oxlint             1.88.0
  vite               8.3.4
  vitest             5.0.5
```

**Missing required packages** (per FE PRD §9):
- `@hugeicons/react` + `@hugeicons/core-free-icons` — icon set
- `ajv` + `ajv-formats` — contract validation (dev)
- `@playwright/test` — e2e tests (dev)
- `@fontsource/*` — Indian-script fonts (Noto Sans Devanagari, Tamil, Telugu, etc.)
- jsdom — Vitest environment (may be brought in by vitest but not explicit)

## Git Status

- **Not a git repository.** (`git init` not yet run)
- No `.gitignore` at repo root (INTEGRATION.md Step 0.1 requires one)
- Repo is a plain folder; the INTEGRATION.md two-laptop join workflow has not been started.

## Ready-for-FE3-1 Verdict

✅ The baseline compiles and all 17 tests pass.  
⚠️ Several structural gaps must be addressed before the FE3 sprint closes (see `FE_SETUP_ANALYSIS.md`).
