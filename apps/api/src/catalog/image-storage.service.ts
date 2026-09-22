import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 6;

export type ProcessedImage = {
  data: string;
  mimeType: 'image/webp';
  byteSize: number;
  originalFileName: string;
};

@Injectable()
export class ImageStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async process(file: Express.Multer.File): Promise<ProcessedImage> {
    if (!file?.buffer) throw new BadRequestException('IMAGE_REQUIRED');
    if (file.size > MAX_IMAGE_BYTES)
      throw new BadRequestException('IMAGE_TOO_LARGE');

    const source = sharp(file.buffer, { failOn: 'error' });
    const metadata = await source.metadata().catch(() => null);
    if (!metadata?.format || !['jpeg', 'png', 'webp'].includes(metadata.format))
      throw new BadRequestException('IMAGE_TYPE_NOT_ALLOWED');

    const output = await source
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    return {
      data: output.toString('base64'),
      mimeType: 'image/webp',
      byteSize: output.byteLength,
      originalFileName: file.originalname.slice(0, 255),
    };
  }

  async read(id: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id } });
    if (!image) throw new NotFoundException('IMAGE_NOT_FOUND');
    return {
      buffer: Buffer.from(image.data, 'base64'),
      mimeType: image.mimeType,
      byteSize: image.byteSize,
    };
  }
}
