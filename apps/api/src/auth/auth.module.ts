import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessGuard, AdminGuard } from './auth.guard';
import { CsrfGuard } from './csrf.guard';
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AccessGuard, AdminGuard, CsrfGuard],
  exports: [JwtModule, AuthService, AccessGuard, AdminGuard, CsrfGuard],
})
export class AuthModule {}
