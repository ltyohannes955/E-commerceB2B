# Branch and pull request workflow

Keep `main` stable. Implement each approved phase on its own branch:

```text
phase/00-engineering-foundation
phase/01-authentication
phase/02-catalog
phase/03-cart-rfq
phase/04-orders-payments
```

Use `feature/*` or `fix/*` branches for smaller scoped work. Create branches
from the latest `main`, run the local checks, push the branch, and open a pull
request into `main` with the repository template. Wait for all required checks,
resolve conversations, review the acceptance criteria, squash merge, and
delete the merged branch.

## Required GitHub settings

After the repository owner enables these settings, require a pull request,
require the `quality`, `unit-tests`, `integration-tests`, and `build` checks,
require branches to be up to date, require resolved
conversations, disallow force pushes and branch deletion, and allow squash
merges. The initial solo workflow does not require human approvals. Require
human approval when collaborators join.

GitHub branch protection is configured in repository settings and is not
changed by local commands in this project.
