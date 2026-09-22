import { parsePort } from './port';

describe('parsePort', () => {
  it('defaults to port 3001 when PORT is not set', () => {
    expect(parsePort(undefined)).toBe(3001);
  });

  it('accepts an integer port from the environment', () => {
    expect(parsePort('3100')).toBe(3100);
  });

  it.each(['', '0', '65536', '3001.5', 'abc'])(
    'rejects invalid port %j',
    (value) => {
      expect(() => parsePort(value)).toThrow(
        'PORT must be an integer between 1 and 65535.',
      );
    },
  );
});
