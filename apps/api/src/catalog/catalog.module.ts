import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogAdminController } from './catalog-admin.controller';
import { CatalogPublicController } from './catalog-public.controller';
import { CatalogService } from './catalog.service';
import { ImageStorageService } from './image-storage.service';

@Module({
  imports: [AuthModule],
  controllers: [CatalogPublicController, CatalogAdminController],
  providers: [CatalogService, ImageStorageService],
  exports: [CatalogService],
})
export class CatalogModule {}
