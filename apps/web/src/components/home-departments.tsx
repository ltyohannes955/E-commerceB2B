'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CaretRight,
  Cube,
  Lightning,
  Package,
  SquaresFour,
} from '@phosphor-icons/react';
import type { CatalogCategory } from '@/lib/catalog';

const MAX_VISIBLE_DEPARTMENTS = 4;
const departmentIcons = [Cube, Lightning, SquaresFour, Package];

export function HomeDepartments() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    fetch('/api/backend/categories', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) throw new Error('CATEGORY_REQUEST_FAILED');
        return response.json() as Promise<CatalogCategory[]>;
      })
      .then((result) => {
        if (!active) return;
        setCategories(result.filter((category) => category.parentId === null));
        setState('ready');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = categories.slice(0, MAX_VISIBLE_DEPARTMENTS);

  return (
    <section className="department-strip" aria-label="Shop by department">
      <div className="shell">
        {state === 'loading' ? (
          <p className="department-state" role="status">
            Loading departments…
          </p>
        ) : state === 'error' ? (
          <p className="department-state" role="status">
            Departments are temporarily unavailable.{' '}
            <Link href="/products">Browse the catalog</Link>
          </p>
        ) : visible.length === 0 ? (
          <p className="department-state" role="status">
            No departments are available yet.{' '}
            <Link href="/products">Browse the catalog</Link>
          </p>
        ) : (
          <>
            <div className="department-grid">
              {visible.map((category, index) => {
                const Icon = departmentIcons[index % departmentIcons.length];
                const detail =
                  category.description ||
                  (category.children.length
                    ? `${category.children.length} subcategor${category.children.length === 1 ? 'y' : 'ies'}`
                    : 'Browse products');
                return (
                  <Link
                    className="department-link"
                    href={`/categories/${category.slug}`}
                    key={category.id}
                  >
                    <span className="department-icon">
                      <Icon size={22} weight="duotone" />
                    </span>
                    <span>
                      <strong>{category.name}</strong>
                      <small>{detail}</small>
                    </span>
                    <CaretRight size={16} className="department-arrow" />
                  </Link>
                );
              })}
            </div>
            {categories.length > MAX_VISIBLE_DEPARTMENTS && (
              <div className="department-more">
                <Link href="/categories">
                  View all {categories.length} departments{' '}
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
