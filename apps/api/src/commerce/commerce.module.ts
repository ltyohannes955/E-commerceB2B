import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  CommerceController,
  CommerceAdminController,
} from './commerce.controller';
import { CommerceService } from './commerce.service';

@Module({
  imports: [AuthModule],
  controllers: [CommerceController, CommerceAdminController],
  providers: [CommerceService],
  exports: [CommerceService],
})
export class CommerceModule {}
