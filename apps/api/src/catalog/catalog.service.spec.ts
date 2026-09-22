import { slugify } from './catalog.service';

describe('catalog helpers', () => {
  it('creates stable URL-safe slugs from merchandising names', () => {
    expect(slugify('  LED Fixtures — Addis  ')).toBe('led-fixtures-addis');
  });

  it('falls back to item for empty names', () => {
    expect(slugify('---')).toBe('item');
  });
});
