# Repo Instructions

## Package Manager

- Use Bun for all dependency and script operations in this repository.
- Do not use pnpm or npm commands here.
- Use:
  - `bun install` for install/update
  - `bun add` / `bun add -d` for dependencies
  - `bun run <script>` for scripts

## UI Framework

- Use DaisyUI components and patterns for UI implementation and styling.
- Prefer DaisyUI classes (`btn`, `input`, `select`, `card`, `join`, etc.) over custom one-off styling where an equivalent DaisyUI pattern exists.
- Keep visual states (active, hover, focus, disabled) aligned with DaisyUI defaults to preserve theme consistency.
