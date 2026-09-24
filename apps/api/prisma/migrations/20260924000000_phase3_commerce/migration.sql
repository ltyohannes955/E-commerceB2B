CREATE TYPE "RfqStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'QUOTED', 'CANCELLED', 'CLOSED');
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REPLACED');
CREATE TYPE "QuoteAdjustmentKind" AS ENUM ('CHARGE', 'DISCOUNT');
CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE SEQUENCE rfq_reference_seq START 1;
CREATE SEQUENCE quo_reference_seq START 1;

CREATE TABLE "Cart" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CartItem" (
  "id" UUID NOT NULL,
  "cartId" UUID NOT NULL,
  "productId" UUID,
  "variantId" UUID,
  "productName" VARCHAR(240) NOT NULL,
  "variantName" VARCHAR(160) NOT NULL,
  "sku" VARCHAR(100) NOT NULL,
  "unit" VARCHAR(40) NOT NULL,
  "imageSrc" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPriceSnapshot" DECIMAL(14,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CartItem_cartId_variantId_key" ON "CartItem"("cartId", "variantId");
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");
CREATE INDEX "CartItem_variantId_idx" ON "CartItem"("variantId");
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Rfq" (
  "id" UUID NOT NULL,
  "reference" VARCHAR(40) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "userId" UUID NOT NULL,
  "assignedAdminId" UUID,
  "status" "RfqStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "message" TEXT,
  "deliveryTimeframe" VARCHAR(160),
  "deliveryCity" VARCHAR(120),
  "preferredContact" VARCHAR(40),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Rfq_reference_key" ON "Rfq"("reference");
CREATE INDEX "Rfq_userId_status_updatedAt_idx" ON "Rfq"("userId", "status", "updatedAt");
CREATE INDEX "Rfq_status_updatedAt_idx" ON "Rfq"("status", "updatedAt");
CREATE INDEX "Rfq_assignedAdminId_status_updatedAt_idx" ON "Rfq"("assignedAdminId", "status", "updatedAt");
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RfqItem" (
  "id" UUID NOT NULL,
  "rfqId" UUID NOT NULL,
  "productId" UUID,
  "variantId" UUID,
  "productName" VARCHAR(240) NOT NULL,
  "variantName" VARCHAR(160) NOT NULL,
  "sku" VARCHAR(100) NOT NULL,
  "unit" VARCHAR(40) NOT NULL,
  "imageSrc" TEXT,
  "requestedQuantity" INTEGER NOT NULL,
  "adjustedQuantity" INTEGER,
  "adjustmentReason" VARCHAR(500),
  "note" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RfqItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RfqItem_rfqId_variantId_key" ON "RfqItem"("rfqId", "variantId");
CREATE INDEX "RfqItem_productId_idx" ON "RfqItem"("productId");
CREATE INDEX "RfqItem_variantId_idx" ON "RfqItem"("variantId");
ALTER TABLE "RfqItem" ADD CONSTRAINT "RfqItem_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqItem" ADD CONSTRAINT "RfqItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqItem" ADD CONSTRAINT "RfqItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RfqStatusHistory" (
  "id" UUID NOT NULL,
  "rfqId" UUID NOT NULL,
  "actorUserId" UUID,
  "fromStatus" "RfqStatus",
  "toStatus" "RfqStatus" NOT NULL,
  "note" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RfqStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RfqStatusHistory_rfqId_createdAt_idx" ON "RfqStatusHistory"("rfqId", "createdAt");
ALTER TABLE "RfqStatusHistory" ADD CONSTRAINT "RfqStatusHistory_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqStatusHistory" ADD CONSTRAINT "RfqStatusHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Quote" (
  "id" UUID NOT NULL,
  "quoteNumber" VARCHAR(48) NOT NULL,
  "rfqId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "revision" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" CHAR(3) NOT NULL DEFAULT 'ETB',
  "subtotal" DECIMAL(14,2) NOT NULL,
  "adjustmentTotal" DECIMAL(14,2) NOT NULL,
  "grandTotal" DECIMAL(14,2) NOT NULL,
  "estimatedLeadTimeDays" INTEGER,
  "paymentTerms" VARCHAR(240),
  "expiresAt" TIMESTAMP(3),
  "customerNotes" TEXT,
  "internalNotes" TEXT,
  "declineReason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
CREATE UNIQUE INDEX "Quote_rfqId_revision_key" ON "Quote"("rfqId", "revision");
CREATE INDEX "Quote_status_updatedAt_idx" ON "Quote"("status", "updatedAt");
CREATE INDEX "Quote_rfqId_createdAt_idx" ON "Quote"("rfqId", "createdAt");
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "QuoteItem" (
  "id" UUID NOT NULL,
  "quoteId" UUID NOT NULL,
  "rfqItemId" UUID,
  "productName" VARCHAR(240) NOT NULL,
  "variantName" VARCHAR(160) NOT NULL,
  "sku" VARCHAR(100) NOT NULL,
  "unit" VARCHAR(40) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(14,2) NOT NULL,
  "lineSubtotal" DECIMAL(14,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_rfqItemId_fkey" FOREIGN KEY ("rfqItemId") REFERENCES "RfqItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "QuoteAdjustment" (
  "id" UUID NOT NULL,
  "quoteId" UUID NOT NULL,
  "kind" "QuoteAdjustmentKind" NOT NULL,
  "label" VARCHAR(160) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuoteAdjustment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "QuoteAdjustment_quoteId_sortOrder_idx" ON "QuoteAdjustment"("quoteId", "sortOrder");
ALTER TABLE "QuoteAdjustment" ADD CONSTRAINT "QuoteAdjustment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "QuoteStatusHistory" (
  "id" UUID NOT NULL,
  "quoteId" UUID NOT NULL,
  "actorUserId" UUID,
  "fromStatus" "QuoteStatus",
  "toStatus" "QuoteStatus" NOT NULL,
  "note" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "QuoteStatusHistory_quoteId_createdAt_idx" ON "QuoteStatusHistory"("quoteId", "createdAt");
ALTER TABLE "QuoteStatusHistory" ADD CONSTRAINT "QuoteStatusHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteStatusHistory" ADD CONSTRAINT "QuoteStatusHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EmailOutbox" (
  "id" UUID NOT NULL,
  "kind" VARCHAR(80) NOT NULL,
  "recipient" VARCHAR(320) NOT NULL,
  "subject" VARCHAR(240) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" VARCHAR(1000),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmailOutbox_status_availableAt_idx" ON "EmailOutbox"("status", "availableAt");
