/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Prisma,
  QuoteAdjustmentKind,
  QuoteStatus,
  ProductAvailability,
  ProductSaleMode,
  ProductStatus,
  RfqStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminRfqQueryDto,
  CartItemCreateDto,
  CartItemUpdateDto,
  MoveCartItemDto,
  QuoteCreateDto,
  QuoteDeclineDto,
  QuoteQueryDto,
  QuoteUpdateDto,
  RfqAssignmentDto,
  RfqCreateDto,
  RfqItemAdjustmentDto,
  RfqItemCreateDto,
  RfqItemUpdateDto,
  RfqQueryDto,
  RfqStatusDto,
  RfqSubmitDto,
  RfqUpdateDto,
} from './commerce.dto';

type Actor = { id: string; role: 'CUSTOMER' | 'ADMIN'; email?: string };

const productInclude = {
  category: true,
  brand: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      priceTiers: { orderBy: { minimumQuantity: 'asc' as const } },
      image: true,
    },
  },
  priceTiers: {
    where: { variantId: null },
    orderBy: { minimumQuantity: 'asc' as const },
  },
} satisfies Prisma.ProductInclude;

function money(value: string | number | Prisma.Decimal) {
  return new Prisma.Decimal(String(value)).toDecimalPlaces(2);
}

function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

function activeDiscount(product: any, now = new Date()) {
  return Boolean(
    product.discountPrice &&
    product.regularPrice &&
    (!product.discountStartAt || product.discountStartAt <= now) &&
    (!product.discountEndAt || product.discountEndAt >= now),
  );
}

function tierFor(tiers: any[], quantity: number) {
  return [...tiers]
    .filter((tier) => tier.minimumQuantity <= quantity)
    .sort((a, b) => b.minimumQuantity - a.minimumQuantity)[0];
}

function resolvedPrice(product: any, variant: any, quantity: number) {
  const regular =
    variant.priceMode === 'FIXED'
      ? variant.fixedPrice
      : new Prisma.Decimal(product.regularPrice ?? 0).add(
          variant.priceMode === 'ADJUSTMENT'
            ? (variant.priceAdjustment ?? 0)
            : 0,
        );
  const discounted = activeDiscount(product)
    ? variant.priceMode === 'FIXED'
      ? variant.fixedPrice
      : new Prisma.Decimal(product.discountPrice ?? 0).add(
          variant.priceMode === 'ADJUSTMENT'
            ? (variant.priceAdjustment ?? 0)
            : 0,
        )
    : null;
  const productTier = tierFor(product.priceTiers ?? [], quantity);
  const variantTier = tierFor(variant.priceTiers ?? [], quantity);
  const tier = variantTier ?? productTier;
  const candidates = [regular, discounted, tier?.unitPrice]
    .filter(Boolean)
    .map((x) => money(x));
  return candidates.length
    ? candidates.sort((a, b) => a.comparedTo(b))[0]
    : null;
}

