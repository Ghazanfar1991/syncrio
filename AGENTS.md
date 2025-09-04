# Repository Guidelines

## Project Structure & Module Organization
- `src/`: Bot source code organized by feature (e.g., `src/core/`, `src/adapters/`, `src/workflows/`).
- `tests/`: Unit/integration tests mirroring `src/` (e.g., `tests/adapters/...`).
- `scripts/`: Operational utilities (seeding, maintenance, one‑off jobs).
- `assets/`: Static samples/fixtures used by tests or local runs.
- `dist/`: Transpiled output for production (ignored in VCS).

## Build, Test, and Development Commands
- `npm i`: Install dependencies.
- `npm run dev`: Start local dev (watch/reload). Use `.env` for secrets.
- `npm run build`: Compile TypeScript to `dist/`.
- `npm test`: Run test suite once; add `-- --watch` for watch mode.
- `npm run lint` / `npm run format`: Lint/fix code with ESLint + Prettier.

Example: `npm run build && node dist/index.js`

## Coding Style & Naming Conventions
- Indentation: 2 spaces. Language: TypeScript preferred for new code.
- Naming: `camelCase` vars/functions; `PascalCase` classes/types; `kebab-case` files.
- Modules: group by domain (e.g., `src/adapters/twitter/…`). Export minimal public APIs via `index.ts`.
- Lint/format: Follow repo ESLint/Prettier configs; no unused exports; strict TS where practical.

## Testing Guidelines
- Framework: Jest. Place tests in `tests/` mirroring `src/` paths.
- Naming: `*.spec.ts` for unit, `*.int.spec.ts` for integration.
- Coverage: Aim ≥80% lines/branches for changed areas.
- Mocks: Prefer interface-driven mocks; avoid network calls; use fixtures in `assets/`.

Run: `npm test -- --watch` during development.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`). Imperative, ≤72-char subject.
- PRs: Clear description, scope limited, link issues, add before/after notes or logs for behavior changes, update docs/tests. Request review from relevant code owners.

## Security & Configuration Tips
- Config via environment variables (`.env`); never commit secrets. Provide `.env.example` for newcomers.
- Respect provider rate limits; centralize retries/backoff in `src/core/` utilities.
- Avoid logging PII; prefer structured logs with redaction.
- Update dependencies regularly (`npm audit fix`), and pin critical versions.

