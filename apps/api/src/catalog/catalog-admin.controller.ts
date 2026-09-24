/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AccessGuard, AdminGuard } from '../auth/auth.guard';
import type { AuthRequest } from '../auth/auth.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import {
  AdminCatalogQueryDto,
  BrandCreateDto,
  BrandUpdateDto,
  CategoryCreateDto,
  CategoryUpdateDto,
  ImageOrderDto,
  ImageUploadDto,
  ProductCreateDto,
  ProductStatusDto,
  ProductUpdateDto,
} from './catalog.dto';
import { CatalogService } from './catalog.service';

function imageMetadata<T extends { id: string; data: string }>(image: T) {
  const metadata = { ...image } as Omit<T, 'data'> & { data?: string };
  delete metadata.data;
  return { ...metadata, src: `/product-images/${image.id}` };
}

function adminProduct<
  T extends {
    images: { id: string; data: string }[];
    variants: { image: { id: string; data: string } | null }[];
  },
>(product: T) {
  return {
    ...product,
    images: product.images.map(imageMetadata),
    variants: product.variants.map((variant) => ({
      ...variant,
      image: variant.image ? imageMetadata(variant.image) : null,
    })),
  };
}

@Controller('admin')
@UseGuards(AccessGuard, AdminGuard, CsrfGuard)
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products') async products(@Query() query: AdminCatalogQueryDto) {
    const page = await this.catalog.listAdmin(query);
    return { ...page, items: page.items.map(adminProduct) };
  }
  @Get('products/:id') async product(@Param('id') id: string) {
    return adminProduct(await this.catalog.findAdmin(id));
  }
  @Post('products') async create(
    @Body() dto: ProductCreateDto,
    @Req() req: AuthRequest,
  ) {
    return adminProduct(await this.catalog.createProduct(dto, req.user?.id));
  }
  @Patch('products/:id') async update(
    @Param('id') id: string,
    @Body() dto: ProductUpdateDto,
    @Req() req: AuthRequest,
  ) {
    return adminProduct(
      await this.catalog.updateProduct(id, dto, req.user?.id),
    );
  }
  @Post('products/:id/duplicate') async duplicate(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return adminProduct(await this.catalog.duplicateProduct(id, req.user?.id));
  }
  @Patch('products/:id/status') async status(
    @Param('id') id: string,
    @Body() dto: ProductStatusDto,
    @Req() req: AuthRequest,
  ) {
    return adminProduct(
      await this.catalog.setProductStatus(id, dto, req.user?.id),
    );
  }
  @Post('products/:id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 },
    }),
  )
  image(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImageUploadDto,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.addImage(id, file, dto.altText ?? '', req.user?.id);
  }
  @Patch('products/:id/images/order') async orderImages(
    @Param('id') id: string,
    @Body() dto: ImageOrderDto,
    @Req() req: AuthRequest,
  ) {
    return adminProduct(await this.catalog.orderImages(id, dto, req.user?.id));
  }
  @Delete('products/:id/images/:imageId') async deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Req() req: AuthRequest,
  ) {
    return adminProduct(
      await this.catalog.deleteImage(id, imageId, req.user?.id),
    );
  }

  @Get('categories') categories() {
    return this.catalog.listAdminCategories();
  }
  @Post('categories') createCategory(
    @Body() dto: CategoryCreateDto,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.createCategory(dto, req.user?.id);
  }
  @Patch('categories/:id') updateCategory(
    @Param('id') id: string,
    @Body() dto: CategoryUpdateDto,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.updateCategory(id, dto, req.user?.id);
  }
  @Delete('categories/:id') deleteCategory(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.deleteCategory(id, req.user?.id);
  }

  @Get('brands') brands() {
    return this.catalog.listAdminBrands();
  }
  @Post('brands') createBrand(
    @Body() dto: BrandCreateDto,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.createBrand(dto, req.user?.id);
  }
  @Patch('brands/:id') updateBrand(
    @Param('id') id: string,
    @Body() dto: BrandUpdateDto,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.updateBrand(id, dto, req.user?.id);
  }
  @Delete('brands/:id') deleteBrand(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.deleteBrand(id, req.user?.id);
  }
}
