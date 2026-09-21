# Phase 1 — Foundation, Authentication, and Users

## Goal

Establish the application foundation and allow customers to create simple accounts. This phase does not include products, catalog browsing, RFQs, carts, orders, or payments.

## 1. Database foundation

Add PostgreSQL and Prisma to the NestJS backend.

Initial database models:

- `User`
- `Session`
- `PasswordResetToken`
- `AuditLog`

The `User` model contains:

- ID
- Full name
- Email
- Optional phone number
- Password hash
- Role: `CUSTOMER` or `ADMIN`
- Status: `ACTIVE` or `SUSPENDED`
- Last login time
- Created and updated timestamps

There are no company, organization, TIN, license, or business-verification models in this phase.

## 2. Customer authentication

Users can:

- Sign up
- Log in
- Stay logged in securely
- Log out
- View their profile
- Update their name, email, and phone
- Change their password
- Request a password reset
- Reset their password using a temporary secure link

Signup fields:

- Full name
- Email
- Password
- Confirm password
- Acceptance of the terms and privacy policy

Phone number is optional and can be added from the profile.

## 3. Authentication security

The backend provides:

- Secure password hashing
- Short-lived access tokens
- Rotating refresh sessions
- HTTP-only authentication cookies
- Input validation
- Login and signup rate limiting
- Generic invalid-login messages
- Session invalidation on logout or password change
- Protection against suspended users
- Helmet, controlled CORS, and secure production cookie settings
- Logging that excludes passwords, tokens, and sensitive user information

Email verification is postponed. Users become active immediately after signup.

## 4. Customer frontend

Create these pages:

- `/sign-up`
- `/login`
- `/forgot-password`
- `/reset-password`
- `/account/profile`
- `/account/security`

Add the basic public storefront shell:

- Header
- Logo placeholder
- Navigation placeholder
- Login and signup actions
- Customer account menu
- Footer

The storefront remains visually simple while establishing the responsive layout for future catalog pages.

### UI quality and responsive behavior

Phase 1 UI implementation and review must use `frontend-design` to establish the shared application design system. It must also use `design-taste-frontend` for the public storefront shell and other presentation-led customer surfaces. Authentication forms and the admin shell remain governed primarily by `frontend-design` because Taste does not cover multi-step product UI or dashboards.

- Define the platform’s visual direction, typography, color tokens, spacing, radii, shadows, motion, and reusable form patterns.
- Record a one-line design read and explicit design-variance, motion-intensity, and visual-density choices for the public storefront before implementation.
- Use a mobile-first authentication layout that works comfortably at 360px and scales cleanly to desktop.
- Keep signup, login, password reset, profile, and security forms focused, clearly labeled, keyboard accessible, and easy to complete with touch input.
- Provide visible validation, password guidance, submission progress, success feedback, and recoverable error states without causing layout shifts.
- Make the storefront header collapse into an accessible mobile navigation pattern.
- Make the admin shell use a mobile drawer or compact navigation and a desktop sidebar without duplicating navigation logic.
- Provide polished loading, empty, suspended-account, unauthorized, and session-expired states.
- Meet the shared responsive and WCAG 2.2 AA requirements in the roadmap.

## 5. Admin foundation

Create a protected `/admin` area with:

- Admin layout and navigation
- Empty dashboard overview
- User list
- User search
- User details
- Activate or suspend customer controls
- Basic audit history

Customers cannot access admin pages or admin API endpoints.

The first administrator is created through a database seed command using environment variables. Public signup always creates a `CUSTOMER`; the backend never accepts a public role selection.

## 6. Backend endpoints

```text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/reset-password

GET    /users/me
PATCH  /users/me
PATCH  /users/me/password

GET    /admin/users
GET    /admin/users/:id
PATCH  /admin/users/:id/status

GET    /health
```

## 7. Development infrastructure

Phase 1 builds on the Docker, CI, and PostgreSQL service established in Phase 0. It adds:

- Prisma migrations
- Admin seed command
- Environment-variable validation
- `.env.example`
- Swagger/OpenAPI documentation
- Consistent API errors
- Basic structured logging
- Backend unit and integration tests
- Frontend authentication tests
- Root commands for database migration, seeding, and testing

## 8. Acceptance criteria

Phase 1 is complete when:

- A new customer can sign up and log in.
- Duplicate emails are rejected safely.
- Authentication survives a page refresh.
- A customer can update their profile and password.
- Logout invalidates the current session.
- Password reset tokens expire and cannot be reused.
- A suspended user can no longer authenticate.
- An administrator can view and suspend customers.
- Customers cannot access admin functionality.
- Authentication, account, and admin-user screens pass responsive checks at the shared target widths with no clipped content or horizontal scrolling.
- Forms are keyboard and screen-reader usable, have visible focus states, and meet the shared accessibility requirements.
- The database can be recreated from migrations and seed data.
- Builds, linting, unit tests, and integration tests pass.

## Not included

- Company registration
- Product management
- Catalog browsing
- Prices or pricing modes
- Cart and checkout
- RFQs and quotations
- Orders
- Payments
- Shipping and import tracking
- Business-document verification
- Email verification
- Social login
- SMS or OTP authentication
