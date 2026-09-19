# Project Instructions

## Goal

Migrate Mortgage Payoff Lab to React with Vite and JavaScript,
preserving existing behavior and appearance.

## Scope

- Work on the react-migration branch.
- Complete only the requested migration step.
- Keep calculations entirely client-side.
- Reuse the existing CSS.
- Keep mortgage mathematics independent of React.
- Preserve static SEO and educational content.
- Keep /privacy.html working.

## Restrictions

- Do not push, merge, deploy, or change DNS.
- Do not add a backend, database, analytics, or user accounts.
- Do not introduce TypeScript, routing, or a styling framework.
- Do not rewrite unrelated code.
- Do not silently change calculation semantics or rounding.
- Do not use destructive Git commands.
- Do not delete original implementation files before parity checks.

## React Guidelines

- Use function components and hooks.
- Use React state for calculator inputs.
- Derive calculated results from inputs.
- Do not store redundant calculated values in state.
- Do not directly mutate React-managed DOM.
- Clean up timers and chart resources.
- Handle blank and partially entered numeric values.

## Verification

- Run relevant tests and the production build.
- Report actual command results.
- Separate automated checks from manual checks.
- Update MIGRATION_STATUS.md after each step.
