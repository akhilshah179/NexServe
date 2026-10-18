/**
 * Homepage sections that are self-contained enough to live outside Home.jsx.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  UserCheck,
  CalendarClock,
  ShieldCheck,
  CalendarRange,
  Truck,
  Wallet,
  RotateCcw,
  Quote,
  Star,
  BadgeCheck,
  Fingerprint,
  ClipboardCheck,
  Lock,
} from "lucide-react";
import { fetchProviderReviewsApi } from "../../api/reviewsApi";
import { Avatar, Rating, Tabs, Reveal, Stagger, StaggerItem, AnimatedNumber, cn } from "../ui";
import { ease } from "../../lib/motion";
import { formatDate } from "../../lib/format";

/* ───────────────────────── How it works ───────────────────────── */

const FLOWS = {
  services: [
    { icon: Search, title: "Tell us what you need", desc: "Search or browse by category — every listing shows a clear starting price and duration." },
    { icon: UserCheck, title: "Choose your professional", desc: "Compare verified pros by rating, experience and reviews. Instant or on-request booking." },
    { icon: CalendarClock, title: "Pick a time that works", desc: "See live availability and lock a slot. Add your address, notes and photos of the job." },
    { icon: ShieldCheck, title: "Pay securely, track live", desc: "Pay through Razorpay, follow the job in real time and rate your pro when it's done." },
  ],
  rentals: [
    { icon: CalendarRange, title: "Pick your dates", desc: "Choose pickup and return dates — we only show gear that's free for your range." },
    { icon: Truck, title: "Delivery or self-pickup", desc: "Have it delivered to your door or collect it from the host. Your call." },
    { icon: Wallet, title: "Pay rent + refundable deposit", desc: "One secure checkout. The deposit is held safely, never spent." },
    { icon: RotateCcw, title: "Return and get it back", desc: "Hand the item back, the host inspects it, and your deposit is refunded." },
  ],
};

export function HowItWorks() {
  const [flow, setFlow] = useState("services");
  const steps = FLOWS[flow];
  const rental = flow === "rentals";
  return (
    <div>
      <div className="flex justify-center mb-10">
        <Tabs
          ariaLabel="Choose a flow"
          value={flow}
          onChange={setFlow}
          accent={rental ? "rental" : "primary"}
          items={[
            { id: "services", label: "Booking a service" },
            { id: "rentals", label: "Renting gear" },
          ]}
        />
      </div>
      <div className="relative">
        <div
          className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
          aria-hidden="true"
        />
        <AnimatePresence mode="wait">
          <motion.ol
            key={flow}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.li
                  key={s.title}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: ease.out } },
                  }}
                  className="relative text-left lg:text-center"
                >
                  <div className="flex lg:flex-col items-start lg:items-center gap-4">
                    <div
                      className={cn(
                        "relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-inset bg-surface-900",
                        rental ? "ring-emerald-400/20 text-emerald-300" : "ring-primary-400/20 text-primary-300"
                      )}
                    >
                      <Icon className="w-6 h-6" aria-hidden="true" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface-950 ring-1 ring-white/10 text-[11px] font-semibold text-ink-300 flex items-center justify-center tabular">
                        {i + 1}
                      </span>
                    </div>
                    <div className="lg:mt-2">
                      <h3 className="text-base font-semibold text-white">{s.title}</h3>
                      <p className="mt-1.5 text-sm text-ink-400 leading-relaxed lg:max-w-[240px] lg:mx-auto">{s.desc}</p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────────────────── Trust & safety visual ───────────────────────── */

const CHECKS = [
  { icon: Fingerprint, label: "Government ID verified" },
  { icon: ClipboardCheck, label: "Background check cleared" },
  { icon: BadgeCheck, label: "Skills assessment passed" },
  { icon: Lock, label: "Payments protected" },
];

