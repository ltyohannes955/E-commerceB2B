// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /_health', () => {
  it('returns the web health payload', async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      service: 'web',
    });
  });
});
