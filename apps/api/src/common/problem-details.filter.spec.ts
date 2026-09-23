import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ProblemDetailsFilter } from './problem-details.filter';

describe('ProblemDetailsFilter', () => {
  it('preserves field-level catalog validation errors', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          method: 'PATCH',
          originalUrl: '/api/admin/products/1/status',
          headers: {},
        }),
      }),
    } as unknown as ArgumentsHost;
    const errors = [
      { field: 'merchandising.leadTime', message: 'Lead time is required.' },
    ];

    new ProblemDetailsFilter().catch(
      new BadRequestException({
        code: 'PRODUCT_VALIDATION_FAILED',
        detail: 'Complete the highlighted sections.',
        errors,
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'PRODUCT_VALIDATION_FAILED',
        errors,
      }),
    );
  });
});
