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

@Controller('admin')
@UseGuards(AccessGuard, AdminGuard, CsrfGuard)
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products') products(@Query() query: AdminCatalogQueryDto) {
    return this.catalog.listAdmin(query);
  }
  @Get('products/:id') product(@Param('id') id: string) {
    return this.catalog.findAdmin(id);
  }
  @Post('products') create(
    @Body() dto: ProductCreateDto,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.createProduct(dto, req.user?.id);
  }
  @Patch('products/:id') update(
    @Param('id') id: string,
    @Body() dto: ProductUpdateDto,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.updateProduct(id, dto, req.user?.id);
  }
  @Post('products/:id/duplicate') duplicate(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.duplicateProduct(id, req.user?.id);
  }
  @Patch('products/:id/status') status(
    @Param('id') id: string,
    @Body() dto: ProductStatusDto,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.setProductStatus(id, dto, req.user?.id);
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
  @Patch('products/:id/images/order') orderImages(
    @Param('id') id: string,
    @Body() dto: ImageOrderDto,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.orderImages(id, dto, req.user?.id);
  }
  @Delete('products/:id/images/:imageId') deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Req() req: AuthRequest,
  ) {
    return this.catalog.deleteImage(id, imageId, req.user?.id);
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
