import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProductAvailability,
  ProductKind,
  ProductPriceVisibility,
  ProductSaleMode,
  ProductStatus,
  VariantPriceMode,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminCatalogQueryDto,
  BrandCreateDto,
  BrandUpdateDto,
  CategoryCreateDto,
  CategoryUpdateDto,
  CatalogQueryDto,
  ImageOrderDto,
  ProductCreateDto,
  ProductStatusDto,
  ProductUpdateDto,
} from './catalog.dto';
import {
  ImageStorageService,
  MAX_PRODUCT_IMAGES,
} from './image-storage.service';

const productInclude = {
  category: true,
  brand: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      image: true,
      priceTiers: { orderBy: { minimumQuantity: 'asc' as const } },
    },
  },
  specifications: {
    orderBy: [{ groupName: 'asc' as const }, { sortOrder: 'asc' as const }],
  },
  priceTiers: {
    where: { variantId: null },
    orderBy: { minimumQuantity: 'asc' as const },
  },
} satisfies Prisma.ProductInclude;

type FullProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type Tx = Prisma.TransactionClient;

export function slugify(value: string) {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 160) || 'item'
  );
}

function decimal(value: string | number | null | undefined) {
  if (value === undefined || value === null || value === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(String(value)))
    throw new BadRequestException('INVALID_PRICE');
  return new Prisma.Decimal(String(value));
}

function isoDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function activeDiscount(product: FullProduct, now = new Date()) {
  if (!product.discountPrice || !product.regularPrice) return false;
  if (product.discountStartAt && product.discountStartAt > now) return false;
  if (product.discountEndAt && product.discountEndAt < now) return false;
  return true;
}

function productPrice(product: FullProduct, now = new Date()) {
  if (product.priceVisibility === ProductPriceVisibility.HIDE_PRICE)
    return null;
  return (
    (activeDiscount(product, now)
      ? product.discountPrice
      : product.regularPrice
    )?.toString() ?? null
  );
}

function variantPrice(
  product: FullProduct,
  variant: FullProduct['variants'][number],
) {
  const base = productPrice(product);
  if (variant.priceMode === VariantPriceMode.FIXED)
    return variant.fixedPrice?.toString() ?? null;
  if (
    variant.priceMode === VariantPriceMode.ADJUSTMENT &&
    base &&
    variant.priceAdjustment
  )
    return new Prisma.Decimal(base).add(variant.priceAdjustment).toString();
  return base;
}

function imageDto(image: FullProduct['images'][number]) {
  return {
    id: image.id,
    src: `/product-images/${image.id}`,
    altText: image.altText,
    mimeType: image.mimeType,
    byteSize: image.byteSize,
    sortOrder: image.sortOrder,
    isPrimary: image.isPrimary,
  };
}

