/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
  UseGuards,
} from '@nestjs/common';
import { AccessGuard, AdminGuard } from '../auth/auth.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import type { AuthRequest } from '../auth/auth.guard';
import { CommerceService } from './commerce.service';
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

@Controller()
@UseGuards(AccessGuard, CsrfGuard)
export class CommerceController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('cart') cart(@Req() req: AuthRequest) {
    return this.commerce.readCart(req.user);
  }
  @Post('cart/items') addCart(
    @Req() req: AuthRequest,
    @Body() dto: CartItemCreateDto,
  ) {
    return this.commerce.addCartItem(req.user, dto);
  }
  @Patch('cart/items/:id') updateCart(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: CartItemUpdateDto,
  ) {
    return this.commerce.updateCartItem(req.user, id, dto);
  }
  @Delete('cart/items/:id') removeCart(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.commerce.removeCartItem(req.user, id);
  }
  @Delete('cart') clearCart(@Req() req: AuthRequest) {
    return this.commerce.clearCart(req.user);
  }
  @Post('cart/items/:id/move-to-rfq') moveCart(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: MoveCartItemDto,
  ) {
    return this.commerce.moveCartItem(req.user, id, dto);
  }

  @Get('rfqs') listRfqs(@Req() req: AuthRequest, @Query() query: RfqQueryDto) {
    return this.commerce.listRfqs(req.user, query);
  }
  @Post('rfqs') createRfq(@Req() req: AuthRequest, @Body() dto: RfqCreateDto) {
    return this.commerce.createRfq(req.user, dto);
  }
  @Get('rfqs/:id') findRfq(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.commerce.findRfq(req.user, id);
  }
  @Patch('rfqs/:id') updateRfq(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RfqUpdateDto,
  ) {
    return this.commerce.updateRfq(req.user, id, dto);
  }
  @Post('rfqs/:id/items') addRfqItem(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RfqItemCreateDto,
  ) {
    return this.commerce.addRfqItem(req.user, id, dto);
  }
  @Patch('rfqs/:id/items/:itemId') updateRfqItem(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: RfqItemUpdateDto,
  ) {
    return this.commerce.updateRfqItem(req.user, id, itemId, dto);
  }
  @Delete('rfqs/:id/items/:itemId') removeRfqItem(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.commerce.removeRfqItem(req.user, id, itemId);
  }
  @Post('rfqs/:id/submit') submitRfq(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RfqSubmitDto,
  ) {
    return this.commerce.submitRfq(req.user, id, dto);
  }
  @Post('rfqs/:id/cancel') cancelRfq(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.commerce.cancelRfq(req.user, id);
  }

  @Get('quotes') listQuotes(
    @Req() req: AuthRequest,
    @Query() query: QuoteQueryDto,
  ) {
    return this.commerce.listCustomerQuotes(req.user, query);
  }
  @Get('quotes/:id') findQuote(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.commerce.findCustomerQuote(req.user, id);
  }
  @Post('quotes/:id/accept') acceptQuote(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.commerce.acceptQuote(req.user, id);
  }
  @Post('quotes/:id/decline') declineQuote(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: QuoteDeclineDto,
  ) {
    return this.commerce.declineQuote(req.user, id, dto);
  }
}

@Controller('admin')
@UseGuards(AccessGuard, AdminGuard, CsrfGuard)
export class CommerceAdminController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('rfqs') listRfqs(
    @Req() req: AuthRequest,
    @Query() query: AdminRfqQueryDto,
  ) {
    return this.commerce.listAdminRfqs(req.user, query);
  }
  @Get('rfqs/:id') findRfq(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.commerce.findAdminRfq(req.user, id);
  }
  @Patch('rfqs/:id/status') setStatus(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RfqStatusDto,
  ) {
    return this.commerce.setRfqStatus(req.user, id, dto);
  }
  @Patch('rfqs/:id/assignment') assign(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RfqAssignmentDto,
  ) {
    return this.commerce.assignRfq(req.user, id, dto);
  }
  @Patch('rfqs/:id/items/:itemId') adjustItem(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: RfqItemAdjustmentDto,
  ) {
    return this.commerce.adjustRfqItem(req.user, id, itemId, dto);
  }
  @Post('rfqs/:id/quotes') createQuote(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: QuoteCreateDto,
  ) {
    return this.commerce.createAdminQuote(req.user, id, dto);
  }
  @Get('quotes') listQuotes(
    @Req() req: AuthRequest,
    @Query() query: QuoteQueryDto,
  ) {
    return this.commerce.listAdminQuotes(req.user, query);
  }
  @Get('quotes/:id') findQuote(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.commerce.findAdminQuote(req.user, id);
  }
  @Patch('quotes/:id') updateQuote(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: QuoteUpdateDto,
  ) {
    return this.commerce.updateAdminQuote(req.user, id, dto);
  }
  @Post('quotes/:id/send') sendQuote(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.commerce.sendQuote(req.user, id);
  }
  @Post('quotes/:id/revise') reviseQuote(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.commerce.reviseQuote(req.user, id);
  }
}
