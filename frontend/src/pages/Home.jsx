/**
 * Home — marketplace landing page.
 * Hero → Trust → Categories → Trending → Professionals → How it works →
 * Rentals → Trust & safety → Testimonials → Final CTA.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Siren,
  Truck,
  Wallet,
  BadgeCheck,
  Headphones,
  RefreshCcw,
  Users,
  LayoutGrid,
  Package,
  Star,
} from "lucide-react";
import { getCategories, getServices } from "../api/servicesApi";
import { fetchPublicProvidersApi } from "../api/providersApi";
import { getRentalItems, getRentalCategories } from "../api/rentalsApi";
import EmergencyBookingModal from "../components/emergency/EmergencyBookingModal";
import RecommendationSection from "../components/recommendations/RecommendationSection";
import ReferralCard from "../components/referrals/ReferralCard";
import BookingWizardModal from "../components/booking/BookingWizardModal";
import HeroEcosystem from "../components/home/HeroEcosystem";
import { HowItWorks, VerificationVisual, Testimonials } from "../components/home/HomeSections";
import ServiceCard from "../components/cards/ServiceCard";
import ProviderCard from "../components/cards/ProviderCard";
import RentalCard from "../components/cards/RentalCard";
import CategoryCard from "../components/cards/CategoryCard";
import {
  Section,
  SectionHeader,
  ButtonLink,
  Button,
  Stagger,
  StaggerItem,
  SkeletonCard,
  Skeleton,
  EmptyState,
  ErrorState,
  AnimatedNumber,
  Reveal,
} from "../components/ui";
import { rentalVisual } from "../lib/visuals";
import { useToast } from "../components/ui";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [rentalCategories, setRentalCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [error, setError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("Bengaluru");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [wizardService, setWizardService] = useState(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const loadCatalogue = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [cats, servs, items, rcats] = await Promise.all([
        getCategories(),
        getServices(),
        getRentalItems(),
        getRentalCategories().catch(() => []),
      ]);
      setCategories(cats || []);
      setServices(servs || []);
      setRentals(items || []);
      setRentalCategories(rcats || []);
    } catch (err) {
      console.warn("Failed to load homepage data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  // Professionals are scoped to the selected city.
  useEffect(() => {
    let alive = true;
    setProvidersLoading(true);
    fetchPublicProvidersApi({ city: selectedCity })
      .then((data) => alive && setProviders(data || []))
      .catch((err) => {
        console.warn("Failed to load providers:", err);
        if (alive) setProviders([]);
      })
      .finally(() => alive && setProvidersLoading(false));
    return () => {
      alive = false;
    };
  }, [selectedCity]);

  const handleHeroSearch = () => {
    const q = searchQuery.trim();
    navigate(q ? `/services?search=${encodeURIComponent(q)}` : "/services");
  };

  const countByCategory = useMemo(() => {
    const m = {};
    services.forEach((s) => (m[s.category_id] = (m[s.category_id] || 0) + 1));
    return m;
  }, [services]);

  // Most-booked service from each category, so the row spans the marketplace.
  const trending = useMemo(() => {
    const score = (s) => (s.review_count || 0) * (s.rating || 0);
    const seen = new Set();
    return [...services]
      .sort((a, b) => score(b) - score(a))
      .filter((s) => (seen.has(s.category_id) ? false : seen.add(s.category_id)))
      .slice(0, 6);
  }, [services]);

  const topProviders = useMemo(
    () => [...providers].sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.review_count || 0) - (a.review_count || 0)).slice(0, 4),
    [providers]
  );

  const featuredRentals = useMemo(
    () => [...rentals].sort((a, b) => (b.review_count || 0) - (a.review_count || 0)).slice(0, 4),
    [rentals]
  );

  const avgRating = useMemo(() => {
    const r = providers.filter((p) => Number(p.rating) > 0);
    return r.length ? r.reduce((s, p) => s + Number(p.rating), 0) / r.length : 0;
  }, [providers]);

  const popular = categories.slice(0, 4).map((c) => ({ label: c.name, to: `/services?category=${c.id}` }));

  const stats = [
    { label: "Verified professionals", value: providers.length, suffix: "", icon: Users, sub: `in ${selectedCity}` },
    { label: "Services to book", value: services.length, suffix: "", icon: LayoutGrid, sub: `${categories.length} categories` },
    { label: "Items to rent", value: rentals.length, suffix: "", icon: Package, sub: `${rentalCategories.length || "Multiple"} categories` },
    { label: "Average pro rating", value: avgRating, format: (n) => n.toFixed(1), icon: Star, sub: "From customer reviews" },
  ];

  return (
    <div className="relative">
      <HeroEcosystem
        query={searchQuery}
        onQueryChange={setSearchQuery}
        city={selectedCity}
        onCityChange={setSelectedCity}
        onSubmit={handleHeroSearch}
        popular={popular}
      />

      {/* ═══ TRUST INDICATORS ═══ */}
      <section aria-label="NexServe at a glance" className="relative z-10 pt-14 xl:pt-0 pb-6">
        <div className="container-page">
          <Reveal className="surface overflow-hidden">
            <dl className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-white/[0.06]">
              {stats.map((s, i) => {
                const Icon = s.icon;
                const pending = i === 0 ? providersLoading : loading;
                return (
                  <div key={s.label} className="bg-surface-900 p-5 sm:p-6">
                    <dt className="flex items-center gap-2 text-[13px] text-ink-400">
                      <Icon className="w-4 h-4 text-ink-500" aria-hidden="true" />
                      {s.label}
                    </dt>
                    <dd className="mt-2 text-3xl font-semibold text-white tabular tracking-tight font-heading">
                      {pending ? <Skeleton className="h-8 w-16" /> : <AnimatedNumber value={s.value} format={s.format} />}
                    </dd>
                    <p className="mt-1 text-xs text-ink-500">{s.sub}</p>
                  </div>
                );
              })}
              <div className="col-span-2 lg:col-span-1 p-5 sm:p-6 bg-surface-900 bg-[linear-gradient(rgb(20_184_143/0.05),rgb(20_184_143/0.05))]">
                <dt className="flex items-center gap-2 text-[13px] text-emerald-300">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  Secure payments
                </dt>
                <dd className="mt-2 text-sm text-ink-200 leading-relaxed">
                  Every checkout runs through Razorpay. Rental deposits are held, never spent.
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </section>

      {error ? (
        <Section tight>
          <ErrorState
            title="We couldn't load the marketplace"
            description="Categories, services and rentals didn't load. Check your connection and try again."
            onRetry={loadCatalogue}
            retrying={loading}
          />
        </Section>
      ) : (
        <>
          {/* ═══ POPULAR CATEGORIES ═══ */}
          <Section>
            <SectionHeader
              eyebrow="Categories"
              title="Everything your home needs"
              subtitle="From a quick fix to a full deep clean — pick a category to see services and the professionals who offer them."
              action={
                <ButtonLink to="/services" variant="secondary" iconRight={ArrowRight}>
                  All services
                </ButtonLink>
              }
            />
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className={i < 4 ? "h-[220px] rounded-2xl" : "h-[76px] rounded-2xl"} />
                ))}
              </div>
            ) : (
              <>
                <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {categories.slice(0, 4).map((cat) => (
                    <StaggerItem key={cat.id}>
                      <CategoryCard category={cat} count={countByCategory[cat.id] || 0} variant="image" />
                    </StaggerItem>
                  ))}
                </Stagger>
                <Stagger className="mt-4 grid gap-3 grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4">
                  {categories.slice(4).map((cat) => (
                    <StaggerItem key={cat.id}>
                      <CategoryCard category={cat} count={countByCategory[cat.id] || 0} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </>
            )}
          </Section>

          {/* ═══ TRENDING SERVICES ═══ */}
          <Section className="bg-surface-900/30 border-y border-white/[0.04]">
            <SectionHeader
              eyebrow="Trending"
              title="Most booked this week"
              subtitle="The services customers book most often, ranked by reviews and rating."
              action={
                <ButtonLink to="/services" variant="ghost" iconRight={ArrowRight}>
                  Browse all
                </ButtonLink>
              }
            />
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : trending.length ? (
              <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {trending.map((service) => (
                  <StaggerItem key={service.id}>
                    <ServiceCard service={service} media onBook={setWizardService} />
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <EmptyState compact icon={LayoutGrid} title="No services listed yet" description="New services appear here as soon as professionals publish them." />
            )}

            <RecommendationSection onSelectService={(svc) => setWizardService(svc)} />
          </Section>

          {/* ═══ RECOMMENDED PROFESSIONALS ═══ */}
          <Section>
            <SectionHeader
              eyebrow="Professionals"
              title={`Top-rated pros in ${selectedCity}`}
              subtitle="Every professional is identity-verified and background-checked before their first booking."
              action={
                <ButtonLink to="/services" variant="secondary" iconRight={ArrowRight}>
                  Find a pro
                </ButtonLink>
              }
            />
            {providersLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} media={false} />
                ))}
              </div>
            ) : topProviders.length ? (
              <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {topProviders.map((p) => (
                  <StaggerItem key={p.id}>
                    <ProviderCard provider={p} />
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <EmptyState
                compact
                icon={Users}
                title={`We're not in ${selectedCity} yet`}
                description="Professionals in this city are still being onboarded. Bengaluru is fully live today."
                action={
                  <Button variant="secondary" onClick={() => setSelectedCity("Bengaluru")}>
                    Show Bengaluru
                  </Button>
                }
              />
            )}
          </Section>

          {/* ═══ HOW IT WORKS ═══ */}
          <Section className="bg-surface-900/30 border-y border-white/[0.04]">
            <SectionHeader
              align="center"
              eyebrow="How it works"
              title="Booked in minutes. Protected end to end."
              subtitle="Two marketplaces, one simple flow."
            />
            <HowItWorks />
          </Section>

          {/* ═══ RENTAL MARKETPLACE ═══ */}
          <Section>
            <div className="relative overflow-hidden rounded-3xl border border-emerald-400/10 bg-[linear-gradient(180deg,rgb(20_184_143/0.06),transparent_40%)] p-5 sm:p-8 lg:p-10">
              <div
                className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(20_184_143/0.14),transparent)] blur-2xl pointer-events-none"
                aria-hidden="true"
              />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end mb-8">
                <Reveal className="max-w-2xl">
                  <p className="eyebrow eyebrow-rental mb-3">NexServe Rentals</p>
                  <h2 className="text-[28px] sm:text-4xl font-semibold text-white leading-[1.15]">
                    Rent what you need. Return it when you're done.
                  </h2>
                  <p className="mt-3 text-[15px] sm:text-base text-ink-400 leading-relaxed">
                    Cameras, camping kits, party sound, gaming rigs and more — from verified local hosts, with a
                    refundable deposit on every order.
                  </p>
                  <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-200">
                    <li className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                      Refundable deposits
                    </li>
                    <li className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                      Delivery or self-pickup
                    </li>
                    <li className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                      Verified hosts
                    </li>
                  </ul>
                </Reveal>
                <ButtonLink to="/rentals" variant="rental" iconRight={ArrowRight} className="self-start lg:self-end">
                  Explore rentals
                </ButtonLink>
              </div>

              {rentalCategories.length > 0 && (
                <div className="relative mb-6 flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
                  {rentalCategories.map((c) => {
                    const v = rentalVisual(c);
                    const Icon = v.icon;
                    return (
                      <Link
                        key={c.id}
                        to={`/rentals?category=${c.slug}`}
                        className="shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-medium text-ink-200 bg-surface-900/80 border border-white/[0.08] hover:border-emerald-400/40 hover:text-white transition-colors"
                      >
                        <Icon className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                        {c.name}
                      </Link>
                    );
                  })}
                </div>
              )}

              {loading ? (
                <div className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : featuredRentals.length ? (
                <Stagger className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {featuredRentals.map((item) => (
                    <StaggerItem key={item.id}>
                      <RentalCard item={item} />
                    </StaggerItem>
                  ))}
                </Stagger>
              ) : (
                <EmptyState compact tone="rental" icon={Package} title="No rentals listed yet" description="Hosts are adding gear — check back soon." />
              )}
            </div>
          </Section>

          {/* ═══ TRUST & SAFETY ═══ */}
          <Section className="bg-surface-900/30 border-y border-white/[0.04]">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <Reveal>
                  <p className="eyebrow mb-3">Trust &amp; safety</p>
                  <h2 className="text-[28px] sm:text-4xl font-semibold text-white leading-[1.15]">
                    Peace of mind is part of every booking.
                  </h2>
                  <p className="mt-3 text-[15px] sm:text-base text-ink-400 leading-relaxed max-w-xl">
                    We vet every professional and host, keep your payments protected, and stay with you until the job
                    is done right.
                  </p>
                </Reveal>
                <Stagger className="mt-8 grid sm:grid-cols-2 gap-5">
                  {[
                    { icon: ShieldCheck, title: "Verified people", desc: "ID, background and skills checks before any profile goes live." },
                    { icon: Lock, title: "Protected payments", desc: "Pay through Razorpay. Rental deposits are held and refunded on return." },
                    { icon: RefreshCcw, title: "Re-work guarantee", desc: "Not right the first time? We'll send someone back to fix it." },
                    { icon: Headphones, title: "Real human support", desc: "Talk to our support team seven days a week." },
                  ].map((f) => {
                    const Icon = f.icon;
                    return (
                      <StaggerItem key={f.title} className="flex gap-3.5">
                        <span className="w-10 h-10 rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.07] text-ink-200 flex items-center justify-center shrink-0">
                          <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                          <p className="mt-1 text-sm text-ink-400 leading-relaxed">{f.desc}</p>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </Stagger>

                <Reveal delay={0.1}>
                  <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-400/15">
                    <span className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-300 flex items-center justify-center shrink-0">
                      <Siren className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Something urgent?</p>
                      <p className="text-[13px] text-ink-400">Burst pipe, power failure or a broken AC — get the nearest on-call technician.</p>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => setShowEmergencyModal(true)}>
                      Emergency help
                    </Button>
                  </div>
                </Reveal>
              </div>
              <VerificationVisual />
            </div>
          </Section>

          {/* ═══ TESTIMONIALS ═══ */}
          {!providersLoading && providers.length > 0 && (
            <Section>
              <SectionHeader
                eyebrow="Customer love"
                title="Rated highly, booked again"
                subtitle="What customers say after their booking — straight from verified reviews."
              />
              <Testimonials providers={providers} />
            </Section>
          )}

          {/* ═══ REFERRALS (signed-in customers) ═══ */}
          <div className="container-page">
            <ReferralCard />
          </div>

          {/* ═══ FINAL CTA ═══ */}
          <Section>
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface-900 px-6 py-14 sm:px-12 sm:py-20 text-center">
                <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_100%,black,transparent)]" aria-hidden="true" />
                <div
                  className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 w-[720px] h-[360px] rounded-full bg-[radial-gradient(closest-side,rgb(97_80_226/0.35),transparent)] blur-2xl"
                  aria-hidden="true"
                />
                <div className="relative max-w-2xl mx-auto">
                  <h2 className="text-[32px] sm:text-5xl font-semibold text-white leading-[1.1]">
                    Get it done this week.
                  </h2>
                  <p className="mt-4 text-base sm:text-lg text-ink-300">
                    Book a verified professional or rent the gear you need — in a couple of minutes.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <ButtonLink to="/services" size="lg" iconRight={ArrowRight} className="w-full sm:w-auto">
                      Book a service
                    </ButtonLink>
                    <ButtonLink to="/rentals" size="lg" variant="secondary" className="w-full sm:w-auto">
                      Rent gear
                    </ButtonLink>
                  </div>
                  <p className="mt-6 text-sm text-ink-400">
                    Are you a professional?{" "}
                    <Link to="/login" className="text-primary-300 hover:text-primary-200 font-medium">
                      Join NexServe as a partner
                    </Link>
                  </p>
                </div>
              </div>
            </Reveal>
          </Section>
        </>
      )}

      <EmergencyBookingModal
        open={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        onSuccess={() => toast.success("Emergency request sent", "Track your technician from your dashboard.")}
      />

      {wizardService && (
        <BookingWizardModal
          service={wizardService}
          onClose={() => setWizardService(null)}
          onSuccess={() => {
            setWizardService(null);
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
}
