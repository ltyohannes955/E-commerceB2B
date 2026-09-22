/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      error instanceof HttpException ? error.getResponse() : undefined;
    const body = typeof raw === 'object' && raw !== null ? (raw as any) : {};
    const known: Record<string, [number, string]> = {
      CURRENT_PASSWORD_REQUIRED: [400, 'CURRENT_PASSWORD_REQUIRED'],
      CURRENT_PASSWORD_INVALID: [400, 'CURRENT_PASSWORD_INVALID'],
      CANNOT_MODIFY_SELF: [400, 'CANNOT_MODIFY_SELF'],
      ADMIN_TARGET_NOT_ALLOWED: [403, 'ADMIN_TARGET_NOT_ALLOWED'],
    };
    const mapped = error instanceof Error ? known[error.message] : undefined;
    if (status >= 500) {
      console.error('[api] unhandled request error', {
        error: error instanceof Error ? error.stack : error,
        method: request.method,
        path: request.originalUrl,
        requestId: request.headers['x-request-id'],
      });
    }
    const finalStatus = mapped?.[0] ?? status;
    const code =
      mapped?.[1] ??
      body.code ??
      (status >= 500 ? 'INTERNAL_ERROR' : (body.error ?? 'REQUEST_FAILED'));
    response.status(finalStatus).json({
      type: 'about:blank',
      title: finalStatus >= 500 ? 'Internal Server Error' : 'Request failed',
      status: finalStatus,
      detail:
        finalStatus >= 500
          ? 'An unexpected error occurred.'
          : (body.detail ??
            body.message ??
            'The request could not be completed.'),
      code,
      requestId: request.headers['x-request-id'] ?? undefined,
      errors: Array.isArray(body.message) ? body.message : undefined,
    });
  }
}
