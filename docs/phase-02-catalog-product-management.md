# Phase 2 — Catalog and Product Management

## Goal

Allow administrators to create and publish products and allow customers to browse a complete public catalog. Cart, RFQ submission, quotations, and checkout are reserved for Phase 3.

## 1. Catalog structure

Initial models:

- `Category`
- `Brand`
- `Product`
- `ProductVariant`
- `ProductImage`
- `ProductSpecification`
- `PriceTier`

Categories support parent-child relationships for nested catalog navigation.

## 2. Product information

Each product contains:

- Name
- URL slug
- Short and full descriptions
- Category
- Optional brand
- Internal SKU
- Unit of measurement
- Country of origin
- Minimum order quantity
- Lead time
- Availability status
- Sale mode
- Price visibility
- Regular price
- Optional discount price
- Images
- Specifications
- Featured status
- Publication status
- SEO title and description
- Created and updated timestamps

Publication statuses:

- `DRAFT`
- `PUBLISHED`
- `ARCHIVED`

Only published products appear publicly.

## 3. Product variants

Products may have variants such as size, color, model, capacity, packaging, or material.

Each variant contains:

- SKU
- Attribute values
- Price adjustment or independent price
- Availability status
- Optional available quantity
- Optional image

Products without selectable variants receive an internal default variant so pricing and future cart behavior remain consistent.

## 4. Configurable sales modes

The administrator selects one sales mode per product.

### `DIRECT_PURCHASE`

- Price is visible.
- The product supports normal cart and checkout beginning in Phase 3.
- Minimum order quantity still applies.

### `RFQ_ONLY`

- Users must request a quote.
- The administrator can show or hide an indicative price.
- Normal checkout is not allowed.

### `HYBRID`

- Price is visible.
- Normal quantities can be purchased directly.
- Bulk or custom quantities can request a quote.
- The administrator configures the direct-purchase limit and RFQ threshold.

Additional pricing controls:

- `SHOW_PRICE` or `HIDE_PRICE`
- Regular selling price
- Optional discount price
- Discount start and end dates
- Quantity-based price tiers
- Optional “starting from” presentation
- Allow RFQ at any quantity
- Direct-purchase maximum quantity
- RFQ threshold

Direct-purchase products must have a visible price. RFQ-only products may show an indicative price or “Request price.”

The initial currency is ETB. A direct-purchase price represents the imported selling price and excludes local delivery, which will be calculated during checkout in Phase 3.

## 5. Availability

Products use these availability statuses:

- `IN_STOCK`
- `AVAILABLE_TO_ORDER`
- `PRE_ORDER`
- `OUT_OF_STOCK`
- `DISCONTINUED`

The administrator can also provide an estimated lead time, optional available quantity, and restock note. Warehouse movements and inventory reservations are postponed.

## 6. Customer storefront

Create these public pages:

- `/`
- `/products`
- `/products/[slug]`
- `/categories/[slug]`
- `/brands/[slug]`
- `/search`

The storefront includes:

- Featured products
- Category navigation
- Search
- Category, brand, price, availability, and sale-mode filters
- Price and newest-product sorting
- Pagination
- Responsive product cards
- Product image gallery
- Variant selection
- Specifications
- MOQ and lead-time display
- Pricing tiers
- Direct-purchase and RFQ labels

Product pages display the future action supported by the sales mode: Add to Cart, Request Quote, or both. These actions become functional in Phase 3.

### UI quality and responsive behavior

Phase 2 UI implementation and review must use `frontend-design` throughout and `design-taste-frontend` for customer-facing catalog discovery, category landing, product cards, galleries, and product storytelling. Admin catalog tables and editing workflows remain governed primarily by `frontend-design`. All surfaces extend the Phase 1 design system into a distinctive, trustworthy B2B marketplace experience.

