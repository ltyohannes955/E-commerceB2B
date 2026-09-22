# Phase 4 — Checkout, Orders, and Payments

## Goal

Convert direct-purchase carts and accepted quotations into orders, collect delivery details, support flexible payment plans, and maintain a complete auditable financial history for every customer. Payment verification is manual initially, with an interface for future bank or payment-provider verification.

## 1. Order sources

An order originates from:

- `DIRECT_CHECKOUT` — created from the shopping cart
- `ACCEPTED_QUOTE` — created from an accepted quotation

Both use the same order structure and retain an immutable source reference.

## 2. Models

Add:

- `Address`
- `DeliveryZone`
- `Order`
- `OrderItem`
- `OrderAdjustment`
- `OrderStatusHistory`
- `PaymentPlanTemplate`
- `OrderPaymentPlan`
- `PaymentInstallment`
- `Payment`
- `PaymentAllocation`
- `PaymentProof`
- `FinancialLedgerEntry`
- `FinancingApplication`
- `Refund`

Every order belongs directly to a customer user. There is no company registration.

## 3. Delivery addresses

Customers can create and save addresses containing:

- Address label
- Recipient name
- Phone number
- Region
- City
- Sub-city
- Woreda
- Street or area description
- Landmark
- Optional delivery instructions

The selected address is copied into the order as an immutable snapshot.

## 4. Checkout flows

### Direct-purchase checkout

1. Review cart items.
2. Revalidate products, variants, quantities, availability, and prices.
3. Select or create a delivery address.
4. Select pickup or delivery.
5. Calculate delivery cost.
6. Select an eligible payment plan.
7. Review and accept the final breakdown and terms.
8. Create the order using an idempotency key.
9. Display the first payment requirement and instructions.

### Accepted-quotation checkout

1. Open the accepted quotation.
2. Confirm its locked commercial terms.
3. Select or create a delivery address.
4. Select pickup or delivery.
5. Add any applicable delivery charge.
6. Confirm the quotation’s payment plan or an admin-approved alternative.
7. Create the order using an idempotency key.
8. Display payment requirements.

An accepted quotation can create only one order. Its line prices are never recalculated from the catalog.

## 5. Delivery options

Initial delivery methods:

- Free pickup from a configured platform location
- Local delivery using admin-configured delivery zones
- Manual “contact customer” handling outside configured zones

A delivery zone contains a name, supported city or area, fee, estimated delivery time, and active status. Local delivery remains a separate order charge.

## 6. Order snapshots and totals

Order items store immutable snapshots of product ID, variant ID, product name, variant description, SKU, image reference, quantity, unit price, applied tier or discount, line subtotal, and sale mode.

Order totals include:

- Item subtotal
- Discounts
- Quotation adjustments
- Delivery charge
- Configured taxes or fees
- Grand total
- Financing charges
- Total payable
- Verified amount paid
- Remaining balance

Future catalog or address changes never modify an existing order.

## 7. Order statuses

- `PENDING_PAYMENT`
- `PAYMENT_SUBMITTED`
- `CONFIRMED`
- `PROCESSING`
- `READY_FOR_FULFILLMENT`
- `COMPLETED`
- `CANCELLED`

Payment status is tracked separately:

- `UNPAID`
- `PARTIALLY_PAID`
- `PAID`
- `REFUND_PENDING`
- `PARTIALLY_REFUNDED`
- `REFUNDED`

Every transition records the actor, previous status, new status, timestamp, and optional reason.

## 8. Payment options

Administrators can enable or disable:

- `PAY_IN_FULL`
- `DEPOSIT_BEFORE_DELIVERY`
- `DEPOSIT_AND_PAY_ON_DELIVERY`
- `INSTALLMENT_PLAN`
- `FINANCING`
- `CUSTOM_SCHEDULE`

Options are configured globally and may be overridden by a quotation or order.

## 9. Payment-plan templates

Reusable templates configure:

- Name and payment type
- Deposit percentage or fixed amount
- Number of installments
- Installment frequency
- Optional grace period
- Optional interest or service fee
- Minimum and maximum order value
- Whether admin approval is required
- Amount required before processing
- Amount required before delivery
- Active status

Examples include 30% deposit plus 70% on delivery, three monthly installments, and six-month financing with a down payment.

## 10. Order payment plans

`OrderPaymentPlan` stores the accepted agreement:

- Payment-plan type
- Original order total
- Deposit amount
- Financed amount
- Interest or service fee
- Total amount payable
- Required amount before processing
- Required amount before delivery
- Number of installments
- Start and final due dates
- Approval status
- Creating administrator
- Customer acceptance timestamp