export function VerificationVisual() {
  return (
    <div className="relative">
      <div
        className="absolute -inset-10 bg-[radial-gradient(closest-side,rgb(59_130_246/0.14),transparent)] blur-2xl"
        aria-hidden="true"
      />
      <div className="relative surface-raised p-6 sm:p-7 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-500/12 text-accent-300 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Professional verification</p>
            <p className="text-xs text-ink-400">Required before any profile goes live</p>
          </div>
        </div>
        <Stagger className="mt-6 space-y-2.5" gap={0.12}>
          {CHECKS.map((c) => {
            const Icon = c.icon;
            return (
              <StaggerItem
                key={c.label}
                className="flex items-center gap-3 h-12 px-3.5 rounded-xl bg-white/[0.025] border border-white/[0.05]"
              >
                <Icon className="w-4 h-4 text-ink-400" aria-hidden="true" />
                <span className="flex-1 text-sm text-ink-200">{c.label}</span>
                <motion.span
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.3 }}
                  className="w-5 h-5 rounded-full bg-emerald-400 text-surface-950 flex items-center justify-center"
                >
                  <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
                    <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.span>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </div>
  );
}

/* ───────────────────────── Testimonials (live reviews) ───────────────────────── */

/**
 * Pulls real customer reviews for the given providers. When there aren't
 * enough written reviews yet, it falls back to an aggregate rating panel
 * built from provider ratings — never invented quotes.
 */
export function Testimonials({ providers }) {
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    if (!providers.length) {
      setReviews([]);
      return;
    }
    let alive = true;
    const top = [...providers].sort((a, b) => (b.review_count || 0) - (a.review_count || 0)).slice(0, 6);
    Promise.allSettled(top.map((p) => fetchProviderReviewsApi(p.id))).then((results) => {
      if (!alive) return;
      const list = [];
      results.forEach((r, i) => {
        if (r.status !== "fulfilled" || !Array.isArray(r.value)) return;
        r.value
          .filter((rev) => (rev.comment || "").trim().length >= 24 && Number(rev.rating) >= 4)
          .forEach((rev) => list.push({ ...rev, provider: top[i] }));
      });
      setReviews(list.slice(0, 6));
    });
    return () => {
      alive = false;
    };
  }, [providers]);

  const rated = providers.filter((p) => Number(p.rating) > 0);
  const totalReviews = rated.reduce((s, p) => s + (Number(p.review_count) || 0), 0);
  const avg = rated.length ? rated.reduce((s, p) => s + Number(p.rating), 0) / rated.length : 0;

  if (reviews === null) return null;

  if (reviews.length >= 3) {
    return (
      <Stagger className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <StaggerItem key={r.id} className="surface p-6 flex flex-col">
            <Quote className="w-6 h-6 text-primary-400/60" aria-hidden="true" />
            <p className="mt-4 text-[15px] text-ink-100 leading-relaxed flex-1">“{r.comment}”</p>
            <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center gap-3">
              <Avatar name={r.customer?.full_name || "Customer"} src={r.customer?.profile_image} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{r.customer?.full_name || "Verified customer"}</p>
                <p className="text-xs text-ink-400 truncate">
                  Booked {r.provider.full_name} · {formatDate(r.created_at)}
                </p>
              </div>
              <Rating value={r.rating} />
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    );
  }

  if (!rated.length) return null;

  const top = [...rated].sort((a, b) => b.rating - a.rating || (b.review_count || 0) - (a.review_count || 0)).slice(0, 4);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
      <Reveal className="surface p-7 sm:p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className={cn("w-5 h-5", i < Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-surface-600")} />
            ))}
          </div>
          <p className="mt-5 text-6xl font-semibold text-white tabular tracking-tight font-heading">
            <AnimatedNumber value={avg} format={(n) => n.toFixed(1)} />
          </p>
          <p className="mt-2 text-ink-400">
            Average professional rating across{" "}
            <span className="text-ink-100 font-medium">
              <AnimatedNumber value={totalReviews} /> customer reviews
            </span>
            .
          </p>
        </div>
        <p className="mt-8 text-sm text-ink-500">Updated live as new reviews come in.</p>
      </Reveal>
      <Stagger className="grid sm:grid-cols-2 gap-4">
        {top.map((p) => (
          <StaggerItem key={p.id} className="surface p-5 flex items-center gap-4">
            <Avatar src={p.profile_image} name={p.full_name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{p.full_name}</p>
              <p className="text-xs text-ink-400 truncate">{p.location}</p>
            </div>
            <Rating value={p.rating} count={p.review_count} />
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