- Product cards maintain readable pricing, MOQ, availability, and sales-mode hierarchy from narrow mobile screens through desktop grids.
- Apply the documented Taste design read and pre-flight review to presentation-led catalog surfaces without sacrificing pricing, MOQ, availability, accessibility, or purchasing clarity.
- Mobile filters and sorting use accessible drawers or sheets; desktop layouts may use persistent sidebars or toolbars.
- Product galleries support touch, keyboard navigation, useful alternative text, stable aspect ratios, and optimized loading.
- Variant, MOQ, price-tier, availability, and lead-time controls remain understandable without crowding small screens.
- Product pages use a mobile sticky action area when helpful, without hiding content or overlapping system controls.
- Admin catalog tables adapt to cards or compact rows on small screens; product editing uses responsive sections, tabs, or accordions.
- Draft, empty catalog, no-results, upload progress, upload failure, and unavailable-product states are intentionally designed.
- Meet the shared responsive, accessibility, performance, and interaction requirements in the roadmap.

## 7. Admin catalog management

The protected admin area receives:

- Category and brand management
- Product list and search
- Product creation, editing, and duplication
- Variant management
- Image upload and ordering
- Specification management
- Pricing and tier management
- Sale-mode configuration
- Draft preview
- Publish, unpublish, and archive controls
- Featured-product control

Products with incomplete required information cannot be published.

## 8. Temporary Base64 image storage

Product images are stored as Base64 in PostgreSQL during the initial development version.

`ProductImage` contains:

- ID
- Product ID
- Base64 data
- MIME type
- Original filename
- Byte size
- Alternative text
- Sort order
- Primary-image flag
- Created timestamp

Upload behavior:

1. Accept the uploaded file through a multipart request.
2. Validate its real file type and size.
3. Resize and compress the image.
4. Prefer WebP for the stored representation.
5. Convert the processed image to Base64 and store it with its metadata.

Temporary limits:

- JPEG, PNG, and WebP uploads only
- Maximum original upload size of 3 MB
- Maximum six images per product
- Large images are resized before storage

Normal product responses never contain the Base64 payload. They contain an image URL pointing to:

```text
GET /product-images/:id
```

The endpoint decodes the stored Base64 and returns binary image data with the correct content type and cache headers.

An `ImageStorageService` interface separates product logic from storage. Phase 2 provides a database-backed implementation; production can later replace it with S3-compatible object storage without rewriting catalog behavior.

## 9. API surface

```text
GET    /categories
GET    /categories/:slug
GET    /brands
GET    /brands/:slug
GET    /products
GET    /products/:slug
GET    /search
GET    /product-images/:id

GET    /admin/categories
POST   /admin/categories
PATCH  /admin/categories/:id
DELETE /admin/categories/:id

GET    /admin/brands
POST   /admin/brands
PATCH  /admin/brands/:id
DELETE /admin/brands/:id

GET    /admin/products
POST   /admin/products
GET    /admin/products/:id
PATCH  /admin/products/:id
POST   /admin/products/:id/duplicate
PATCH  /admin/products/:id/status
POST   /admin/products/:id/images
DELETE /admin/products/:id/images/:imageId
```

Public endpoints only return published records. Admin endpoints require the `ADMIN` role.

## 10. Acceptance criteria

Phase 2 is complete when:

- Admin can manage categories and brands.
- Admin can create simple and variant-based products.
- Admin can configure direct, RFQ-only, or hybrid sales modes.
- Admin can show or hide prices where allowed.
- Invalid or incomplete products cannot be published.
- Customers can browse, search, filter, and sort products.
- Product pages display correct prices, MOQ, variants, and availability.
- Draft and archived products are not publicly accessible.
- Product URLs and SEO metadata are generated correctly.
- Images upload, optimize, reorder, display, and delete correctly.
- Base64 image data is not included in catalog JSON responses.
- Catalog, search, filters, product details, image galleries, and admin editing pass responsive checks at the shared target widths.
- Mobile interactions remain touch friendly, keyboard alternatives remain available, and catalog pages meet the shared accessibility requirements.
- Catalog permissions and pricing rules are covered by tests.

## Not included

- Functional cart
- RFQ submission
- Quotation management
- Checkout
- Orders
- Payments
- Inventory reservations
- Supplier management
- Import and shipping workflows
- Reviews, ratings, or wishlists
- Bulk CSV product import