function publicProduct(product: FullProduct) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    },
    brand: product.brand
      ? {
          id: product.brand.id,
          name: product.brand.name,
          slug: product.brand.slug,
        }
      : null,
    internalSku: product.internalSku,
    unit: product.unit,
    countryOfOrigin: product.countryOfOrigin,
    minimumOrderQuantity: product.minimumOrderQuantity,
    leadTimeDays: product.leadTimeDays,
    leadTimeNote: product.leadTimeNote,
    availability: product.availability,
    saleMode: product.saleMode,
    priceVisibility: product.priceVisibility,
    currency: product.currency,
    price: productPrice(product),
    regularPrice:
      product.priceVisibility === ProductPriceVisibility.SHOW_PRICE
        ? (product.regularPrice?.toString() ?? null)
        : null,
    discountPrice:
      product.priceVisibility === ProductPriceVisibility.SHOW_PRICE
        ? activeDiscount(product)
          ? (product.discountPrice?.toString() ?? null)
          : null
        : null,
    showStartingFrom: product.showStartingFrom,
    allowRfqAtAnyQuantity: product.allowRfqAtAnyQuantity,
    directPurchaseMaxQuantity: product.directPurchaseMaxQuantity,
    rfqThreshold: product.rfqThreshold,
    productKind: product.productKind,
    featured: product.featured,
    status: product.status,
    seoTitle: product.seoTitle ?? product.name,
    seoDescription: product.seoDescription ?? product.shortDescription,
    images: product.images.map(imageDto),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      attributes: variant.attributes,
      priceMode: variant.priceMode,
      price: variantPrice(product, variant),
      availability: variant.availability,
      availableQuantity: variant.availableQuantity,
      image: variant.image ? imageDto(variant.image) : null,
      priceTiers: variant.priceTiers.map((tier) => ({
        minimumQuantity: tier.minimumQuantity,
        unitPrice: tier.unitPrice.toString(),
      })),
    })),
    specifications: product.specifications.map((specification) => ({
      groupName: specification.groupName,
      name: specification.name,
      value: specification.value,
    })),
    priceTiers: product.priceTiers.map((tier) => ({
      minimumQuantity: tier.minimumQuantity,
      unitPrice: tier.unitPrice.toString(),
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ImageStorageService,
  ) {}

  private async uniqueCategorySlug(value: string, excludeId?: string) {
    const base = slugify(value);
    let candidate = base;
    let index = 2;
    while (
      await this.prisma.category.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      })
    )
      candidate = `${base}-${index++}`;
    return candidate;
  }

  private async uniqueBrandSlug(value: string, excludeId?: string) {
    const base = slugify(value);
    let candidate = base;
    let index = 2;
    while (
      await this.prisma.brand.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      })
    )
      candidate = `${base}-${index++}`;
    return candidate;
  }

  private async uniqueProductSlug(value: string, excludeId?: string) {
    const base = slugify(value);
    let candidate = base;
    let index = 2;
    while (
      await this.prisma.product.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      })
    )
      candidate = `${base}-${index++}`;
    return candidate;
  }

  private async audit(
    actorUserId: string | undefined,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    if (!actorUserId) return;
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  async listPublic(query: CatalogQueryDto) {
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.PUBLISHED,
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.brand ? { brand: { slug: query.brand } } : {}),
      ...(query.availability?.length
        ? { availability: { in: query.availability } }
        : {}),
      ...(query.saleMode?.length ? { saleMode: { in: query.saleMode } } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            regularPrice: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { shortDescription: { contains: query.q, mode: 'insensitive' } },
              { internalSku: { contains: query.q, mode: 'insensitive' } },
              {
                category: { name: { contains: query.q, mode: 'insensitive' } },
              },
              { brand: { name: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { regularPrice: 'asc' }
        : query.sort === 'price_desc'
          ? { regularPrice: 'desc' }
          : { createdAt: 'desc' };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: items.map((item) => publicProduct(item)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async findPublic(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.PUBLISHED },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return publicProduct(product);
  }

  async findPublicCategory(slug: string, query: CatalogQueryDto) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { parent: true, children: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!category) throw new NotFoundException('CATEGORY_NOT_FOUND');
    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parent: category.parent
          ? { name: category.parent.name, slug: category.parent.slug }
          : null,
        children: category.children.map((child) => ({
          name: child.name,
          slug: child.slug,
        })),
      },
      products: await this.listPublic({ ...query, category: slug }),
    };
  }

  async findPublicBrand(slug: string, query: CatalogQueryDto) {
    const brand = await this.prisma.brand.findUnique({ where: { slug } });
    if (!brand) throw new NotFoundException('BRAND_NOT_FOUND');
    return {
      brand: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
      },
      products: await this.listPublic({ ...query, brand: slug }),
    };
  }

  async publicCategories() {
    return this.prisma.category.findMany({
      where: {
        OR: [
          { products: { some: { status: ProductStatus.PUBLISHED } } },
          { parentId: null },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      },
    });
  }

  async publicBrands() {
    return this.prisma.brand.findMany({
      where: { products: { some: { status: ProductStatus.PUBLISHED } } },
      orderBy: { name: 'asc' },
    });
  }

  async listAdmin(query: AdminCatalogQueryDto) {
    const where: Prisma.ProductWhereInput = {
      ...(query.status?.length ? { status: { in: query.status } } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.brand ? { brand: { slug: query.brand } } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { internalSku: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async findAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return product;
  }

  private productBase(
    dto: ProductCreateDto,
    slug: string,
  ): Prisma.ProductUncheckedCreateInput {
    return {
      name: dto.name.trim(),
      slug,
      shortDescription: dto.shortDescription?.trim(),
      fullDescription: dto.fullDescription?.trim(),
      categoryId: dto.categoryId,
      brandId: dto.brandId ?? null,
      internalSku: dto.internalSku.trim(),
      unit: dto.unit.trim(),
      countryOfOrigin: dto.countryOfOrigin.toUpperCase(),
      minimumOrderQuantity: dto.minimumOrderQuantity,
      leadTimeDays: dto.leadTimeDays ?? null,
      leadTimeNote: dto.leadTimeNote?.trim(),
      availability: dto.availability ?? ProductAvailability.AVAILABLE_TO_ORDER,
      saleMode: dto.saleMode ?? ProductSaleMode.DIRECT_PURCHASE,
      priceVisibility: dto.priceVisibility ?? ProductPriceVisibility.SHOW_PRICE,
      regularPrice: decimal(dto.regularPrice),
      discountPrice: decimal(dto.discountPrice),
      discountStartAt: isoDate(dto.discountStartAt),
      discountEndAt: isoDate(dto.discountEndAt),
      showStartingFrom: dto.showStartingFrom ?? false,
      allowRfqAtAnyQuantity: dto.allowRfqAtAnyQuantity ?? false,
      directPurchaseMaxQuantity: dto.directPurchaseMaxQuantity ?? null,
      rfqThreshold: dto.rfqThreshold ?? null,
      productKind:
        dto.productKind ??
        (dto.variants && dto.variants.length > 1
          ? ProductKind.CONFIGURABLE
          : ProductKind.SIMPLE),
      featured: dto.featured ?? false,
      status: ProductStatus.DRAFT,
      seoTitle: dto.seoTitle?.trim(),
      seoDescription: dto.seoDescription?.trim(),
    };
  }

  private async replaceNested(
    tx: Tx,
    productId: string,
    dto: ProductCreateDto,
  ) {
    if (dto.variants !== undefined) {
      const variants = dto.variants.length
        ? dto.variants
        : [
            {
              sku: dto.internalSku,
              name: 'Default',
              attributes: {},
              priceMode: VariantPriceMode.INHERIT,
            },
          ];
      const existing = await tx.productVariant.findMany({
        where: { productId },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((variant) => variant.id));
      const retainedIds: string[] = [];
      for (const [index, variant] of variants.entries()) {
        if (variant.id && !existingIds.has(variant.id))
          throw new BadRequestException({
            code: 'VARIANT_NOT_FOUND',
            detail: 'A submitted variant does not belong to this product.',
          });
        const data = {
          sku: variant.sku.trim(),
          name: variant.name.trim(),
          attributes: variant.attributes,
          priceMode: variant.priceMode ?? VariantPriceMode.INHERIT,
          priceAdjustment: decimal(variant.priceAdjustment),
          fixedPrice: decimal(variant.fixedPrice),
          availability:
            variant.availability ??
            dto.availability ??
            ProductAvailability.AVAILABLE_TO_ORDER,
          availableQuantity: variant.availableQuantity ?? null,
          imageId: variant.imageId ?? null,
          isDefault: index === 0,
          sortOrder: variant.sortOrder ?? index,
        };
        const saved = variant.id
          ? await tx.productVariant.update({
              where: { id: variant.id },
              data,
            })
          : await tx.productVariant.create({
              data: { ...data, productId },
            });
        retainedIds.push(saved.id);
        await tx.priceTier.deleteMany({
          where: { productId, variantId: saved.id },
        });
        if (variant.priceTiers?.length)
          await tx.priceTier.createMany({
            data: variant.priceTiers.map((tier) => ({
              productId,
              variantId: saved.id,
              minimumQuantity: tier.minimumQuantity,
              unitPrice: decimal(tier.unitPrice)!,
            })),
          });
      }
      await tx.productVariant.deleteMany({
        where: {
          productId,
          ...(retainedIds.length ? { id: { notIn: retainedIds } } : {}),
        },
      });
    }
    if (dto.specifications !== undefined) {
      await tx.productSpecification.deleteMany({ where: { productId } });
      if (dto.specifications.length)
        await tx.productSpecification.createMany({
          data: dto.specifications.map((specification, index) => ({
            productId,
            groupName: specification.groupName.trim(),
            name: specification.name.trim(),
            value: specification.value.trim(),
            sortOrder: specification.sortOrder ?? index,
          })),
        });
    }
    if (dto.priceTiers !== undefined) {
      await tx.priceTier.deleteMany({ where: { productId, variantId: null } });
      if (dto.priceTiers.length)
        await tx.priceTier.createMany({
          data: dto.priceTiers.map((tier) => ({
            productId,
            variantId: null,
            minimumQuantity: tier.minimumQuantity,
            unitPrice: decimal(tier.unitPrice)!,
          })),
        });
    }
  }

  private async validateForPublish(tx: Tx, productId: string) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        variants: { include: { priceTiers: true } },
        specifications: true,
        priceTiers: true,
      },
    });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const errors: Array<{ field: string; message: string }> = [];
    if (!product.name.trim())
      errors.push({
        field: 'identity.name',
        message: 'Product name is required.',
      });
    if (!product.shortDescription?.trim())
      errors.push({
        field: 'identity.shortDescription',
        message: 'Short description is required.',
      });
    if (!product.fullDescription?.trim())
      errors.push({
        field: 'identity.fullDescription',
        message: 'Full description is required.',
      });
    if (!product.categoryId)
      errors.push({
        field: 'merchandising.categoryId',
        message: 'Category is required.',
      });
    if (!product.internalSku.trim())
      errors.push({
        field: 'identity.internalSku',
        message: 'SKU is required.',
      });
    if (!product.unit.trim())
      errors.push({ field: 'identity.unit', message: 'Unit is required.' });
    if (!product.countryOfOrigin)
      errors.push({
        field: 'merchandising.countryOfOrigin',
        message: 'Country of origin is required.',
      });
    if (product.minimumOrderQuantity < 1)
      errors.push({
        field: 'sales.minimumOrderQuantity',
        message: 'MOQ must be at least 1.',
      });
    if (!product.leadTimeDays && !product.leadTimeNote)
      errors.push({
        field: 'merchandising.leadTime',
        message: 'Lead time is required.',
      });
    if (!product.images.some((image) => image.isPrimary))
      errors.push({ field: 'images', message: 'A primary image is required.' });
    if (!product.variants.length)
      errors.push({
        field: 'variants',
        message: 'At least one variant is required.',
      });
    if (
      product.saleMode !== ProductSaleMode.RFQ_ONLY &&
      (product.priceVisibility !== ProductPriceVisibility.SHOW_PRICE ||
        !product.regularPrice ||
        product.regularPrice.lte(0))
    )
      errors.push({
        field: 'sales.regularPrice',
        message: 'Direct-purchase products need a visible regular price.',
      });
    if (
      product.priceVisibility === ProductPriceVisibility.SHOW_PRICE &&
      product.saleMode === ProductSaleMode.RFQ_ONLY &&
      product.regularPrice?.lte(0)
    )
      errors.push({
        field: 'sales.regularPrice',
        message: 'An indicative price must be positive when shown.',
      });
    if (
      product.discountPrice &&
      (!product.regularPrice || product.discountPrice.gte(product.regularPrice))
    )
      errors.push({
        field: 'sales.discountPrice',
        message: 'Discount price must be lower than regular price.',
      });
    if (
      (product.discountStartAt &&
        product.discountEndAt &&
        product.discountStartAt >= product.discountEndAt) ||
      (!!product.discountPrice &&
        !product.discountStartAt &&
        !product.discountEndAt)
    )
      errors.push({
        field: 'sales.discountDates',
        message: 'Discount dates must define a valid active window.',
      });
    if (
      product.saleMode === ProductSaleMode.HYBRID &&
      (!product.directPurchaseMaxQuantity ||
        !product.rfqThreshold ||
        product.directPurchaseMaxQuantity < product.minimumOrderQuantity ||
        product.rfqThreshold !== product.directPurchaseMaxQuantity + 1)
    )
      errors.push({
        field: 'sales.hybridThreshold',
        message:
          'Hybrid direct and RFQ quantities must be contiguous and valid.',
      });
    for (const variant of product.variants) {
      if (
        variant.priceMode === VariantPriceMode.ADJUSTMENT &&
        !variant.priceAdjustment
      )
        errors.push({
          field: 'variants',
          message: `Variant ${variant.sku} needs a price adjustment.`,
        });
      if (
        variant.priceMode === VariantPriceMode.FIXED &&
        (!variant.fixedPrice || variant.fixedPrice.lte(0))
      )
        errors.push({
          field: 'variants',
          message: `Variant ${variant.sku} needs a fixed price.`,
        });
    }
    if (errors.length)
      throw new BadRequestException({
        code: 'PRODUCT_VALIDATION_FAILED',
        detail: 'Complete the highlighted product sections before publishing.',
        errors,
      });
    return product;
  }

  async createProduct(dto: ProductCreateDto, actorUserId?: string) {
    const slug = await this.uniqueProductSlug(dto.slug || dto.name);
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: this.productBase(dto, slug),
        });
        await this.replaceNested(tx, created.id, {
          ...dto,
          variants: dto.variants ?? [],
        });
        return tx.product.findUniqueOrThrow({
          where: { id: created.id },
          include: productInclude,
        });
      });
      await this.audit(actorUserId, 'PRODUCT_CREATED', {
        productId: product.id,
        slug: product.slug,
      });
      return product;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('PRODUCT_IDENTIFIER_IN_USE');
      throw error;
    }
  }

  async updateProduct(id: string, dto: ProductUpdateDto, actorUserId?: string) {
    const existing = await this.findAdmin(id);
    if (
      existing.status === ProductStatus.PUBLISHED &&
      dto.slug &&
      dto.slug !== existing.slug
    )
      throw new BadRequestException('PUBLISHED_SLUG_LOCKED');
    const slug =
      dto.slug && dto.slug !== existing.slug
        ? await this.uniqueProductSlug(dto.slug, id)
        : existing.slug;
    const product = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.ProductUncheckedUpdateInput = {
        ...this.productBase({ ...existing, ...dto } as ProductCreateDto, slug),
        slug,
      };
      delete data.status;
      delete data.createdAt;
      delete data.updatedAt;
      await tx.product.update({ where: { id }, data });
      await this.replaceNested(tx, id, {
        ...existing,
        ...dto,
      } as ProductCreateDto);
      if (existing.status === ProductStatus.PUBLISHED)
        await this.validateForPublish(tx, id);
      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productInclude,
      });
    });
    await this.audit(actorUserId, 'PRODUCT_UPDATED', { productId: id });
    return product;
  }

  async setProductStatus(
    id: string,
    dto: ProductStatusDto,
    actorUserId?: string,
  ) {
    await this.findAdmin(id);
    if (dto.status === ProductStatus.PUBLISHED)
      await this.prisma.$transaction((tx) => this.validateForPublish(tx, id));
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status !== ProductStatus.PUBLISHED ? { featured: false } : {}),
      },
      include: productInclude,
    });
    await this.audit(actorUserId, `PRODUCT_${dto.status}`, { productId: id });
    return product;
  }

  async duplicateProduct(id: string, actorUserId?: string) {
    const source = await this.findAdmin(id);
    const product = await this.prisma.$transaction(async (tx) => {
      const slug = await this.uniqueProductSlug(`${source.slug}-copy`);
      const suffix = randomUUID().slice(0, 8).toUpperCase();
      const copy = await tx.product.create({
        data: {
          ...this.productBase(source as unknown as ProductCreateDto, slug),
          name: `${source.name} Copy`,
          internalSku: `${source.internalSku.slice(0, 90)}-C${suffix}`,
          status: ProductStatus.DRAFT,
          featured: false,
        },
      });
      const imageIds = new Map<string, string>();
      for (const image of source.images) {
        const copiedImage = await tx.productImage.create({
          data: {
            productId: copy.id,
            data: image.data,
            mimeType: image.mimeType,
            originalFileName: image.originalFileName,
            byteSize: image.byteSize,
            altText: image.altText,
            sortOrder: image.sortOrder,
            isPrimary: image.isPrimary,
          },
        });
        imageIds.set(image.id, copiedImage.id);
      }
      await this.replaceNested(tx, copy.id, {
        internalSku: `${source.internalSku.slice(0, 90)}-C${suffix}`,
        availability: source.availability,
        variants: source.variants.map((variant) => ({
          sku: `${variant.sku.slice(0, 88)}-C${suffix}`,
          name: variant.name,
          attributes: variant.attributes as Record<string, string>,
          priceMode: variant.priceMode,
          priceAdjustment: variant.priceAdjustment?.toString(),
          fixedPrice: variant.fixedPrice?.toString(),
          availability: variant.availability,
          availableQuantity: variant.availableQuantity ?? undefined,
          imageId: variant.imageId ? imageIds.get(variant.imageId) : undefined,
          sortOrder: variant.sortOrder,
          priceTiers: variant.priceTiers.map((tier) => ({
            minimumQuantity: tier.minimumQuantity,
            unitPrice: tier.unitPrice.toString(),
          })),
        })),
        specifications: source.specifications.map((specification) => ({
          groupName: specification.groupName,
          name: specification.name,
          value: specification.value,
          sortOrder: specification.sortOrder,
        })),
        priceTiers: source.priceTiers.map((tier) => ({
          minimumQuantity: tier.minimumQuantity,
          unitPrice: tier.unitPrice.toString(),
        })),
      } as ProductCreateDto);
      return tx.product.findUniqueOrThrow({
        where: { id: copy.id },
        include: productInclude,
      });
    });
    await this.audit(actorUserId, 'PRODUCT_DUPLICATED', {
      sourceProductId: id,
      productId: product.id,
    });
    return product;
  }

  async addImage(
    productId: string,
    file: Express.Multer.File,
    altText: string,
    actorUserId?: string,
  ) {
    const product = await this.findAdmin(productId);
    if (product.images.length >= MAX_PRODUCT_IMAGES)
      throw new BadRequestException('IMAGE_LIMIT_REACHED');
    const processed = await this.imageStorage.process(file);
    const image = await this.prisma.productImage.create({
      data: {
        productId,
        data: processed.data,
        mimeType: processed.mimeType,
        originalFileName: processed.originalFileName,
        byteSize: processed.byteSize,
        altText: altText.trim(),
        sortOrder: product.images.length,
        isPrimary: product.images.length === 0,
      },
    });
    await this.audit(actorUserId, 'PRODUCT_IMAGE_ADDED', {
      productId,
      imageId: image.id,
    });
    return imageDto(image);
  }

  async orderImages(
    productId: string,
    dto: ImageOrderDto,
    actorUserId?: string,
  ) {
    const product = await this.findAdmin(productId);
    const existing = new Set(product.images.map((image) => image.id));
    if (
      existing.size !== dto.imageIds.length ||
      dto.imageIds.some((id) => !existing.has(id)) ||
      !existing.has(dto.primaryImageId)
    )
      throw new BadRequestException('IMAGE_ORDER_INVALID');
    await this.prisma.$transaction(
      dto.imageIds.map((id, index) =>
        this.prisma.productImage.update({
          where: { id },
          data: { sortOrder: index, isPrimary: id === dto.primaryImageId },
        }),
      ),
    );
    await this.audit(actorUserId, 'PRODUCT_IMAGES_REORDERED', { productId });
    return this.findAdmin(productId);
  }

  async deleteImage(productId: string, imageId: string, actorUserId?: string) {
    const product = await this.findAdmin(productId);
    const image = product.images.find((candidate) => candidate.id === imageId);
    if (!image) throw new NotFoundException('IMAGE_NOT_FOUND');
    if (
      product.status === ProductStatus.PUBLISHED &&
      product.images.length === 1
    )
      throw new BadRequestException('PUBLISHED_PRODUCT_NEEDS_IMAGE');
    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });
      const remaining = await tx.productImage.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      for (const [index, remainingImage] of remaining.entries())
        await tx.productImage.update({
          where: { id: remainingImage.id },
          data: {
            sortOrder: index,
            isPrimary: image.isPrimary ? index === 0 : remainingImage.isPrimary,
          },
        });
    });
    await this.audit(actorUserId, 'PRODUCT_IMAGE_DELETED', {
      productId,
      imageId,
    });
    return this.findAdmin(productId);
  }

  async createCategory(dto: CategoryCreateDto, actorUserId?: string) {
    const category = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug: await this.uniqueCategorySlug(dto.slug || dto.name),
        description: dto.description?.trim(),
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit(actorUserId, 'CATEGORY_CREATED', {
      categoryId: category.id,
    });
    return category;
  }

  async listAdminCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    });
  }

  async updateCategory(
    id: string,
    dto: CategoryUpdateDto,
    actorUserId?: string,
  ) {
    const current = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('CATEGORY_NOT_FOUND');
    if (dto.parentId === id) throw new BadRequestException('CATEGORY_CYCLE');
    if (dto.parentId) {
      let cursor = dto.parentId;
      for (let i = 0; i < 100 && cursor; i++) {
        if (cursor === id) throw new BadRequestException('CATEGORY_CYCLE');
        cursor =
          (
            await this.prisma.category.findUnique({
              where: { id: cursor },
              select: { parentId: true },
            })
          )?.parentId ?? '';
      }
    }
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        slug: dto.slug
          ? await this.uniqueCategorySlug(dto.slug, id)
          : undefined,
        description: dto.description?.trim(),
        parentId: dto.parentId,
        sortOrder: dto.sortOrder,
      },
    });
    await this.audit(actorUserId, 'CATEGORY_UPDATED', { categoryId: id });
    return category;
  }

  async deleteCategory(id: string, actorUserId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, products: { take: 1 } },
    });
    if (!category) throw new NotFoundException('CATEGORY_NOT_FOUND');
    if (category.children.length || category.products.length)
      throw new ConflictException('CATEGORY_IN_USE');
    await this.prisma.category.delete({ where: { id } });
    await this.audit(actorUserId, 'CATEGORY_DELETED', { categoryId: id });
    return { id };
  }

  async createBrand(dto: BrandCreateDto, actorUserId?: string) {
    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name.trim(),
        slug: await this.uniqueBrandSlug(dto.slug || dto.name),
        description: dto.description?.trim(),
      },
    });
    await this.audit(actorUserId, 'BRAND_CREATED', { brandId: brand.id });
    return brand;
  }

  async listAdminBrands() {
    return this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async updateBrand(id: string, dto: BrandUpdateDto, actorUserId?: string) {
    await this.prisma.brand.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundException('BRAND_NOT_FOUND');
    });
    const brand = await this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        slug: dto.slug ? await this.uniqueBrandSlug(dto.slug, id) : undefined,
        description: dto.description?.trim(),
      },
    });
    await this.audit(actorUserId, 'BRAND_UPDATED', { brandId: id });
    return brand;
  }

  async deleteBrand(id: string, actorUserId?: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { products: { take: 1 } },
    });
    if (!brand) throw new NotFoundException('BRAND_NOT_FOUND');
    if (brand.products.length) throw new ConflictException('BRAND_IN_USE');
    await this.prisma.brand.delete({ where: { id } });
    await this.audit(actorUserId, 'BRAND_DELETED', { brandId: id });
    return { id };
  }
}
