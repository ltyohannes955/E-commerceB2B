import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import {
  ProductAvailability,
  ProductKind,
  ProductPriceVisibility,
  ProductSaleMode,
  ProductStatus,
  VariantPriceMode,
} from '@prisma/client';

const toStringOrUndefined = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? undefined
    : typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : undefined;

const toArray = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === 'string');
  return typeof value === 'string' ? value.split(',') : undefined;
};

export class CategoryCreateDto {
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @MaxLength(160) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class CategoryUpdateDto {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() @MaxLength(160) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() parentId?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class BrandCreateDto {
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @MaxLength(160) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class BrandUpdateDto {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() @MaxLength(160) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class VariantInputDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @Length(1, 100) sku!: string;
  @IsString() @Length(1, 160) name!: string;
  @IsObject() attributes!: Record<string, string>;
  @IsOptional() @IsEnum(VariantPriceMode) priceMode?: VariantPriceMode;
  @IsOptional()
  @Transform(toStringOrUndefined)
  @IsString()
  priceAdjustment?: string;
  @IsOptional() @Transform(toStringOrUndefined) @IsString() fixedPrice?: string;
  @IsOptional() @IsEnum(ProductAvailability) availability?: ProductAvailability;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) availableQuantity?:
    number | null;
  @IsOptional() @IsUUID() imageId?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceTierInputDto)
  priceTiers?: PriceTierInputDto[];
}

export class SpecificationInputDto {
  @IsString() @Length(1, 100) groupName!: string;
  @IsString() @Length(1, 120) name!: string;
  @IsString() @Length(1, 500) value!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class PriceTierInputDto {
  @IsOptional() @IsUUID() id?: string;
  @IsOptional() @IsUUID() variantId?: string | null;
  @Type(() => Number) @IsInt() @Min(1) minimumQuantity!: number;
  @Transform(toStringOrUndefined) @IsString() unitPrice!: string;
}

export class ProductCreateDto {
  @IsString() @Length(2, 240) name!: string;
  @IsOptional() @IsString() @MaxLength(180) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) shortDescription?: string;
  @IsOptional() @IsString() @MaxLength(10000) fullDescription?: string;
  @IsUUID() categoryId!: string;
  @IsOptional() @IsUUID() brandId?: string | null;
  @IsString() @Length(1, 100) internalSku!: string;
  @IsString() @Length(1, 40) unit!: string;
  @Matches(/^[A-Z]{2}$/) countryOfOrigin!: string;
  @Type(() => Number) @IsInt() @Min(1) minimumOrderQuantity!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) leadTimeDays?:
    number | null;
  @IsOptional() @IsString() @MaxLength(240) leadTimeNote?: string;
  @IsOptional() @IsEnum(ProductAvailability) availability?: ProductAvailability;
  @IsOptional() @IsEnum(ProductSaleMode) saleMode?: ProductSaleMode;
  @IsOptional()
  @IsEnum(ProductPriceVisibility)
  priceVisibility?: ProductPriceVisibility;
  @IsOptional()
  @Transform(toStringOrUndefined)
  @IsString()
  regularPrice?: string;
  @IsOptional()
  @Transform(toStringOrUndefined)
  @IsString()
  discountPrice?: string;
  @IsOptional() @IsISO8601() discountStartAt?: string | null;
  @IsOptional() @IsISO8601() discountEndAt?: string | null;
  @IsOptional() @IsBoolean() showStartingFrom?: boolean;
  @IsOptional() @IsBoolean() allowRfqAtAnyQuantity?: boolean;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  directPurchaseMaxQuantity?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) rfqThreshold?:
    number | null;
  @IsOptional() @IsEnum(ProductKind) productKind?: ProductKind;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsString() @MaxLength(240) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(500) seoDescription?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInputDto)
  variants?: VariantInputDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificationInputDto)
  specifications?: SpecificationInputDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceTierInputDto)
  priceTiers?: PriceTierInputDto[];
}

export class ProductUpdateDto extends PartialType(ProductCreateDto) {}

export class ProductStatusDto {
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}

export class ImageUploadDto {
  @IsString() @Length(1, 240) altText!: string;
}

export class ImageOrderDto {
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) imageIds!: string[];
  @IsUUID() primaryImageId!: string;
}

export class CatalogQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsString() @MaxLength(160) category?: string;
  @IsOptional() @IsString() @MaxLength(160) brand?: string;
  @IsOptional()
  @Transform(toArray)
  @IsEnum(ProductAvailability, { each: true })
  availability?: ProductAvailability[];
  @IsOptional()
  @Transform(toArray)
  @IsEnum(ProductSaleMode, { each: true })
  saleMode?: ProductSaleMode[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;
  @IsOptional() @IsIn(['newest', 'price_asc', 'price_desc']) sort?:
    'newest' | 'price_asc' | 'price_desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 24;
}

export class AdminCatalogQueryDto extends CatalogQueryDto {
  @IsOptional()
  @Transform(toArray)
  @IsEnum(ProductStatus, { each: true })
  status?: ProductStatus[];
}
