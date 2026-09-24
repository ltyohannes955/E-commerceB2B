import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuoteAdjustmentKind, QuoteStatus, RfqStatus } from '@prisma/client';

export class CartItemCreateDto {
  @IsUUID() variantId!: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

export class CartItemUpdateDto {
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
}

export class MoveCartItemDto {
  @IsOptional() @IsUUID() rfqId?: string;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
}

export class RfqCreateDto {
  @IsString() @MaxLength(120) title!: string;
  @IsOptional() @IsUUID() variantId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class RfqUpdateDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) message?: string;
  @IsOptional() @IsString() @MaxLength(160) deliveryTimeframe?: string;
  @IsOptional() @IsString() @MaxLength(120) deliveryCity?: string;
  @IsOptional() @IsString() @MaxLength(40) preferredContact?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) version?: number;
}

export class RfqItemCreateDto {
  @IsUUID() variantId!: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class RfqItemUpdateDto {
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class RfqSubmitDto {
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}

export class RfqQueryDto {
  @IsOptional() @IsEnum(RfqStatus) status?: RfqStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class AdminRfqQueryDto extends RfqQueryDto {
  @IsOptional() @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class RfqStatusDto {
  @IsEnum(RfqStatus) status!: RfqStatus;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}

export class RfqAssignmentDto {
  @IsOptional() @IsUUID() assignedAdminId?: string | null;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}

export class RfqItemAdjustmentDto {
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
  @IsString() @MaxLength(500) reason!: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}

export class QuoteItemDto {
  @IsOptional() @IsUUID() rfqItemId?: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;
  @IsString() unitPrice!: string;
}

export class QuoteAdjustmentDto {
  @IsEnum(QuoteAdjustmentKind) kind!: QuoteAdjustmentKind;
  @IsString() @MaxLength(160) label!: string;
  @IsString() amount!: string;
  @Type(() => Number) @IsInt() @Min(0) sortOrder = 0;
}

export class QuoteCreateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteAdjustmentDto)
  adjustments?: QuoteAdjustmentDto[];
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedLeadTimeDays?: number;
  @IsOptional() @IsString() @MaxLength(240) paymentTerms?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() @MaxLength(10000) customerNotes?: string;
  @IsOptional() @IsString() @MaxLength(10000) internalNotes?: string;
}

export class QuoteUpdateDto extends QuoteCreateDto {
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}

export class QuoteQueryDto {
  @IsOptional() @IsEnum(QuoteStatus) status?: QuoteStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class QuoteDeclineDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