An accepted plan cannot be silently edited. Changes require a recorded revision or auditable adjustment.

## 11. Installment schedules

Each `PaymentInstallment` stores:

- Sequence number
- Description
- Amount due
- Amount paid
- Due date
- Paid date
- Optional delivery-related trigger
- Status

Statuses:

- `UPCOMING`
- `DUE`
- `PARTIALLY_PAID`
- `PAID`
- `OVERDUE`
- `WAIVED`
- `CANCELLED`

## 12. Payments and allocation

A verified payment may cover one installment, part of an installment, multiple installments, a deposit, an order balance, or a financing fee.

`PaymentAllocation` records the exact destination of every portion. Allocation prioritizes overdue required installments unless an administrator explicitly selects another allocation.

Only verified payments affect balances or installment statuses.

## 13. Customer financial ledger

Every financial event creates an immutable `FinancialLedgerEntry`:

- `ORDER_CHARGE`
- `FINANCING_CHARGE`
- `PAYMENT`
- `REFUND`
- `CREDIT`
- `DISCOUNT`
- `ADMIN_ADJUSTMENT`
- `REVERSAL`

Verified records are never rewritten or deleted. Corrections create a reversal followed by a corrected entry. All monetary fields use database decimal values.

## 14. Manual payment verification

Initial manual payment methods:

- Bank transfer
- Cash deposit
- Cash payment
- Mobile payment
- Other manual method

Customer submissions include amount, method, transaction reference, payment date, bank or provider, proof document, and optional note.

Administrators can place a payment under review, verify the submitted or corrected amount, reject it with a reason, allocate it to installments, record an offline payment, and reverse an incorrect verification through ledger entries.

Payment verification statuses:

- `SUBMITTED`
- `UNDER_REVIEW`
- `VERIFIED`
- `REJECTED`
- `REFUNDED`

## 15. Payment-proof storage

Payment proofs use the temporary database-backed storage abstraction established for product images.

- JPEG, PNG, WebP, and PDF
- Maximum 3 MB per file
- Real file-type validation
- Base64 data stored with metadata
- Base64 omitted from normal API responses
- Protected binary retrieval endpoint
- Access restricted to the owning customer and administrators

Production can replace the implementation with object storage without changing payment logic.

## 16. Processing and delivery gates

- Full payment: processing begins after the full required amount is verified.
- Deposit plan: processing begins after the deposit is verified.
- Pay on delivery: delivery is allowed after the required deposit; completion requires the remaining payment.
- Installments: processing and delivery follow configured payment thresholds.
- Financing: processing begins after approval and any required down payment.

An order cannot be completed with a required unpaid balance unless an administrator records an approved financing arrangement.

## 17. Financing

Customers can request financing with a requested amount, preferred down payment, preferred repayment period, and optional note.

Administrators can approve or reject the request, choose the provider type, set principal and fees, define installments, record an agreement reference, add agreement details, and activate the plan.

Provider types:

- `INTERNAL_CREDIT`
- `EXTERNAL_LENDER`
- `OTHER`

Phase 4 supports manually managed financing records and schedules, not automated underwriting or credit scoring. Production lending requires appropriate identity verification, agreements, and regulatory review.

## 18. Future automatic verification

Define a `PaymentVerificationProvider` interface.

Initial implementation:

```text
ManualPaymentVerificationProvider
```

Future implementations may include bank APIs, payment gateways, and mobile-money verification.

Payment records support an external transaction ID, provider name, provider status, provider verification timestamp, idempotency key, provider response reference, and webhook-event history from the start.

## 19. Admin financial history

Every admin customer-details page includes:

- Total order value
- Total verified payments
- Payments awaiting verification
- Outstanding balance
- Overdue amount
- Upcoming payments
- Refund total
- Customer credit
- Active installment plans
- Active financing agreements
- Chronological financial ledger

Admins can filter history by order, payment status, method, due date, verification status, date range, and overdue status.

## 20. Cancellation and refunds

Customers can cancel orders while payment is pending or submitted but no payment has been verified. After verification, cancellation requires an administrator.

Cancellation records the actor, reason, timestamp, and refund requirement. Refunds are recorded as financial entries and linked to the original verified payments.

## 21. Customer pages

- `/checkout`
- `/checkout/quote/[quoteId]`
- `/checkout/success`
- `/account/orders`
- `/account/orders/[id]`
- `/account/addresses`
- `/account/payments`
- `/account/payment-plans`
- `/account/financing`

Customers can see orders, payment plans, installment schedules, verified and pending payments, remaining balances, and upcoming or overdue amounts.

