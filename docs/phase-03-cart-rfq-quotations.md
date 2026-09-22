# Phase 3 — Cart, RFQ, and Quotations

## Goal

Make product sales modes functional. Direct-purchase products use a shopping cart, while RFQ products use a quotation workflow. Checkout, orders, and payments are reserved for Phase 4.

## 1. Sales-mode rules

The backend is authoritative about which action is allowed.

| Sale mode         | Direct cart                     | RFQ |
| ----------------- | ------------------------------- | --- |
| `DIRECT_PURCHASE` | Yes                             | No  |
| `RFQ_ONLY`        | No                              | Yes |
| `HYBRID`          | Yes, within configured quantity | Yes |

For hybrid products:

- Quantities below the RFQ threshold can enter the cart.
- Quantities at or above the threshold require an RFQ.
- When `allowRfqAtAnyQuantity` is enabled, users may request a quote for smaller quantities.
- MOQ applies to both flows.
- Variant availability and product status are validated before either action.

If a cart quantity crosses the RFQ threshold, the update is rejected and the user is offered a “Move to RFQ” action. It never moves automatically without confirmation.

## 2. Shopping cart

Initial models:

- `Cart`
- `CartItem`

Each authenticated customer has one active cart.

Cart functionality:

- Add a product variant
- Update quantity
- Remove an item
- Clear the cart
- Display MOQ
- Apply quantity-tier pricing
- Show regular and discounted prices
- Display subtotal
- Identify unavailable or changed products
- Move an eligible item to the RFQ basket
- Preserve the cart between sessions

Users must sign in before adding items. There is no guest cart initially.

## 3. Cart pricing behavior

Cart prices are always recalculated by the backend.

The cart validates:

- Product is published.
- Variant exists and is available.
- Direct purchase is permitted.
- Quantity satisfies MOQ.
- Quantity does not exceed the direct-purchase limit.
- Applicable discount is active.
- Correct quantity tier is applied.

The cart does not lock prices. When a price changes, the customer sees the updated price and a clear notification. Prices become locked only when an order is created in Phase 4.

## 4. RFQ basket

The RFQ basket is separate from the normal cart.

Users can:

- Add RFQ-only and eligible hybrid products
- Select variants
- Enter requested quantities
- Add notes per item
- Add a general request message
- Remove items
- Save an RFQ as a draft
- Submit an RFQ
- Cancel an unquoted RFQ

Optional request information:

- Desired delivery timeframe
- Delivery city
- Preferred contact method
- Product customization notes

No company registration or business documents are required.

## 5. RFQ and quotation models

Initial models:

- `Rfq`
- `RfqItem`
- `Quote`
- `QuoteItem`
- `QuoteAdjustment`
- `QuoteStatusHistory`

RFQ statuses:

- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `QUOTED`
- `CANCELLED`
- `CLOSED`

Quotation statuses:

- `DRAFT`
- `SENT`
- `ACCEPTED`
- `DECLINED`
- `EXPIRED`
- `REPLACED`

## 6. Admin RFQ workflow

Administrators can:

1. View submitted RFQs.
2. Assign an RFQ to an administrator.
3. Mark it as under review.
4. Adjust requested quantities when necessary.
5. Enter quoted unit prices.
6. Add customer-visible charges or discounts.
7. Set estimated lead time.
8. Set payment terms.
9. Set quotation expiration.
10. Add customer-visible and internal notes.
11. Save a draft.
12. Send the quotation.
13. Create a revised quotation.

A sent quotation cannot be edited in place. Changes create a revision, and the previous quotation becomes `REPLACED`.

## 7. Quotation pricing

Each quotation contains:

- Quote number
- Customer
- Currency
- Line-item quantity
- Unit price
- Line subtotal
- Discounts
- Customer-visible shipping, import, and other charges
- Grand total
- Estimated lead time
- Payment terms
- Expiration date
- Customer notes
- Internal admin notes

Customers receive a clear breakdown of product totals, discounts, shipping/import charges, and other customer-facing fees. Internal supplier costs and platform margins are never returned by customer-facing APIs.

## 8. Customer quotation workflow

Customers can:

- View submitted RFQs and their statuses
- View received quotations and revisions
- Accept a quotation
- Decline a quotation with an optional reason
- Print or download the quotation
- Receive an email when a quote is sent or revised

