/**
 * About — company story, mission, values, trust & safety and live platform stats.
 */

import { useEffect, useState } from "react";
import {
  ArrowRight,
  HeartHandshake,
  Eye,
  Gauge,
  ShieldCheck,
  Fingerprint,
  Lock,
  RefreshCcw,
  FileText,
  Users,
  LayoutGrid,
  Package,
  Star,
} from "lucide-react";
import { getCategories, getServices } from "../api/servicesApi";
import { fetchPublicProvidersApi } from "../api/providersApi";
import { getRentalItems } from "../api/rentalsApi";
import { HowItWorks } from "../components/home/HomeSections";
import { Section, SectionHeader, ButtonLink, Reveal, Stagger, StaggerItem, AnimatedNumber, Breadcrumbs } from "../components/ui";
import { unsplash } from "../lib/visuals";

const VALUES = [
  { icon: HeartHandshake, title: "Trust before transactions", desc: "We verify the people in our marketplace first, and grow second." },
  { icon: Eye, title: "Radical transparency", desc: "Clear prices, honest ratings and a full breakdown before anyone pays." },
  { icon: Gauge, title: "Respect for time", desc: "Live availability, instant booking and real-time tracking — no phone tag." },
];

const SAFETY = [
  { icon: Fingerprint, title: "Identity & background checks", desc: "Every professional and host is verified before their first booking." },
  { icon: Lock, title: "Protected payments", desc: "Payments run through Razorpay. Rental deposits are held and refunded on return." },
  { icon: RefreshCcw, title: "30-day re-work guarantee", desc: "If a job isn't done right, we send someone back to fix it." },
  { icon: FileText, title: "Your data, handled carefully", desc: "We only use your details to deliver bookings and never sell personal data." },
];

export default function About() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.allSettled([getServices(), fetchPublicProvidersApi({}), getRentalItems(), getCategories()]).then(([s, p, r, c]) => {
      const providers = p.status === "fulfilled" ? p.value || [] : [];
      const rated = providers.filter((x) => Number(x.rating) > 0);
      setStats({
        services: s.status === "fulfilled" ? (s.value || []).length : null,
        providers: providers.length || null,
        rentals: r.status === "fulfilled" ? (r.value || []).length : null,
        categories: c.status === "fulfilled" ? (c.value || []).length : null,
        rating: rated.length ? rated.reduce((a, x) => a + Number(x.rating), 0) / rated.length : null,
      });
    });
  }, []);

  const statItems = [
    { icon: Users, label: "Verified professionals", value: stats?.providers },
    { icon: LayoutGrid, label: "Services across categories", value: stats?.services },
    { icon: Package, label: "Items available to rent", value: stats?.rentals },
    { icon: Star, label: "Average professional rating", value: stats?.rating, format: (n) => n.toFixed(1) },
  ].filter((s) => s.value != null);

  return (
    <div className="pb-8">
      {/* Hero */}
      <header className="relative pt-28 sm:pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_0%,rgb(116_104_240/0.16),transparent)]" />
          <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />
        </div>
        <div className="container-page">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "About" }]} className="mb-6" />
          <Reveal y={14} className="max-w-4xl">
            <p className="eyebrow mb-4">About NexServe</p>
            <h1 className="text-[38px] sm:text-6xl font-semibold text-white leading-[1.05]">
              Making everyday help <span className="text-gradient">simple, safe and on time.</span>
            </h1>
            <p className="mt-6 text-lg text-ink-400 leading-relaxed max-w-2xl">
              NexServe is a marketplace for home services and short-term rentals. We connect people with verified
              professionals and trusted hosts — and stand behind every booking.
            </p>
          </Reveal>
        </div>
      </header>

      {/* Story */}
      <Section tight className="pt-0">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal className="relative">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-white/[0.06]">
              <img src={unsplash("1600880292203-757bb62b4baf", 1200)} alt="The NexServe team collaborating" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-950/60 to-transparent" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="eyebrow mb-3">Our story</p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-white leading-tight">Built from a very ordinary frustration.</h2>
            <div className="mt-5 space-y-4 text-[15px] text-ink-300 leading-relaxed">
              <p>
                Finding a reliable electrician shouldn't take five phone calls. Renting a camera for a weekend shouldn't mean
                handing over cash to a stranger and hoping for the best.
              </p>
              <p>
                We started NexServe in Bengaluru to fix both. One account, verified people, transparent prices, and payments
                that protect everyone involved — from a 45-minute haircut to a week-long camping trip.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Live stats */}
      {statItems.length > 0 && (
        <Section tight>
          <Reveal className="surface overflow-hidden">
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.06]">
              {statItems.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-surface-900 p-6 sm:p-8">
                    <Icon className="w-5 h-5 text-primary-300" aria-hidden="true" />
                    <dd className="mt-4 text-4xl font-semibold text-white tabular font-heading">
                      <AnimatedNumber value={s.value} format={s.format} />
                    </dd>
                    <dt className="mt-1 text-sm text-ink-400">{s.label}</dt>
                  </div>
                );
              })}
            </dl>
          </Reveal>
        </Section>
      )}

      {/* Values */}
      <Section>
        <SectionHeader eyebrow="What we value" title="Principles we build around" align="center" />
        <Stagger className="grid gap-5 md:grid-cols-3">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <StaggerItem key={v.title} className="surface p-7">
                <span className="w-11 h-11 rounded-xl bg-primary-500/12 text-primary-300 flex items-center justify-center">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{v.title}</h3>
                <p className="mt-2 text-sm text-ink-400 leading-relaxed">{v.desc}</p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Section>

      {/* Trust & safety */}
      <Section id="trust" className="bg-surface-900/30 border-y border-white/[0.04] scroll-mt-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <span className="w-12 h-12 rounded-2xl bg-accent-500/12 text-accent-300 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </span>
            <p className="eyebrow mt-6 mb-3">Trust, safety & privacy</p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-white leading-tight">Protection is the product.</h2>
            <p className="mt-4 text-ink-400 leading-relaxed">
              Using NexServe means agreeing to fair terms for everyone: honest listings, respectful conduct and timely
              payment. Here's how we keep our side of the deal.
            </p>
          </Reveal>
          <Stagger className="grid sm:grid-cols-2 gap-4">
            {SAFETY.map((f) => {
              const Icon = f.icon;
              return (
                <StaggerItem key={f.title} className="surface p-5">
                  <Icon className="w-5 h-5 text-accent-300" aria-hidden="true" />
                  <h3 className="mt-4 text-sm font-semibold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-400 leading-relaxed">{f.desc}</p>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </Section>

      {/* How it works */}
      <Section>
        <SectionHeader align="center" eyebrow="How it works" title="Two marketplaces, one simple flow" />
        <HowItWorks />
      </Section>

      {/* CTA */}
      <Section tight>
        <Reveal className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface-900 p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div
            className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-[radial-gradient(closest-side,rgb(97_80_226/0.3),transparent)] blur-2xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative max-w-xl">
            <h2 className="text-3xl font-semibold text-white">Ready when you are.</h2>
            <p className="mt-3 text-ink-400">Book a verified professional, rent gear, or join as a partner and grow your business.</p>
          </div>
          <div className="relative flex flex-col sm:flex-row gap-3">
            <ButtonLink to="/services" size="lg" iconRight={ArrowRight}>
              Book a service
            </ButtonLink>
            <ButtonLink to="/login" size="lg" variant="secondary">
              Become a partner
            </ButtonLink>
          </div>
        </Reveal>
      </Section>
    </div>
  );
}