### UI quality and responsive behavior

Phase 4 UI implementation and review must use `frontend-design` as the primary skill, with particular emphasis on trust, financial clarity, and safe confirmation actions. Use `design-taste-frontend` only for presentation-led customer surfaces that frame the commerce experience; do not apply it to checkout steps, payment schedules, financial tables, financing forms, or admin reconciliation workflows because those are outside Taste's intended scope.

- Checkout uses a clear mobile-first step flow with persistent progress, recoverable validation, and a final confirmation summary.
- Addresses, delivery options, payment plans, financing terms, and required amounts are written in plain language and never rely on color alone.
- Payment schedules use responsive timelines, cards, or lists rather than forcing wide tables on mobile.
- Amount paid, amount pending verification, amount remaining, upcoming installments, and overdue balances are visually distinct.
- Payment-proof upload shows allowed formats, size limits, progress, preview or filename, failure recovery, and privacy guidance.
- Destructive or financially significant actions require confirmation and clearly state their consequences.
- Admin financial tables adapt to responsive cards or expandable rows while preserving reconciliation detail.
- Loading, duplicate-checkout prevention, rejected payment, overdue installment, refund, empty history, and financing-review states are intentionally designed.
- Meet the shared responsive, accessibility, performance, and interaction requirements in the roadmap.

## 22. Admin pages

- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/payments`
- `/admin/payments/[id]`
- `/admin/payment-plans`
- `/admin/financing`
- `/admin/users/[id]/financials`
- `/admin/settings/bank-accounts`
- `/admin/settings/delivery-zones`

## 23. API surface

```text
GET    /addresses
POST   /addresses
PATCH  /addresses/:id
DELETE /addresses/:id

POST   /checkout/cart/preview
POST   /checkout/cart/confirm
POST   /checkout/quotes/:quoteId/preview
POST   /checkout/quotes/:quoteId/confirm

GET    /orders
GET    /orders/:id
POST   /orders/:id/cancel

GET    /orders/:id/payment-plan
GET    /orders/:id/payments
POST   /orders/:id/payments
GET    /payments/:id/proof

POST   /orders/:id/financing-request
GET    /financing-requests/:id

GET    /admin/orders
GET    /admin/orders/:id
PATCH  /admin/orders/:id/status
POST   /admin/orders/:id/cancel

GET    /admin/payments
GET    /admin/payments/:id
POST   /admin/payments/:id/verify
POST   /admin/payments/:id/reject
POST   /admin/payments/:id/reverse
POST   /admin/payments/:id/refund

GET    /admin/payment-plan-templates
POST   /admin/payment-plan-templates
PATCH  /admin/payment-plan-templates/:id
POST   /admin/orders/:id/payment-plan
POST   /admin/orders/:id/payment-plan/revise

GET    /admin/financing-requests
POST   /admin/financing-requests/:id/approve
POST   /admin/financing-requests/:id/reject

GET    /admin/users/:id/financials
GET    /admin/users/:id/ledger
```

## 24. Notifications

Notify customers when orders are created or changed, payment proofs are submitted, payments are verified or rejected, installments are upcoming or overdue, financing is approved or rejected, orders are cancelled, and refunds are recorded.

## 25. Acceptance criteria

Phase 4 is complete when:

- Direct carts and accepted quotations create orders exactly once.
- Checkout snapshots remain immutable.
- Admin can configure reusable payment plans.
- Full, deposit, delivery-balance, installment, financing, and custom plans work.
- Installment schedules and due statuses calculate correctly.
- Partial payments update the correct installments.
- One payment can be allocated across multiple installments.
- Only verified payments affect balances.
- Processing and delivery respect payment thresholds.
- Admin can see each customer’s paid, pending, outstanding, overdue, upcoming, refunded, and credited amounts.
- Corrections create reversals rather than rewriting financial history.
- Payment proofs are protected from unauthorized access.
- Future API verification can be introduced through the provider interface.
- Customers cannot access another customer’s orders or financial information.
- Checkout, orders, payment history, installment schedules, financing, proof upload, and admin reconciliation pass responsive checks at the shared target widths.
- Monetary totals and payment states remain understandable with keyboard navigation, screen readers, zoom, and reduced motion.
- Order, payment, financing, and ledger rules have automated coverage.

## Not included

- Automated payment verification
- Payment-gateway integration
- Automatic bank reconciliation
- Automated loan underwriting or credit scoring
- Supplier purchase orders
- Dubai warehouse receiving
- Shipment consolidation
- Customs processing
- International tracking
- Full warehouse inventory management
