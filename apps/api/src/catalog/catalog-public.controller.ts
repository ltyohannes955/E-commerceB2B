import { Controller, Get, Headers, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createHash } from 'node:crypto';
import { CatalogService } from './catalog.service';
import { CatalogQueryDto } from './catalog.dto';
import { ImageStorageService } from './image-storage.service';

@Controller()
export class CatalogPublicController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly images: ImageStorageService,
  ) {}

  @Get('products') products(@Query() query: CatalogQueryDto) {
    return this.catalog.listPublic(query);
  }

  @Get('search') search(@Query() query: CatalogQueryDto) {
    return this.catalog.listPublic(query);
  }

  @Get('products/:slug') product(@Param('slug') slug: string) {
    return this.catalog.findPublic(slug);
  }

  @Get('categories') categories() {
    return this.catalog.publicCategories();
  }

  @Get('categories/:slug') category(
    @Param('slug') slug: string,
    @Query() query: CatalogQueryDto,
  ) {
    return this.catalog.findPublicCategory(slug, query);
  }

  @Get('brands') brands() {
    return this.catalog.publicBrands();
  }

  @Get('brands/:slug') brand(
    @Param('slug') slug: string,
    @Query() query: CatalogQueryDto,
  ) {
    return this.catalog.findPublicBrand(slug, query);
  }

  @Get('product-images/:id')
  async image(
    @Param('id') id: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res() response: Response,
  ) {
    const image = await this.images.read(id);
    const etag = `"${createHash('sha1').update(image.buffer).digest('hex')}"`;
    if (ifNoneMatch === etag) {
      response.status(304).end();
      return;
    }
    response.setHeader('Content-Type', image.mimeType);
    response.setHeader('Content-Length', image.byteSize);
    response.setHeader('ETag', etag);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.send(image.buffer);
  }
}
