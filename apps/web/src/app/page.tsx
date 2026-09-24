import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Lightning,
  MagnifyingGlass,
  Package,
  ShieldCheck,
} from '@phosphor-icons/react/dist/ssr';
import { FeaturedProducts } from '@/components/catalog-ui';
import { HomeDepartments } from '@/components/home-departments';
import { SiteShell } from '@/components/site-shell';

export default function Home() {
  return (
    <SiteShell>
      <div className="home-commerce">
        <section className="home-intro">
          <div className="shell home-intro-grid">
            <div className="home-intro-copy">
              <p className="store-kicker">
                A practical buying desk for Ethiopia
              </p>
              <h1>Stock your next order with less back and forth.</h1>
              <p className="home-intro-description">
                Compare business-ready products, clear minimums, and dependable
                buying paths before you request a quote or place an order.
              </p>
              <form className="home-search" action="/search" role="search">
                <MagnifyingGlass size={21} aria-hidden="true" />
                <input
                  name="q"
                  placeholder="What are you sourcing today?"
                  aria-label="Search products"
                />
                <button type="submit">Search</button>
              </form>
              <div className="home-search-links">
                <span>Popular:</span>
                <Link href="/search?q=lighting">lighting</Link>
                <Link href="/search?q=inverter">inverters</Link>
                <Link href="/search?q=chair">office chairs</Link>
              </div>
            </div>
            <div className="home-intro-visual">
              <Image
                src="/trade-corridor-hero.png"
                alt="Commercial equipment and lighting ready for a business order"
                fill
                priority
                sizes="(max-width: 899px) 100vw, 46vw"
              />
              <div className="visual-caption">
                <span>Featured sourcing lane</span>
                <strong>Commercial spaces</strong>
                <Link href="/products">
                  Shop the catalog <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <HomeDepartments />

        <FeaturedProducts />

        <section className="shell sourcing-panel">
          <div className="sourcing-panel-copy">
            <p className="store-kicker">Buying with context</p>
            <h2>Details that make a purchase order easier.</h2>
            <p>
              Every listing keeps the practical information close: country of
              origin, MOQ, lead time, availability, and whether the product is
              ready for direct purchase or needs a quote.
            </p>
            <Link href="/how-it-works" className="button button-secondary">
              How sourcing works <ArrowRight size={17} />
            </Link>
          </div>
          <div className="sourcing-points">
            <div>
              <ShieldCheck size={21} />
              <span>
                <strong>Clear buying paths</strong>
                <small>
                  Know when to buy directly and when to request a quote.
                </small>
              </span>
            </div>
            <div>
              <Package size={21} />
              <span>
                <strong>Business quantities</strong>
                <small>MOQs and tier pricing are shown before you start.</small>
              </span>
            </div>
            <div>
              <Lightning size={21} />
              <span>
                <strong>Dubai to Ethiopia</strong>
                <small>
                  Built around the trade corridor your team already uses.
                </small>
              </span>
            </div>
          </div>
        </section>

        <section className="section home-bottom-cta">
          <div className="shell home-bottom-cta-inner">
            <div>
              <p className="store-kicker">Not sure where to begin?</p>
              <h2>Browse the full catalog by category or brand.</h2>
            </div>
            <Link href="/products" className="button">
              Browse products <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