Accepting a quotation locks its commercial terms. Phase 4 converts the accepted quotation into an order.

An accepted quote cannot be accepted again, edited, or replaced without an explicit administrative cancellation process.

## 9. Mixed product handling

Mixed selections are separated into:

```text
Ready to purchase
- Direct-purchase products
- Eligible hybrid products

Request a quotation
- RFQ-only products
- Hybrid products above the RFQ threshold
```

The customer continues with each group independently.

## 10. Customer pages

Create:

- `/cart`
- `/request-quote`
- `/account/rfqs`
- `/account/rfqs/[id]`
- `/account/quotes/[id]`

Product pages activate Add to Cart, Request Quote, or both according to the sales rules.

### UI quality and responsive behavior

Phase 3 UI implementation and review must use `frontend-design` as the primary skill for cart, RFQ, quotation, and admin workflows. Use `design-taste-frontend` only on customer-facing presentation areas surrounding those workflows, such as empty states or supporting product presentation, because carts, quote builders, data-heavy screens, and multi-step decisions are outside Taste's intended scope.

- Cart and RFQ items stack cleanly on mobile while keeping quantities, variants, MOQ warnings, price changes, and removal actions understandable.
- Mobile cart and RFQ screens use a non-obstructive sticky summary or primary action when helpful.
- Mixed direct-purchase and quotation groups are visually distinct and explain why an item belongs to each flow.
- Moving an item to RFQ, crossing a threshold, accepting a quote, and declining a quote require clear confirmation and feedback.
- Quote totals, revisions, expiration, adjustments, and status history remain readable on mobile without wide-table dependence.
- Admin RFQ and quote-builder screens prioritize efficient desktop work while retaining complete mobile access through responsive sections or cards.
- Loading, empty cart, expired quote, unavailable item, validation, and conflict states are intentionally designed.
- Meet the shared responsive, accessibility, performance, and interaction requirements in the roadmap.

## 11. Admin pages

Create:

- `/admin/rfqs`
- `/admin/rfqs/[id]`
- `/admin/quotes`
- `/admin/quotes/[id]`

Admin features include status and date filters, customer/reference search, assignment, quotation construction and revision, customer/internal notes, and complete status history.

## 12. API surface

```text
GET    /cart
POST   /cart/items
PATCH  /cart/items/:id
DELETE /cart/items/:id
DELETE /cart
POST   /cart/items/:id/move-to-rfq

GET    /rfqs
POST   /rfqs
GET    /rfqs/:id
PATCH  /rfqs/:id
POST   /rfqs/:id/submit
POST   /rfqs/:id/cancel

GET    /quotes/:id
POST   /quotes/:id/accept
POST   /quotes/:id/decline

GET    /admin/rfqs
GET    /admin/rfqs/:id
PATCH  /admin/rfqs/:id/status
PATCH  /admin/rfqs/:id/assignment

POST   /admin/rfqs/:id/quotes
GET    /admin/quotes/:id
PATCH  /admin/quotes/:id
POST   /admin/quotes/:id/send
POST   /admin/quotes/:id/revise
```

## 13. Acceptance criteria

Phase 3 is complete when:

- Direct-purchase products can enter the cart.
- RFQ-only products cannot enter the cart.
- Hybrid products follow their configured quantity rules.
- MOQ, tiers, discounts, and availability are enforced server-side.
- Invalid cart prices cannot be submitted from the browser.
- Users can prepare, save, submit, and cancel RFQs.
- Admin can review RFQs and send quotations.
- Sent quotations cannot be silently modified.
- Users can accept or decline valid quotations.
- Expired quotations cannot be accepted.
- Mixed product selections are clearly separated.
- Customers cannot access another customer’s cart, RFQs, or quotations.
- Internal costs and margins are never exposed.
- Cart, RFQ, quote revision, acceptance, and admin quote-builder journeys pass responsive checks at the shared target widths.
- Critical actions are keyboard accessible, touch friendly, and provide clear error, success, loading, and confirmation feedback.
- Cart and quotation rules are covered by automated tests.

## Not included

- Checkout
- Delivery-address selection
- Order creation
- Payment collection
- Refunds
- Supplier purchase orders
- Shipment tracking
- Customs workflows
- Reviews and wishlists
- Customer-uploaded RFQ attachments
