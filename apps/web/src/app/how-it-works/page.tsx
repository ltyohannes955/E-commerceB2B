import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  Compass,
  Handshake,
  Package,
} from '@phosphor-icons/react/dist/ssr';
import { SiteShell } from '@/components/site-shell';

const steps = [
  {
    icon: Compass,
    number: '01',
    title: 'Explore what fits your operation',
    detail:
      'Start with practical categories and sourcing paths instead of a maze of setup screens. The catalog will make it easier to compare what is available for your business.',
  },
  {
    icon: Handshake,
    number: '02',
    title: 'Choose the right buying path',
    detail:
      'Some purchases will work like a normal online order. Others may need a request for quotation. The platform will make that choice visible as the catalog grows.',
  },
  {
    icon: Package,
    number: '03',
    title: 'Move from selection to delivery',
    detail:
      'Once an order is ready, later phases will add the payment and delivery tools needed to bring it from Dubai to Ethiopia with better visibility.',
  },
];

export default function HowItWorksPage() {
  return (
    <SiteShell>
      <section className="page-hero">
        <div className="shell page-hero-inner">
          <span className="eyebrow">How it works</span>
          <h1>A clearer path from a product idea to a confident purchase.</h1>
          <p>
            We are building the platform in small, dependable steps. The first
            release gives you a secure account and a useful place to begin
            exploring what your business may need next.
          </p>
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell steps-grid">
          {steps.map(({ icon: Icon, number, title, detail }) => (
            <article className="step-card" key={number}>
              <div className="step-card-top">
                <span className="step-number">{number}</span>
                <Icon size={28} color="var(--emerald)" aria-hidden="true" />
              </div>
              <h2>{title}</h2>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section pt-0">
        <div className="shell corridor-panel">
          <div>
            <span className="eyebrow">What is available now</span>
            <h2>Start with a simple, secure account.</h2>
            <p>
              Phase 1 keeps the foundation intentionally focused: basic user
              information, protected sign-in, profile controls, and a public
              preview of the categories to come.
            </p>
          </div>
          <ul className="check-list">
            <li>
              <CheckCircle size={19} aria-hidden="true" /> Basic signup with no
              company registration
            </li>
            <li>
              <CheckCircle size={19} aria-hidden="true" /> Responsive browsing
              on phone or desktop
            </li>
            <li>
              <CheckCircle size={19} aria-hidden="true" /> Product, pricing, and
              RFQ workflows in later phases
            </li>
          </ul>
          <Link href="/sign-up" className="button">
            Create your account <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
