# E-commerce B2B Platform Roadmap

This directory contains the approved implementation specifications. Work proceeds in order, with one phase branch and pull request at a time. The `main` branch must remain stable between phases.

## Implementation order

1. [Phase 0 — Repository, Docker, CI, and PR Workflow](./phase-00-engineering-foundation.md)
2. [Phase 1 — Foundation, Authentication, and Users](./phase-01-foundation-authentication.md)
3. [Phase 2 — Catalog and Product Management](./phase-02-catalog-product-management.md)
4. [Phase 3 — Cart, RFQ, and Quotations](./phase-03-cart-rfq-quotations.md)
5. [Phase 4 — Checkout, Orders, and Payments](./phase-04-checkout-orders-payments.md)

## Delivery workflow

Each phase follows this sequence:

```text
Approved specification
        ↓
Dedicated phase branch
        ↓
Implementation and tests
        ↓
Pull request into main
        ↓
Required CI and Docker checks
        ↓
Review against acceptance criteria
        ↓
Squash merge
```

## UI quality standard for Phases 1–4

All customer and administrator UI work in Phases 1–4 must explicitly use the `frontend-design` skill during implementation and review. Customer-facing storefront, discovery, and product-presentation surfaces must also use the `design-taste-frontend` skill to establish a distinctive visual direction and avoid generic marketplace styling.

The skills have different responsibilities:

- `frontend-design` is the primary skill for the shared design system, authentication, application workflows, admin screens, data tables, RFQ tools, checkout, payments, accessibility, and responsive behavior.
- `design-taste-frontend` is a complementary skill for storefront and presentation-led surfaces such as the homepage, category landing experiences, promotional sections, and product storytelling.
- Do not force `design-taste-frontend` patterns onto dashboards, dense data, or multi-step forms because those surfaces are outside that skill's intended scope.

Before coding a phase, the implementer must record a one-line design read for applicable customer-facing surfaces, choose appropriate design variance, motion, and density levels, and extend the existing design system rather than creating disconnected screens. Any Taste pre-flight rule that conflicts with a functional commerce workflow yields to usability, accessibility, and the primary `frontend-design` guidance.

Shared requirements:

- Mobile-first responsive implementation with no horizontal page scrolling
- Verified layouts at approximately 360px, 390px, 768px, 1024px, and 1440px widths
- Reusable tokens for color, typography, spacing, radii, shadows, and motion
- Reusable accessible components for forms, dialogs, navigation, tables, cards, feedback, and loading states
- WCAG 2.2 AA color contrast, keyboard operation, visible focus, semantic HTML, useful labels, and reduced-motion support
- Touch targets of at least 44×44px where practical
- Purposeful typography and visual hierarchy rather than generic dashboard styling
- Responsive navigation: mobile drawers or compact navigation and desktop layouts suited to larger screens
- Designed loading, empty, error, success, validation, and permission-denied states
- Skeletons or progress feedback for meaningful waits
- Responsive component tests and end-to-end coverage for critical user journeys
- Performance-conscious images, font loading, animation, and client-side JavaScript

UI acceptance is part of phase completion. A feature is not complete merely because its desktop happy path works.

## Release preparation

After Phase 4 is complete, release preparation adds production hosting, domain and HTTPS configuration, production secrets, database backups, monitoring, container-image publishing, deployment, and rollback procedures.

## Deferred capabilities

The initial release excludes supplier portals, marketplace sellers, Dubai warehouse workflows, supplier procurement, international freight, customs processing, and shipment tracking. These can be planned after the core platform is validated.
