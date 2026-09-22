# Contributing

## Before starting

Read the applicable phase specification in `docs/` and the development guides
in `docs/development/`. Work on one approved phase or bounded feature at a time.

## Branch and pull request flow

1. Start from an up-to-date `main` branch.
2. Create the phase or feature branch described in
   `docs/development/branch-and-pr-workflow.md`.
3. Run `pnpm check` and any relevant Docker checks locally.
4. Open a pull request using the repository template.
5. Resolve review conversations and wait for every required CI check.
6. Squash merge after review, then remove the merged branch.

Do not commit secrets, production credentials, `.env` files, or local database
data. Update the relevant `.env.example` and documentation when adding an
environment variable.

## Pull request expectations

Pull requests explain the purpose, phase, scope, environment or database
changes, security impact, tests, manual verification, screenshots for UI
changes, and known limitations. Keep changes focused so each phase can be
reviewed and reverted independently.