function pagination(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function ensureCustomer(actor: Actor) {
  if (actor.role !== 'CUSTOMER')
    throw new NotFoundException('RESOURCE_NOT_FOUND');
}

function ensureAdmin(actor: Actor) {
  if (actor.role !== 'ADMIN') throw new NotFoundException('RESOURCE_NOT_FOUND');
}

@Injectable()
export class CommerceService implements OnModuleInit, OnModuleDestroy {
  private outboxTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.dispatchOutbox().catch(() => undefined);
    this.outboxTimer = setInterval(
      () => void this.dispatchOutbox().catch(() => undefined),
      60_000,
    );
    this.outboxTimer.unref();
  }

  onModuleDestroy() {
    if (this.outboxTimer) clearInterval(this.outboxTimer);
  }

  private async audit(
    actorId: string | undefined,
    action: string,
    metadata: any,
  ) {
    await this.prisma.auditLog
      .create({ data: { actorUserId: actorId, action, metadata } })
      .catch(() => undefined);
  }

  private async nextReference(prefix: 'RFQ' | 'QUO') {
    const rows = await this.prisma.$queryRaw<Array<{ value: bigint }>>(
      Prisma.sql`SELECT nextval(${Prisma.raw(`'${prefix.toLowerCase()}_reference_seq'`)}::regclass) AS value`,
    );
    const value = Number(rows[0]?.value ?? Date.now());
    return `${prefix}-${new Date().toISOString().slice(0, 7).replace('-', '')}-${String(value).padStart(6, '0')}`;
  }

  private async productForVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { include: productInclude },
        priceTiers: true,
        image: true,
      },
    });
    if (!variant) throw new NotFoundException('VARIANT_NOT_FOUND');
    return variant;
  }

  private assertSellable(
    product: any,
    variant: any,
    quantity: number,
    flow: 'CART' | 'RFQ',
  ) {
    if (product.status !== ProductStatus.PUBLISHED)
      throw new BadRequestException({
        code: 'PRODUCT_UNAVAILABLE',
        detail: 'This product is not published.',
      });
    if (
      [
        ProductAvailability.OUT_OF_STOCK,
        ProductAvailability.DISCONTINUED,
      ].includes(product.availability) ||
      [
        ProductAvailability.OUT_OF_STOCK,
        ProductAvailability.DISCONTINUED,
      ].includes(variant.availability)
    ) {
      throw new BadRequestException({
        code: 'PRODUCT_UNAVAILABLE',
        detail: 'This product variant is unavailable.',
      });
    }
    if (quantity < product.minimumOrderQuantity)
      throw new BadRequestException({
        code: 'MOQ_NOT_MET',
        detail: `Minimum order quantity is ${product.minimumOrderQuantity}.`,
      });
    if (
      variant.availableQuantity !== null &&
      quantity > variant.availableQuantity
    )
      throw new BadRequestException({
        code: 'QUANTITY_UNAVAILABLE',
        detail: 'The requested quantity is not available.',
      });
    if (flow === 'CART') {
      if (product.saleMode === ProductSaleMode.RFQ_ONLY)
        throw new BadRequestException({
          code: 'RFQ_REQUIRED',
          detail: 'This product is available by request for quote.',
        });
      if (
        product.directPurchaseMaxQuantity &&
        quantity > product.directPurchaseMaxQuantity
      )
        throw new BadRequestException({
          code: 'RFQ_THRESHOLD_REACHED',
          detail: 'This quantity must be requested as a quote.',
        });
      if (product.rfqThreshold && quantity >= product.rfqThreshold)
        throw new BadRequestException({
          code: 'RFQ_THRESHOLD_REACHED',
          detail: 'This quantity must be requested as a quote.',
        });
    }
  }

  private productSnapshot(product: any, variant: any) {
    const image =
      variant.image ??
      product.images.find((item: any) => item.isPrimary) ??
      product.images[0];
    return {
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      sku: variant.sku,
      unit: product.unit,
      imageSrc: image ? `/product-images/${image.id}` : null,
    };
  }

  private async getCart(actor: Actor) {
    ensureCustomer(actor);
    return this.prisma.cart.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id },
      update: {},
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
  }

  private async cartDto(cart: any) {
    const items = await Promise.all(
      cart.items.map(async (item: any) => {
        let currentPrice: Prisma.Decimal | null = null;
        let available = false;
        let detail: any = null;
        if (item.variantId) {
          try {
            const variant = await this.productForVariant(item.variantId);
            detail = variant;
            this.assertSellable(
              variant.product,
              variant,
              item.quantity,
              'CART',
            );
            currentPrice = resolvedPrice(
              variant.product,
              variant,
              item.quantity,
            );
            available = Boolean(currentPrice);
          } catch {
            available = false;
          }
        }
        const snapshot = money(item.unitPriceSnapshot);
        const subtotal = currentPrice
          ? currentPrice.mul(item.quantity)
          : snapshot.mul(item.quantity);
        return {
          id: item.id,
          ...item,
          unitPriceSnapshot: snapshot.toString(),
          currentUnitPrice: currentPrice?.toString() ?? null,
          previousUnitPrice:
            currentPrice && !currentPrice.equals(snapshot)
              ? snapshot.toString()
              : null,
          priceChanged: Boolean(currentPrice && !currentPrice.equals(snapshot)),
          subtotal: subtotal.toString(),
          available,
          availability: detail?.availability ?? null,
        };
      }),
    );
    const subtotal = items.reduce(
      (sum, item) => sum.add(item.subtotal),
      new Prisma.Decimal(0),
    );
    return {
      id: cart.id,
      items,
      subtotal: subtotal.toString(),
      currency: 'ETB',
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      updatedAt: cart.updatedAt,
    };
  }

  async readCart(actor: Actor) {
    return this.cartDto(await this.getCart(actor));
  }

  async addCartItem(actor: Actor, dto: CartItemCreateDto) {
    ensureCustomer(actor);
    const source = await this.productForVariant(dto.variantId);
    this.assertSellable(source.product, source, dto.quantity, 'CART');
    const price = resolvedPrice(source.product, source, dto.quantity);
    if (!price)
      throw new BadRequestException({
        code: 'PRICE_UNAVAILABLE',
        detail: 'This product does not have a purchasable price.',
      });
    const cart = await this.getCart(actor);
    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, variantId: dto.variantId },
    });
    const quantity = existing ? existing.quantity + dto.quantity : dto.quantity;
    this.assertSellable(source.product, source, quantity, 'CART');
    const data = {
      ...this.productSnapshot(source.product, source),
      quantity,
      unitPriceSnapshot: price,
    };
    const item = existing
      ? await this.prisma.cartItem.update({ where: { id: existing.id }, data })
      : await this.prisma.cartItem.create({
          data: { ...data, cartId: cart.id },
        });
    await this.audit(actor.id, 'CART_ITEM_ADDED', {
      itemId: item.id,
      variantId: dto.variantId,
      quantity,
    });
    return this.readCart(actor);
  }

  async updateCartItem(actor: Actor, id: string, dto: CartItemUpdateDto) {
    ensureCustomer(actor);
    const item = await this.prisma.cartItem.findFirst({
      where: { id, cart: { userId: actor.id } },
    });
    if (!item || !item.variantId)
      throw new NotFoundException('CART_ITEM_NOT_FOUND');
    const source = await this.productForVariant(item.variantId);
    this.assertSellable(source.product, source, dto.quantity, 'CART');
    const price = resolvedPrice(source.product, source, dto.quantity);
    await this.prisma.cartItem.update({
      where: { id },
      data: {
        quantity: dto.quantity,
        unitPriceSnapshot: price ?? item.unitPriceSnapshot,
        ...this.productSnapshot(source.product, source),
      },
    });
    return this.readCart(actor);
  }

  async removeCartItem(actor: Actor, id: string) {
    ensureCustomer(actor);
    await this.prisma.cartItem.deleteMany({
      where: { id, cart: { userId: actor.id } },
    });
    return this.readCart(actor);
  }

  async clearCart(actor: Actor) {
    ensureCustomer(actor);
    const cart = await this.getCart(actor);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.readCart(actor);
  }

  async moveCartItem(actor: Actor, id: string, dto: MoveCartItemDto) {
    ensureCustomer(actor);
    const item = await this.prisma.cartItem.findFirst({
      where: { id, cart: { userId: actor.id } },
    });
    if (!item?.variantId) throw new NotFoundException('CART_ITEM_NOT_FOUND');
    const source = await this.productForVariant(item.variantId);
    if (
      source.product.saleMode === ProductSaleMode.DIRECT_PURCHASE &&
      !source.product.allowRfqAtAnyQuantity
    )
      throw new BadRequestException({
        code: 'RFQ_NOT_ALLOWED',
        detail: 'This product is not available for quote.',
      });
    const rfq = await this.prisma.$transaction(async (tx) => {
      let target: any = dto.rfqId
        ? await tx.rfq.findFirst({ where: { id: dto.rfqId, userId: actor.id } })
        : null;
      if (dto.rfqId && !target) throw new NotFoundException('RFQ_NOT_FOUND');
      if (!target) {
        target = await tx.rfq.create({
          data: {
            reference: await this.nextReference('RFQ'),
            title:
              dto.title?.trim() || `Quote request for ${source.product.name}`,
            userId: actor.id,
            items: {
              create: {
                ...this.productSnapshot(source.product, source),
                requestedQuantity: item.quantity,
                note: null,
              },
            },
          },
        });
      } else {
        if (target.status !== RfqStatus.DRAFT)
          throw new ConflictException({
            code: 'RFQ_NOT_EDITABLE',
            detail: 'Only draft requests can be changed.',
          });
        const existing = await tx.rfqItem.findFirst({
          where: { rfqId: target.id, variantId: item.variantId },
        });
        if (existing)
          await tx.rfqItem.update({
            where: { id: existing.id },
            data: {
              requestedQuantity: existing.requestedQuantity + item.quantity,
            },
          });
        else
          await tx.rfqItem.create({
            data: {
              rfqId: target.id,
              ...this.productSnapshot(source.product, source),
              requestedQuantity: item.quantity,
            },
          });
        await tx.rfq.update({
          where: { id: target.id },
          data: { version: { increment: 1 } },
        });
      }
      await tx.cartItem.delete({ where: { id: item.id } });
      return target;
    });
    await this.audit(actor.id, 'CART_ITEM_MOVED_TO_RFQ', {
      cartItemId: id,
      rfqId: rfq.id,
    });
    return this.findRfq(actor, rfq.id);
  }

  private rfqInclude = {
    items: { orderBy: { createdAt: 'asc' as const } },
    statusHistory: { orderBy: { createdAt: 'asc' as const } },
    quotes: {
      orderBy: { revision: 'desc' as const },
      select: {
        id: true,
        quoteNumber: true,
        revision: true,
        status: true,
        grandTotal: true,
        expiresAt: true,
      },
    },
  };

  private async findOwnedRfq(actor: Actor, id: string) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id, userId: actor.id },
      include: this.rfqInclude,
    });
    if (!rfq) throw new NotFoundException('RFQ_NOT_FOUND');
    return rfq;
  }

  private rfqDto(rfq: any, admin = false) {
    return {
      ...rfq,
      assignedAdminId: admin ? rfq.assignedAdminId : undefined,
      items: rfq.items,
      quotes: rfq.quotes?.map((quote: any) => ({
        ...quote,
        grandTotal: quote.grandTotal?.toString(),
        expiresAt: iso(quote.expiresAt),
      })),
      statusHistory: rfq.statusHistory,
    };
  }

  async listRfqs(actor: Actor, query: RfqQueryDto) {
    ensureCustomer(actor);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      userId: actor.id,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rfq.findMany({
        where,
        include: this.rfqInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rfq.count({ where }),
    ]);
    return {
      items: items.map((item) => this.rfqDto(item)),
      ...pagination(page, pageSize, total),
    };
  }

  async createRfq(actor: Actor, dto: RfqCreateDto) {
    ensureCustomer(actor);
    let itemData: any = undefined;
    if (dto.variantId) {
      const source = await this.productForVariant(dto.variantId);
      const quantity = dto.quantity ?? source.product.minimumOrderQuantity;
      if (
        source.product.saleMode === ProductSaleMode.DIRECT_PURCHASE &&
        !source.product.allowRfqAtAnyQuantity
      )
        throw new BadRequestException({
          code: 'RFQ_NOT_ALLOWED',
          detail: 'This product is not available for quote.',
        });
      this.assertSellable(source.product, source, quantity, 'RFQ');
      itemData = {
        ...this.productSnapshot(source.product, source),
        requestedQuantity: quantity,
        note: dto.note,
      };
    }
    const rfq = await this.prisma.rfq.create({
      data: {
        reference: await this.nextReference('RFQ'),
        title: dto.title.trim(),
        userId: actor.id,
        ...(itemData ? { items: { create: itemData } } : {}),
      },
      include: this.rfqInclude,
    });
    await this.prisma.rfqStatusHistory.create({
      data: { rfqId: rfq.id, toStatus: RfqStatus.DRAFT, actorUserId: actor.id },
    });
    return this.rfqDto(rfq);
  }

  async findRfq(actor: Actor, id: string) {
    ensureCustomer(actor);
    return this.rfqDto(await this.findOwnedRfq(actor, id));
  }

  async updateRfq(actor: Actor, id: string, dto: RfqUpdateDto) {
    ensureCustomer(actor);
    const current = await this.findOwnedRfq(actor, id);
    if (current.status !== RfqStatus.DRAFT)
      throw new ConflictException({
        code: 'RFQ_NOT_EDITABLE',
        detail: 'Only draft requests can be changed.',
      });
    if (dto.version !== undefined && dto.version !== current.version)
      throw new ConflictException({
        code: 'STALE_RFQ',
        detail: 'This request changed in another tab.',
      });
    const rfq = await this.prisma.rfq.updateMany({
      where: { id, userId: actor.id, version: current.version },
      data: {
        title: dto.title?.trim(),
        message: dto.message,
        deliveryTimeframe: dto.deliveryTimeframe,
        deliveryCity: dto.deliveryCity,
        preferredContact: dto.preferredContact,
        version: { increment: 1 },
      },
    });
    if (!rfq.count)
      throw new ConflictException({
        code: 'STALE_RFQ',
        detail: 'This request changed in another tab.',
      });
    return this.findRfq(actor, id);
  }

  async addRfqItem(actor: Actor, id: string, dto: RfqItemCreateDto) {
    ensureCustomer(actor);
    const rfq = await this.findOwnedRfq(actor, id);
    if (rfq.status !== RfqStatus.DRAFT)
      throw new ConflictException({
        code: 'RFQ_NOT_EDITABLE',
        detail: 'Only draft requests can be changed.',
      });
    const source = await this.productForVariant(dto.variantId);
    if (
      source.product.saleMode === ProductSaleMode.DIRECT_PURCHASE &&
      !source.product.allowRfqAtAnyQuantity
    )
      throw new BadRequestException({
        code: 'RFQ_NOT_ALLOWED',
        detail: 'This product is not available for quote.',
      });
    this.assertSellable(source.product, source, dto.quantity, 'RFQ');
    const existing = await this.prisma.rfqItem.findFirst({
      where: { rfqId: id, variantId: dto.variantId },
    });
    if (existing)
      await this.prisma.rfqItem.update({
        where: { id: existing.id },
        data: {
          requestedQuantity: existing.requestedQuantity + dto.quantity,
          note: dto.note,
        },
      });
    else
      await this.prisma.rfqItem.create({
        data: {
          rfqId: id,
          ...this.productSnapshot(source.product, source),
          requestedQuantity: dto.quantity,
          note: dto.note,
        },
      });
    await this.prisma.rfq.update({
      where: { id },
      data: { version: { increment: 1 } },
    });
    return this.findRfq(actor, id);
  }

  async updateRfqItem(
    actor: Actor,
    id: string,
    itemId: string,
    dto: RfqItemUpdateDto,
  ) {
    ensureCustomer(actor);
    const rfq = await this.findOwnedRfq(actor, id);
    if (rfq.status !== RfqStatus.DRAFT)
      throw new ConflictException({
        code: 'RFQ_NOT_EDITABLE',
        detail: 'Only draft requests can be changed.',
      });
    const item = await this.prisma.rfqItem.findFirst({
      where: { id: itemId, rfqId: id },
    });
    if (!item) throw new NotFoundException('RFQ_ITEM_NOT_FOUND');
    await this.prisma.rfqItem.update({
      where: { id: itemId },
      data: { requestedQuantity: dto.quantity, note: dto.note },
    });
    await this.prisma.rfq.update({
      where: { id },
      data: { version: { increment: 1 } },
    });
    return this.findRfq(actor, id);
  }

  async removeRfqItem(actor: Actor, id: string, itemId: string) {
    ensureCustomer(actor);
    const rfq = await this.findOwnedRfq(actor, id);
    if (rfq.status !== RfqStatus.DRAFT)
      throw new ConflictException({
        code: 'RFQ_NOT_EDITABLE',
        detail: 'Only draft requests can be changed.',
      });
    await this.prisma.rfqItem.deleteMany({ where: { id: itemId, rfqId: id } });
    await this.prisma.rfq.update({
      where: { id },
      data: { version: { increment: 1 } },
    });
    return this.findRfq(actor, id);
  }

  async submitRfq(actor: Actor, id: string, dto: RfqSubmitDto) {
    ensureCustomer(actor);
    const rfq = await this.findOwnedRfq(actor, id);
    if (rfq.status !== RfqStatus.DRAFT)
      throw new ConflictException({
        code: 'RFQ_INVALID_STATE',
        detail: 'Only draft requests can be submitted.',
      });
    if (dto.version !== rfq.version)
      throw new ConflictException({
        code: 'STALE_RFQ',
        detail: 'This request changed in another tab.',
      });
    if (!rfq.items.length)
      throw new BadRequestException({
        code: 'RFQ_EMPTY',
        detail: 'Add at least one item before submitting.',
      });
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.rfq.updateMany({
        where: {
          id,
          userId: actor.id,
          status: RfqStatus.DRAFT,
          version: dto.version,
        },
        data: {
          status: RfqStatus.SUBMITTED,
          submittedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (!updated.count)
        throw new ConflictException({
          code: 'STALE_RFQ',
          detail: 'This request changed in another tab.',
        });
      await tx.rfqStatusHistory.create({
        data: {
          rfqId: id,
          actorUserId: actor.id,
          fromStatus: RfqStatus.DRAFT,
          toStatus: RfqStatus.SUBMITTED,
        },
      });
      return tx.rfq.findUniqueOrThrow({
        where: { id },
        include: this.rfqInclude,
      });
    });
    await this.audit(actor.id, 'RFQ_SUBMITTED', { rfqId: id });
    return this.rfqDto(result);
  }

  async cancelRfq(actor: Actor, id: string) {
    ensureCustomer(actor);
    const rfq = await this.findOwnedRfq(actor, id);
    const cancellable: RfqStatus[] = [
      RfqStatus.DRAFT,
      RfqStatus.SUBMITTED,
      RfqStatus.UNDER_REVIEW,
    ];
    if (!cancellable.includes(rfq.status))
      throw new ConflictException({
        code: 'RFQ_INVALID_STATE',
        detail: 'This request cannot be cancelled.',
      });
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.rfq.update({
        where: { id },
        data: {
          status: RfqStatus.CANCELLED,
          cancelledAt: new Date(),
          version: { increment: 1 },
        },
      });
      await tx.rfqStatusHistory.create({
        data: {
          rfqId: id,
          actorUserId: actor.id,
          fromStatus: rfq.status,
          toStatus: RfqStatus.CANCELLED,
        },
      });
      return tx.rfq.findUniqueOrThrow({
        where: { id },
        include: this.rfqInclude,
      });
    });
    await this.audit(actor.id, 'RFQ_CANCELLED', { rfqId: id });
    return this.rfqDto(result);
  }

  private async adminRfq(id: string) {
    const rfq = await this.prisma.rfq.findUnique({
      where: { id },
      include: {
        ...this.rfqInclude,
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        assignedAdmin: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!rfq) throw new NotFoundException('RFQ_NOT_FOUND');
    return rfq;
  }

  async listAdminRfqs(actor: Actor, query: AdminRfqQueryDto) {
    ensureAdmin(actor);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: any = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    if (query.search)
      where.OR = [
        { reference: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rfq.findMany({
        where,
        include: {
          ...this.rfqInclude,
          user: { select: { id: true, fullName: true, email: true } },
          assignedAdmin: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rfq.count({ where }),
    ]);
    return {
      items: items.map((item) => this.rfqDto(item, true)),
      ...pagination(page, pageSize, total),
    };
  }

  async findAdminRfq(actor: Actor, id: string) {
    ensureAdmin(actor);
    return this.rfqDto(await this.adminRfq(id), true);
  }

  async setRfqStatus(actor: Actor, id: string, dto: RfqStatusDto) {
    ensureAdmin(actor);
    const current = await this.adminRfq(id);
    if (dto.version !== current.version)
      throw new ConflictException({
        code: 'STALE_RFQ',
        detail: 'This request changed in another tab.',
      });
    const allowed: Record<string, string[]> = {
      SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
      UNDER_REVIEW: ['CANCELLED'],
      QUOTED: ['UNDER_REVIEW'],
      DRAFT: [],
    };
    if (!allowed[current.status]?.includes(dto.status))
      throw new ConflictException({
        code: 'RFQ_INVALID_STATE',
        detail: 'That RFQ status transition is not allowed.',
      });
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.rfq.update({
        where: { id },
        data: { status: dto.status, version: { increment: 1 } },
      });
      await tx.rfqStatusHistory.create({
        data: {
          rfqId: id,
          actorUserId: actor.id,
          fromStatus: current.status,
          toStatus: dto.status,
          note: dto.note,
        },
      });
      return tx.rfq.findUniqueOrThrow({
        where: { id },
        include: {
          ...this.rfqInclude,
          user: { select: { id: true, fullName: true, email: true } },
          assignedAdmin: { select: { id: true, fullName: true, email: true } },
        },
      });
    });
    await this.audit(actor.id, 'RFQ_STATUS_CHANGED', {
      rfqId: id,
      from: current.status,
      to: dto.status,
    });
    return this.rfqDto(result, true);
  }

  async assignRfq(actor: Actor, id: string, dto: RfqAssignmentDto) {
    ensureAdmin(actor);
    const current = await this.adminRfq(id);
    if (dto.version !== current.version)
      throw new ConflictException({
        code: 'STALE_RFQ',
        detail: 'This request changed in another tab.',
      });
    if (dto.assignedAdminId) {
      const admin = await this.prisma.user.findFirst({
        where: { id: dto.assignedAdminId, role: 'ADMIN', status: 'ACTIVE' },
      });
      if (!admin)
        throw new BadRequestException({
          code: 'ADMIN_NOT_FOUND',
          detail: 'Select an active administrator.',
        });
    }
    await this.prisma.rfq.update({
      where: { id },
      data: {
        assignedAdminId: dto.assignedAdminId ?? null,
        version: { increment: 1 },
      },
    });
    await this.audit(actor.id, 'RFQ_ASSIGNED', {
      rfqId: id,
      assignedAdminId: dto.assignedAdminId,
    });
    return this.findAdminRfq(actor, id);
  }

  async adjustRfqItem(
    actor: Actor,
    id: string,
    itemId: string,
    dto: RfqItemAdjustmentDto,
  ) {
    ensureAdmin(actor);
    const current = await this.adminRfq(id);
    if (dto.version !== current.version)
      throw new ConflictException({
        code: 'STALE_RFQ',
        detail: 'This request changed in another tab.',
      });
    const item = current.items.find((entry: any) => entry.id === itemId);
    if (!item) throw new NotFoundException('RFQ_ITEM_NOT_FOUND');
    await this.prisma.$transaction([
      this.prisma.rfqItem.update({
        where: { id: itemId },
        data: { adjustedQuantity: dto.quantity, adjustmentReason: dto.reason },
      }),
      this.prisma.rfq.update({
        where: { id },
        data: { version: { increment: 1 } },
      }),
    ]);
    await this.audit(actor.id, 'RFQ_ITEM_ADJUSTED', {
      rfqId: id,
      itemId,
      quantity: dto.quantity,
    });
    return this.findAdminRfq(actor, id);
  }

  private quoteInclude = {
    items: { orderBy: { createdAt: 'asc' as const } },
    adjustments: { orderBy: { sortOrder: 'asc' as const } },
    statusHistory: { orderBy: { createdAt: 'asc' as const } },
    rfq: {
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    },
    createdBy: { select: { id: true, fullName: true, email: true } },
  };

  private quoteDto(quote: any, admin = false) {
    const { createdBy, internalNotes, ...publicQuote } = quote;
    const value = (item: any) => ({
      ...item,
      unitPrice: item.unitPrice?.toString(),
      lineSubtotal: item.lineSubtotal?.toString(),
    });
    return {
      ...publicQuote,
      subtotal: publicQuote.subtotal.toString(),
      adjustmentTotal: publicQuote.adjustmentTotal.toString(),
      grandTotal: publicQuote.grandTotal.toString(),
      expiresAt: iso(publicQuote.expiresAt),
      items: publicQuote.items.map(value),
      adjustments: publicQuote.adjustments.map((item: any) => ({
        ...item,
        amount: item.amount.toString(),
      })),
      statusHistory: publicQuote.statusHistory,
      ...(admin ? { createdBy, internalNotes } : {}),
      rfq: publicQuote.rfq
        ? { ...publicQuote.rfq, user: publicQuote.rfq.user, items: undefined }
        : undefined,
    };
  }

  private async expireQuoteIfNeeded(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (
      quote?.status === QuoteStatus.SENT &&
      quote.expiresAt &&
      quote.expiresAt <= new Date()
    ) {
      await this.prisma.$transaction([
        this.prisma.quote.update({
          where: { id },
          data: { status: QuoteStatus.EXPIRED },
        }),
        this.prisma.quoteStatusHistory.create({
          data: {
            quoteId: id,
            fromStatus: QuoteStatus.SENT,
            toStatus: QuoteStatus.EXPIRED,
            note: 'Quotation expiration reached.',
          },
        }),
      ]);
      return { ...quote, status: QuoteStatus.EXPIRED };
    }
    return quote;
  }

  async listCustomerQuotes(actor: Actor, query: QuoteQueryDto) {
    ensureCustomer(actor);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: any = {
      rfq: { userId: actor.id },
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        include: this.quoteInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.quote.count({ where }),
    ]);
    return {
      items: items.map((item) => this.quoteDto(item)),
      ...pagination(page, pageSize, total),
    };
  }

  async findCustomerQuote(actor: Actor, id: string) {
    ensureCustomer(actor);
    const quote = await this.prisma.quote.findFirst({
      where: { id, rfq: { userId: actor.id } },
      include: this.quoteInclude,
    });
    if (!quote) throw new NotFoundException('QUOTE_NOT_FOUND');
    await this.expireQuoteIfNeeded(id);
    return this.quoteDto(
      await this.prisma.quote.findUniqueOrThrow({
        where: { id },
        include: this.quoteInclude,
      }),
    );
  }

  private parseAmount(value: string | undefined, allowZero = false) {
    if (!value || !/^\d+(\.\d{1,2})?$/.test(value))
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        detail:
          'Amounts must be positive ETB values with at most two decimals.',
      });
    const amount = money(value);
    if (allowZero ? amount.lt(0) : amount.lte(0))
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        detail: allowZero
          ? 'Amounts cannot be negative.'
          : 'Amounts must be positive.',
      });
    return amount;
  }

  private async createQuote(
    actor: Actor,
    rfqId: string,
    dto: QuoteCreateDto,
    revision: number,
  ) {
    const rfq = await this.prisma.rfq.findUnique({
      where: { id: rfqId },
      include: { items: true, user: true },
    });
    if (!rfq) throw new NotFoundException('RFQ_NOT_FOUND');
    const closed: RfqStatus[] = [RfqStatus.CANCELLED, RfqStatus.CLOSED];
    if (closed.includes(rfq.status))
      throw new ConflictException({
        code: 'RFQ_INVALID_STATE',
        detail: 'This RFQ is closed.',
      });
    const source = new Map(rfq.items.map((item) => [item.id, item]));
    if (!dto.items?.length)
      throw new BadRequestException({
        code: 'QUOTE_EMPTY',
        detail: 'Add at least one quotation line.',
      });
    const lines = dto.items.map((line) => {
      const item = line.rfqItemId ? source.get(line.rfqItemId) : undefined;
      if (!item)
        throw new BadRequestException({
          code: 'QUOTE_ITEM_INVALID',
          detail: 'Every quote line must belong to the RFQ.',
        });
      const unitPrice = this.parseAmount(line.unitPrice, true);
      const quantity = line.quantity;
      return {
        rfqItemId: item.id,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        unit: item.unit,
        quantity,
        unitPrice,
        lineSubtotal: unitPrice.mul(quantity),
      };
    });
    const adjustments = (dto.adjustments ?? []).map((adjustment) => ({
      ...adjustment,
      label: adjustment.label.trim(),
      amount: this.parseAmount(adjustment.amount),
    }));
    const subtotal = lines.reduce(
      (sum, line) => sum.add(line.lineSubtotal),
      new Prisma.Decimal(0),
    );
    const adjustmentTotal = adjustments.reduce(
      (sum, adjustment) =>
        sum.add(
          adjustment.kind === QuoteAdjustmentKind.DISCOUNT
            ? adjustment.amount.neg()
            : adjustment.amount,
        ),
      new Prisma.Decimal(0),
    );
    const grandTotal = subtotal.add(adjustmentTotal);
    if (grandTotal.lt(0))
      throw new BadRequestException({
        code: 'QUOTE_TOTAL_INVALID',
        detail: 'The quotation total cannot be negative.',
      });
    const quote = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          quoteNumber: `${await this.nextReference('QUO')}-R${revision}`,
          rfqId,
          createdById: actor.id,
          revision,
          subtotal,
          adjustmentTotal,
          grandTotal,
          estimatedLeadTimeDays: dto.estimatedLeadTimeDays,
          paymentTerms: dto.paymentTerms,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          customerNotes: dto.customerNotes,
          internalNotes: dto.internalNotes,
          items: { create: lines },
          adjustments: {
            create: adjustments.map(({ kind, label, amount, sortOrder }) => ({
              kind,
              label,
              amount,
              sortOrder,
            })),
          },
        },
        include: this.quoteInclude,
      });
      await tx.quoteStatusHistory.create({
        data: {
          quoteId: created.id,
          actorUserId: actor.id,
          toStatus: QuoteStatus.DRAFT,
        },
      });
      return created;
    });
    await this.audit(actor.id, 'QUOTE_CREATED', { quoteId: quote.id, rfqId });
    return this.quoteDto(quote, true);
  }

  async listAdminQuotes(actor: Actor, query: QuoteQueryDto) {
    ensureAdmin(actor);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: any = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        include: this.quoteInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.quote.count({ where }),
    ]);
    return {
      items: items.map((item) => this.quoteDto(item, true)),
      ...pagination(page, pageSize, total),
    };
  }

  async createAdminQuote(actor: Actor, rfqId: string, dto: QuoteCreateDto) {
    ensureAdmin(actor);
    const latest = await this.prisma.quote.findFirst({
      where: { rfqId },
      orderBy: { revision: 'desc' },
    });
    return this.createQuote(actor, rfqId, dto, (latest?.revision ?? 0) + 1);
  }

  async findAdminQuote(actor: Actor, id: string) {
    ensureAdmin(actor);
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: this.quoteInclude,
    });
    if (!quote) throw new NotFoundException('QUOTE_NOT_FOUND');
    await this.expireQuoteIfNeeded(id);
    return this.quoteDto(
      await this.prisma.quote.findUniqueOrThrow({
        where: { id },
        include: this.quoteInclude,
      }),
      true,
    );
  }

  async updateAdminQuote(actor: Actor, id: string, dto: QuoteUpdateDto) {
    ensureAdmin(actor);
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { rfq: true },
    });
    if (!quote) throw new NotFoundException('QUOTE_NOT_FOUND');
    if (quote.status !== QuoteStatus.DRAFT)
      throw new ConflictException({
        code: 'QUOTE_IMMUTABLE',
        detail: 'Only draft quotations can be edited.',
      });
    if (dto.version !== (quote as any).version)
      throw new ConflictException({
        code: 'STALE_QUOTE',
        detail: 'This quotation changed in another tab.',
      });
    const rfq = await this.prisma.rfq.findUnique({
      where: { id: quote.rfqId },
      include: { items: true },
    });
    if (!rfq) throw new NotFoundException('RFQ_NOT_FOUND');
    const source = new Map(rfq.items.map((item) => [item.id, item]));
    const lines = dto.items.map((line) => {
      const item = line.rfqItemId ? source.get(line.rfqItemId) : undefined;
      if (!item)
        throw new BadRequestException({
          code: 'QUOTE_ITEM_INVALID',
          detail: 'Every quote line must belong to the RFQ.',
        });
      const unitPrice = this.parseAmount(line.unitPrice, true);
      return {
        rfqItemId: item.id,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        unit: item.unit,
        quantity: line.quantity,
        unitPrice,
        lineSubtotal: unitPrice.mul(line.quantity),
      };
    });
    const adjustments = (dto.adjustments ?? []).map((adjustment) => ({
      ...adjustment,
      label: adjustment.label.trim(),
      amount: this.parseAmount(adjustment.amount, true),
    }));
    const subtotal = lines.reduce(
      (sum, line) => sum.add(line.lineSubtotal),
      new Prisma.Decimal(0),
    );
    const adjustmentTotal = adjustments.reduce(
      (sum, adjustment) =>
        sum.add(
          adjustment.kind === QuoteAdjustmentKind.DISCOUNT
            ? adjustment.amount.neg()
            : adjustment.amount,
        ),
      new Prisma.Decimal(0),
    );
    const grandTotal = subtotal.add(adjustmentTotal);
    if (grandTotal.lt(0))
      throw new BadRequestException({
        code: 'QUOTE_TOTAL_INVALID',
        detail: 'The quotation total cannot be negative.',
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.quoteItem.deleteMany({ where: { quoteId: id } });
      await tx.quoteAdjustment.deleteMany({ where: { quoteId: id } });
      if (lines.length)
        await tx.quoteItem.createMany({
          data: lines.map((line) => ({ ...line, quoteId: id })),
        });
      if (adjustments.length)
        await tx.quoteAdjustment.createMany({
          data: adjustments.map(({ kind, label, amount, sortOrder }) => ({
            quoteId: id,
            kind,
            label,
            amount,
            sortOrder,
          })),
        });
      await tx.quote.update({
        where: { id, version: (quote as any).version },
        data: {
          customerNotes: dto.customerNotes,
          internalNotes: dto.internalNotes,
          estimatedLeadTimeDays: dto.estimatedLeadTimeDays,
          paymentTerms: dto.paymentTerms,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          subtotal,
          adjustmentTotal,
          grandTotal,
          version: { increment: 1 },
        },
      });
    });
    return this.findAdminQuote(actor, id);
  }

  async sendQuote(actor: Actor, id: string) {
    ensureAdmin(actor);
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { items: true, rfq: { include: { user: true } } },
    });
    if (!quote) throw new NotFoundException('QUOTE_NOT_FOUND');
    if (quote.status !== QuoteStatus.DRAFT)
      throw new ConflictException({
        code: 'QUOTE_IMMUTABLE',
        detail: 'Only draft quotations can be sent.',
      });
    const validationErrors: Array<{ field: string; message: string }> = [];
    if (!quote.items?.length)
      validationErrors.push({
        field: 'lines',
        message: 'Add at least one quotation line.',
      });
    quote.items?.forEach((item, index) => {
      if (item.quantity < 1)
        validationErrors.push({
          field: `lines.${index}.quantity`,
          message: 'Quantity must be at least 1.',
        });
      if (item.unitPrice.lte(0))
        validationErrors.push({
          field: `lines.${index}.unitPrice`,
          message: 'Enter a positive unit price before sending.',
        });
    });
    if (!quote.expiresAt || quote.expiresAt <= new Date())
      validationErrors.push({
        field: 'expiration',
        message: 'Choose a future expiration date.',
      });
    if (!quote.paymentTerms?.trim())
      validationErrors.push({
        field: 'paymentTerms',
        message: 'Payment terms are required.',
      });
    if (!quote.estimatedLeadTimeDays || quote.estimatedLeadTimeDays < 1)
      validationErrors.push({
        field: 'leadTime',
        message: 'Lead time must be at least 1 day.',
      });
    if (validationErrors.length)
      throw new BadRequestException({
        code: 'QUOTE_VALIDATION_FAILED',
        detail: 'Complete the highlighted quotation fields before sending.',
        errors: validationErrors,
      });
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.quote.update({
        where: { id },
        data: { status: QuoteStatus.SENT, sentAt: new Date() },
      });
      await tx.rfq.update({
        where: { id: quote.rfqId },
        data: { status: RfqStatus.QUOTED, version: { increment: 1 } },
      });
      await tx.quoteStatusHistory.create({
        data: {
          quoteId: id,
          actorUserId: actor.id,
          fromStatus: QuoteStatus.DRAFT,
          toStatus: QuoteStatus.SENT,
        },
      });
      await tx.rfqStatusHistory.create({
        data: {
          rfqId: quote.rfqId,
          actorUserId: actor.id,
          fromStatus: quote.rfq.status,
          toStatus: RfqStatus.QUOTED,
        },
      });
      await tx.emailOutbox.create({
        data: {
          kind: 'QUOTE_SENT',
          recipient: quote.rfq.user.email,
          subject: `Quotation ${quote.quoteNumber} is ready`,
          payload: { quoteId: quote.id, quoteNumber: quote.quoteNumber },
        },
      });
      return updated;
    });
    await this.audit(actor.id, 'QUOTE_SENT', {
      quoteId: id,
      rfqId: quote.rfqId,
    });
    await this.dispatchOutbox().catch(() => undefined);
    return this.findAdminQuote(actor, result.id);
  }

  async reviseQuote(actor: Actor, id: string) {
    ensureAdmin(actor);
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { items: true, adjustments: true },
    });
    const revisable: QuoteStatus[] = [
      QuoteStatus.SENT,
      QuoteStatus.DECLINED,
      QuoteStatus.EXPIRED,
    ];
    if (!quote || !revisable.includes(quote.status))
      throw new ConflictException({
        code: 'QUOTE_INVALID_STATE',
        detail: 'This quotation cannot be revised.',
      });
    await this.prisma.$transaction([
      this.prisma.quote.update({
        where: { id },
        data: { status: QuoteStatus.REPLACED },
      }),
      this.prisma.quoteStatusHistory.create({
        data: {
          quoteId: id,
          fromStatus: quote.status,
          toStatus: QuoteStatus.REPLACED,
          actorUserId: actor.id,
          note: 'Replaced by a new quotation revision.',
        },
      }),
    ]);
    await this.audit(actor.id, 'QUOTE_REVISION_CREATED', { quoteId: id });
    return this.createAdminQuote(actor, quote.rfqId, {
      items: quote.items.map((item) => ({
        rfqItemId: item.rfqItemId ?? undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      })),
      adjustments: quote.adjustments.map((item) => ({
        kind: item.kind,
        label: item.label,
        amount: item.amount.toString(),
        sortOrder: item.sortOrder,
      })),
      estimatedLeadTimeDays: quote.estimatedLeadTimeDays ?? undefined,
      paymentTerms: quote.paymentTerms ?? undefined,
      expiresAt: quote.expiresAt?.toISOString(),
      customerNotes: quote.customerNotes ?? undefined,
      internalNotes: quote.internalNotes ?? undefined,
    });
  }

  async acceptQuote(actor: Actor, id: string) {
    ensureCustomer(actor);
    const quote = await this.prisma.quote.findFirst({
      where: { id, rfq: { userId: actor.id } },
      include: { rfq: true },
    });
    if (!quote) throw new NotFoundException('QUOTE_NOT_FOUND');
    if (
      quote.status === QuoteStatus.SENT &&
      quote.expiresAt &&
      quote.expiresAt <= new Date()
    )
      await this.expireQuoteIfNeeded(id);
    const current = await this.prisma.quote.findUniqueOrThrow({
      where: { id },
      include: { rfq: true },
    });
    if (
      current.status !== QuoteStatus.SENT ||
      !current.expiresAt ||
      current.expiresAt <= new Date()
    )
      throw new ConflictException({
        code: 'QUOTE_NOT_ACCEPTABLE',
        detail: 'This quotation is no longer available.',
      });
    const latest = await this.prisma.quote.findFirst({
      where: { rfqId: current.rfqId },
      orderBy: { revision: 'desc' },
    });
    if (latest?.id !== id)
      throw new ConflictException({
        code: 'QUOTE_NOT_LATEST',
        detail: 'A newer quotation is available.',
      });
    await this.prisma.$transaction([
      this.prisma.quote.update({
        where: { id },
        data: { status: QuoteStatus.ACCEPTED, acceptedAt: new Date() },
      }),
      this.prisma.rfq.update({
        where: { id: current.rfqId },
        data: { status: RfqStatus.CLOSED, version: { increment: 1 } },
      }),
      this.prisma.quoteStatusHistory.create({
        data: {
          quoteId: id,
          actorUserId: actor.id,
          fromStatus: QuoteStatus.SENT,
          toStatus: QuoteStatus.ACCEPTED,
        },
      }),
      this.prisma.rfqStatusHistory.create({
        data: {
          rfqId: current.rfqId,
          actorUserId: actor.id,
          fromStatus: RfqStatus.QUOTED,
          toStatus: RfqStatus.CLOSED,
        },
      }),
    ]);
    await this.audit(actor.id, 'QUOTE_ACCEPTED', { quoteId: id });
    return this.findCustomerQuote(actor, id);
  }

  async declineQuote(actor: Actor, id: string, dto: QuoteDeclineDto) {
    ensureCustomer(actor);
    const quote = await this.prisma.quote.findFirst({
      where: { id, rfq: { userId: actor.id } },
      include: { rfq: true },
    });
    if (!quote) throw new NotFoundException('QUOTE_NOT_FOUND');
    if (quote.status !== QuoteStatus.SENT)
      throw new ConflictException({
        code: 'QUOTE_NOT_DECLINABLE',
        detail: 'Only sent quotations can be declined.',
      });
    await this.prisma.$transaction([
      this.prisma.quote.update({
        where: { id },
        data: {
          status: QuoteStatus.DECLINED,
          declinedAt: new Date(),
          declineReason: dto.reason,
        },
      }),
      this.prisma.rfq.update({
        where: { id: quote.rfqId },
        data: { status: RfqStatus.UNDER_REVIEW, version: { increment: 1 } },
      }),
      this.prisma.quoteStatusHistory.create({
        data: {
          quoteId: id,
          actorUserId: actor.id,
          fromStatus: QuoteStatus.SENT,
          toStatus: QuoteStatus.DECLINED,
          note: dto.reason,
        },
      }),
      this.prisma.rfqStatusHistory.create({
        data: {
          rfqId: quote.rfqId,
          actorUserId: actor.id,
          fromStatus: RfqStatus.QUOTED,
          toStatus: RfqStatus.UNDER_REVIEW,
        },
      }),
    ]);
    await this.audit(actor.id, 'QUOTE_DECLINED', { quoteId: id });
    return this.findCustomerQuote(actor, id);
  }

  async dispatchOutbox() {
    const pending = await this.prisma.emailOutbox.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        attempts: { lt: 5 },
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    for (const email of pending) {
      try {
        console.info(
          `[commerce email] ${email.recipient}: ${email.subject}`,
          email.payload,
        );
        await this.prisma.emailOutbox.update({
          where: { id: email.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            attempts: { increment: 1 },
          },
        });
      } catch (error) {
        await this.prisma.emailOutbox.update({
          where: { id: email.id },
          data: {
            status: 'FAILED',
            lastError:
              error instanceof Error ? error.message : 'Delivery failed',
            attempts: { increment: 1 },
            availableAt: new Date(
              Date.now() +
                Math.min(
                  60 * 60_000,
                  60_000 * 2 ** Math.min(email.attempts, 5),
                ),
            ),
          },
        });
        await this.audit(undefined, 'EMAIL_DELIVERY_FAILED', {
          outboxId: email.id,
          recipient: email.recipient,
          attempts: email.attempts + 1,
        });
      }
    }
  }
}
