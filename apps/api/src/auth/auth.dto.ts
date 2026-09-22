import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
export class RegisterDto {
  @IsString() @Length(2, 240) fullName!: string;
  @IsEmail() email!: string;
  @IsString() @Length(8, 128) password!: string;
  @IsBoolean() termsAccepted!: boolean;
  @IsBoolean() privacyAccepted!: boolean;
  @IsOptional() @IsString() @Matches(/^\+?[1-9]\d{7,14}$/) phone?: string;
}
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
}
export class ForgotPasswordDto {
  @IsEmail() email!: string;
}
export class ResetPasswordDto {
  @IsString() @MinLength(32) token!: string;
  @IsString() @Length(8, 128) password!: string;
}
export class UpdateProfileDto {
  @IsOptional() @IsString() @Length(2, 240) fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Matches(/^\+?[1-9]\d{7,14}$/) phone?: string;
  @IsOptional() @IsString() currentPassword?: string;
}
export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @Length(8, 128) newPassword!: string;
}
export class StatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED']) status!: 'ACTIVE' | 'SUSPENDED';
  @IsOptional() @IsString() @Length(3, 500) reason?: string;
}
