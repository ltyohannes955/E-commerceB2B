# Phase 3 implementation notes

Apply the Phase 3 migration with `pnpm db:migrate` after PostgreSQL is running. The existing `pnpm db:seed` command remains responsible for the administrator and optional catalog fixtures; Phase 3 integration tests create customers, carts, RFQs, and quotations in their own setup.

Customers must sign in before using `/cart`, `/request-quote`, `/account/rfqs`, or `/account/quotes`. Administrators use `/admin/rfqs` and `/admin/quotes`. A quote draft is editable until it is sent. Sent quotations are immutable; revisions create a new draft revision. Customer acceptance closes the RFQ and prepares it for Phase 4 checkout.

Email delivery is durable through `EmailOutbox`. `EMAIL_TRANSPORT=console` is the local default and logs delivery while marking the outbox record sent. SMTP configuration is documented in `.env.example`; delivery failures remain recorded for retry.
