import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Factory,
  MagnifyingGlass,
  Package,
  SealCheck,
  Storefront,
  Wrench,
} from '@phosphor-icons/react/dist/ssr';
import { SiteShell } from '@/components/site-shell';

const categories = [
  {
    icon: Factory,
    label: 'Industrial equipment',
    detail: 'Tools, machinery, and dependable inputs for growing operations.',
    accent: 'category-card-navy',
  },
  {
    icon: Package,
    label: 'Packaging & supplies',
    detail: 'The cartons, containers, and materials that keep orders moving.',
    accent: 'category-card-sand',
  },
  {
    icon: Storefront,
    label: 'Office & retail',
    detail: 'Practical stock for offices, shops, and customer-facing spaces.',
    accent: 'category-card-emerald',
  },
  {
    icon: Wrench,
    label: 'Hospitality essentials',
    detail: 'Useful equipment and everyday supplies for hospitality teams.',
    accent: 'category-card-ink',
  },
];

export default function Home() {
  return (
    <SiteShell>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <span className="eyebrow">Explore the trade corridor</span>
            <h1>Find the next thing your business needs.</h1>
            <p>
              Explore the categories shaping a simpler way to bring products
              from Dubai to Ethiopia. A focused catalog experience is coming
              next.
            </p>
            <div className="hero-actions">
              <Link href="#explore" className="button">
                Explore categories <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/how-it-works" className="button button-secondary">
                How it works
              </Link>
            </div>
            <div className="hero-proof" aria-label="Platform foundations">
              <span>
                <SealCheck size={17} aria-hidden="true" /> Curated buying paths
              </span>
              <span>
                <SealCheck size={17} aria-hidden="true" /> Clear account
                controls
              </span>
            </div>
          </div>
          <div className="hero-art">
            <Image
              src="/trade-corridor-hero.png"
              alt="Cargo terminal suggesting a Dubai to Ethiopia trade corridor"
              fill
              priority
              sizes="(max-width: 899px) 100vw, 54vw"
            />
            <p className="hero-note">
              A calmer starting point for your next purchase order.
            </p>
          </div>
        </div>
      </section>

      <section id="explore" className="section explore-section">
        <div className="shell">
          <div className="section-heading section-heading-wide">
            <span className="eyebrow">Catalog preview</span>
            <h2>Start with a category. Go deeper when you are ready.</h2>
            <p>
              We are shaping the catalog around the real needs of importing
              businesses. Browse the first sourcing lanes below, then create an
              account to be ready when live inventory arrives.
            </p>
          </div>
          <div
            className="catalog-search"
            role="search"
            aria-label="Catalog preview search"
          >
            <MagnifyingGlass size={20} aria-hidden="true" />
            <span>Search products, categories, or suppliers</span>
            <span className="search-status">Catalog coming soon</span>
          </div>
          <div className="category-grid">
            {categories.map(({ icon: Icon, label, detail, accent }) => (
              <article className={`category-card ${accent}`} key={label}>
                <div className="category-card-icon">
                  <Icon size={25} weight="bold" aria-hidden="true" />
                </div>
                <div>
                  <p className="category-kicker">Category preview</p>
                  <h3>{label}</h3>
                  <p>{detail}</p>
                </div>
                <Link href="/sign-up" className="category-link">
                  Get ready <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell dashboard-panel flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Built for the next order</p>
            <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Create your account now and keep your details ready for the first
              live catalog release.
            </p>
          </div>
          <Link href="/sign-up" className="button button-small shrink-0">
            Create your account <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
