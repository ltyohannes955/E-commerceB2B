import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

for (const envPath of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(process.cwd(), 'apps/api/.env'),
]) {
  try {
    loadEnvFile(envPath);
  } catch {
    // Optional local environment files are loaded when present.
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME?.trim();
  if (!email || !password || !fullName)
    throw new Error(
      'ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_FULL_NAME are required',
    );
  if (password.length < 8)
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== 'ADMIN')
    throw new Error('ADMIN_EMAIL belongs to a customer; refusing promotion');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email },
    update: { fullName },
    create: {
      email,
      fullName,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      legalVersion: 'phase1-draft',
    },
  });
  console.log(`Admin seed ensured for ${email}`);

  if (process.env.CATALOG_SEED_ENABLED !== 'true') return;

  const categoryRows = [
    [
      'Industrial equipment',
      'industrial-equipment',
      'Tools and machinery for growing operations.',
      null,
    ],
    [
      'Lighting & electrical',
      'lighting-electrical',
      'Commercial lighting and dependable power systems.',
      null,
    ],
    [
      'Office & retail',
      'office-retail',
      'Practical stock for professional spaces.',
      null,
    ],
    [
      'Hospitality essentials',
      'hospitality-essentials',
      'Equipment and supplies for hospitality teams.',
      null,
    ],
    [
      'Commercial kitchen',
      'commercial-kitchen',
      'Durable kitchen equipment for high-volume service.',
      'industrial-equipment',
    ],
    [
      'Solar & backup power',
      'solar-backup-power',
      'Power continuity for businesses and facilities.',
      'lighting-electrical',
    ],
    [
      'Workplace furniture',
      'workplace-furniture',
      'Comfortable, durable furniture for modern teams.',
      'office-retail',
    ],
    [
      'Guest room supplies',
      'guest-room-supplies',
      'Guest-ready supplies for hotels and furnished stays.',
      'hospitality-essentials',
    ],
  ] as const;
  const categoryIds = new Map<string, string>();
  for (const [name, slug, description, parentSlug] of categoryRows) {
    const parentId = parentSlug ? categoryIds.get(parentSlug) : undefined;
    const row = await prisma.category.upsert({
      where: { slug },
      update: { name, description, parentId },
      create: { name, slug, description, parentId },
    });
    categoryIds.set(slug, row.id);
  }
  const brands = [
    [
      'Gulfline Commercial',
      'gulfline-commercial',
      'Commercial equipment selected for demanding service environments.',
    ],
    [
      'LumaForge',
      'lumaforge',
      'Architectural lighting with a warm, efficient finish.',
    ],
    [
      'Sunridge Power',
      'sunridge-power',
      'Practical solar and backup power systems.',
    ],
    [
      'Nile Workspace',
      'nile-workspace',
      'Ergonomic workplace essentials for focused teams.',
    ],
  ] as const;
  const brandIds = new Map<string, string>();
  for (const [name, slug, description] of brands) {
    const row = await prisma.brand.upsert({
      where: { slug },
      update: { name, description },
      create: { name, slug, description },
    });
    brandIds.set(slug, row.id);
  }
  const products = [
    {
      name: 'Stainless prep table 1800',
      slug: 'stainless-prep-table-1800',
      sku: 'GL-KIT-1800',
      category: 'commercial-kitchen',
      brand: 'gulfline-commercial',
      mode: 'DIRECT_PURCHASE' as const,
      price: '185000.00',
      image: 0,
      description:
        'A rolled-edge stainless prep table built for busy commercial kitchens.',
    },
    {
      name: 'Convection oven 10-tray',
      slug: 'convection-oven-10-tray',
      sku: 'GL-OVN-10T',
      category: 'commercial-kitchen',
      brand: 'gulfline-commercial',
      mode: 'HYBRID' as const,
      price: '495000.00',
      image: 0,
      description:
        'Even heat and simple controls for bakeries, cafés, and hotel kitchens.',
    },
    {
      name: 'Halo ring pendant 60W',
      slug: 'halo-ring-pendant-60w',
      sku: 'LF-HALO-60',
      category: 'lighting-electrical',
      brand: 'lumaforge',
      mode: 'DIRECT_PURCHASE' as const,
      price: '24500.00',
      image: 1,
      description:
        'A dimmable statement pendant for reception areas and hospitality interiors.',
    },
    {
      name: 'Linear office light 120cm',
      slug: 'linear-office-light-120cm',
      sku: 'LF-LINE-120',
      category: 'lighting-electrical',
      brand: 'lumaforge',
      mode: 'RFQ_ONLY' as const,
      price: null,
      image: 1,
      description:
        'Low-glare linear lighting for open offices and retail environments.',
    },
    {
      name: 'Hybrid inverter 5kW',
      slug: 'hybrid-inverter-5kw',
      sku: 'SP-INV-5K',
      category: 'solar-backup-power',
      brand: 'sunridge-power',
      mode: 'HYBRID' as const,
      price: '168000.00',
      image: 2,
      description:
        'Reliable hybrid power conversion for small commercial sites.',
    },
    {
      name: 'LiFePO4 battery 5.1kWh',
      slug: 'lifepo4-battery-51kwh',
      sku: 'SP-BAT-51',
      category: 'solar-backup-power',
      brand: 'sunridge-power',
      mode: 'RFQ_ONLY' as const,
      price: null,
      image: 2,
      description:
        'A compact, serviceable storage module for backup and solar systems.',
    },
    {
      name: 'Ergonomic mesh task chair',
      slug: 'ergonomic-mesh-task-chair',
      sku: 'NW-CHAIR-M1',
      category: 'workplace-furniture',
      brand: 'nile-workspace',
      mode: 'DIRECT_PURCHASE' as const,
      price: '38500.00',
      image: 3,
      description:
        'Adjustable support for long workdays, meeting rooms, and shared desks.',
    },
    {
      name: 'Executive meeting table 2400',
      slug: 'executive-meeting-table-2400',
      sku: 'NW-TABLE-24',
      category: 'workplace-furniture',
      brand: 'nile-workspace',
      mode: 'HYBRID' as const,
      price: '225000.00',
      image: 3,
      description:
        'A durable meeting table with a calm, professional presence.',
    },
  ];
  const sheet = await readFile(
    join(__dirname, 'seed-assets', 'catalog-contact-sheet.png'),
  );
  for (const [index, item] of products.entries()) {
    const categoryId = categoryIds.get(item.category)!;
    const brandId = brandIds.get(item.brand)!;
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        shortDescription: item.description,
        categoryId,
        brandId,
        saleMode: item.mode,
        regularPrice: item.price,
        status: 'PUBLISHED',
        featured: index < 4,
      },
      create: {
        name: item.name,
        slug: item.slug,
        shortDescription: item.description,
        categoryId,
        brandId,
        internalSku: item.sku,
        unit: 'piece',
        countryOfOrigin: 'AE',
        minimumOrderQuantity: index % 3 === 0 ? 1 : 5,
        leadTimeDays: 21,
        availability: index === 5 ? 'AVAILABLE_TO_ORDER' : 'IN_STOCK',
        saleMode: item.mode,
        priceVisibility: item.price ? 'SHOW_PRICE' : 'HIDE_PRICE',
        regularPrice: item.price,
        showStartingFrom: index === 1,
        productKind: index % 2 ? 'CONFIGURABLE' : 'SIMPLE',
        status: 'PUBLISHED',
        featured: index < 4,
      },
    });
    if (
      (await prisma.productImage.count({
        where: { productId: product.id },
      })) === 0
    ) {
      const tile = 627;
      const left = (item.image % 2) * tile;
      const top = Math.floor(item.image / 2) * tile;
      const image = await sharp(sheet)
        .extract({ left, top, width: tile, height: tile })
        .resize(1200, 1200, { fit: 'inside' })
        .webp({ quality: 82 })
        .toBuffer();
      await prisma.productImage.create({
        data: {
          productId: product.id,
          data: image.toString('base64'),
          mimeType: 'image/webp',
          originalFileName: `${item.slug}.webp`,
          byteSize: image.byteLength,
          altText: item.name,
          isPrimary: true,
        },
      });
    }
    if (
      (await prisma.productVariant.count({
        where: { productId: product.id },
      })) === 0
    )
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: item.sku,
          name: 'Standard',
          attributes: {},
          isDefault: true,
          priceMode: 'INHERIT',
        },
      });
  }
  console.log(`Catalog seed ensured ${products.length} products.`);
}
main().finally(() => prisma.$disconnect());
