/**
 * HeroEcosystem — the homepage hero.
 *
 * A stable central search sits inside a slow elliptical orbit of service
 * cards. Cards travel the left and right gutters and fade as they pass
 * behind the centre column, so the headline and search are never covered.
 * Each time the rotating headline changes, the orbit eases forward until
 * the matching service is in view and a hairline connector links it to
 * the search panel.
 *
 * Per-frame work mutates transforms through refs (no React re-renders).
 * Reduced motion: static layout, no drift, no parallax.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
  useReducedMotion,
  useInView,
} from "framer-motion";
import {
  Search,
  MapPin,
  Sparkles,
  Snowflake,
  Droplets,
  Scissors,
  Dumbbell,
  GraduationCap,
  Camera,
  Car,
  Zap,
  Paintbrush,
  Package,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "../ui";
import { tones } from "../../lib/visuals";
import { ease } from "../../lib/motion";

export const CITIES = ["Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad"];

const ORBIT = [
  { key: "cleaning", label: "Home Cleaning", sub: "Deep clean · Sofa · Kitchen", icon: Sparkles, tone: "sky", to: "/services?search=cleaning" },
  { key: "ac", label: "AC Repair", sub: "Service · Gas refill · Install", icon: Snowflake, tone: "blue", to: "/services?search=AC" },
  { key: "plumbing", label: "Plumbing", sub: "Leaks · Fittings · Drains", icon: Droplets, tone: "sky", to: "/services?search=plumbing" },
  { key: "salon", label: "Salon at Home", sub: "Hair · Skin · Grooming", icon: Scissors, tone: "rose", to: "/services?search=salon" },
  { key: "fitness", label: "Fitness", sub: "Personal trainers · Yoga", icon: Dumbbell, tone: "amber", to: "/services?search=fitness" },
  { key: "tutoring", label: "Tutoring", sub: "STEM · Languages · Coding", icon: GraduationCap, tone: "violet", to: "/services?search=tutor" },
  { key: "photography", label: "Photography", sub: "Cameras & lenses to rent", icon: Camera, tone: "violet", to: "/rentals?category=cameras-photography" },
  { key: "car", label: "Car Service", sub: "Detailing · Wash · Battery", icon: Car, tone: "indigo", to: "/services?search=car" },
  { key: "electrical", label: "Electrical", sub: "Wiring · Fixtures · Panels", icon: Zap, tone: "amber", to: "/services?search=electrical" },
  { key: "painting", label: "Painting", sub: "Interiors · Textures", icon: Paintbrush, tone: "rose", to: "/services?search=painting" },
  { key: "rentals", label: "Rentals", sub: "Gear, cameras, camping", icon: Package, tone: "emerald", to: "/rentals" },
];

export const MESSAGES = [
  { q: "Need your AC fixed?", a: "Find a verified technician.", key: "ac" },
  { q: "Need your home cleaned?", a: "Book a trusted professional.", key: "cleaning" },
  { q: "Need equipment?", a: "Rent verified gear.", key: "rentals" },
  { q: "Need a tutor?", a: "Find the right expert.", key: "tutoring" },
];

const MESSAGE_MS = 4200;
const CARD_W = 212;
const CARD_H = 64;
const DRIFT = (Math.PI * 2) / 110; // one revolution ≈ 110s
// Anchor angles where a highlighted card is comfortably visible (screen coords, y down).
const ANCHORS = [-0.26, 0.26, Math.PI - 0.26, Math.PI + 0.26];

/* ───────────────────────── Rotating headline ───────────────────────── */

function RotatingHeadline({ index }) {
  const m = MESSAGES[index];
  // Every message is rendered invisibly in the same grid cell so the block
  // always reserves the height of the longest one — no layout shift, no overlap.
  const line = "[grid-area:1/1] block";
  return (
    <h1 className="font-heading">
      <span className="sr-only">NexServe — book trusted home services and rent verified gear.</span>
      <span aria-hidden="true" className="block text-[38px] sm:text-[56px] xl:text-[64px] font-semibold leading-[1.08] tracking-[-0.035em]">
        <span className="grid text-ink-400">
          {MESSAGES.map((msg) => (
            <span key={msg.q} className={cn(line, "invisible")}>
              {msg.q}
            </span>
          ))}
          <AnimatePresence initial={false}>
            <motion.span
              key={m.q}
              className={line}
              initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.55, ease: ease.out }}
            >
              {m.q}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="grid mt-1">
          {MESSAGES.map((msg) => (
            <span key={msg.a} className={cn(line, "invisible")}>
              {msg.a}
            </span>
          ))}
          <AnimatePresence initial={false}>
            <motion.span
              key={m.a}
              className={cn(line, "text-gradient pb-1")}
              initial={{ opacity: 0, y: 24, scale: 0.98, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.6, delay: 0.1, ease: ease.out }}
            >
              {m.a}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </h1>
  );
}

/* ───────────────────────── Orbit card ───────────────────────── */

function OrbitCard({ item, active, cardRef }) {
  const Icon = item.icon;
  const t = tones[item.tone];
  return (
    <div
      ref={cardRef}
      className="absolute left-0 top-0 will-change-transform"
      style={{ width: CARD_W, height: CARD_H, opacity: 0 }}
    >
      <Link
        to={item.to}
        tabIndex={-1}
        className={cn(
          "group flex items-center gap-3 h-full pl-2.5 pr-4 rounded-2xl border backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-500",
          active
            ? "bg-surface-850/90 border-primary-300/40 shadow-[0_0_0_1px_rgb(139_135_248/0.25),0_18px_50px_-12px_rgb(97_80_226/0.55)]"
            : "bg-surface-900/70 border-white/[0.08] shadow-[0_12px_40px_-16px_rgb(0_0_0/0.8)] hover:border-white/20"
        )}
      >
        <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset", t.bg, t.ring)}>
          <Icon className={cn("w-[18px] h-[18px]", t.icon)} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white leading-tight truncate">{item.label}</span>
          <span className="block text-xs text-ink-400 leading-tight mt-1 truncate">{item.sub}</span>
        </span>
      </Link>
    </div>
  );
}

/* ───────────────────────── Orbit system ───────────────────────── */

function Orbit({ activeKey, contentHalfWidth, paused }) {
  const wrapRef = useRef(null);
  const cardRefs = useRef([]);
  const dotRefs = useRef([]);
  const lineRef = useRef(null);
  const ringRefs = useRef([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const stateRef = useRef({ t: 0, offset: 0, target: 0, last: 0 });
  const reduce = useReducedMotion();
  const activeIdx = ORBIT.findIndex((o) => o.key === activeKey);
  const activeRef = useRef(activeIdx);
  activeRef.current = activeIdx;

  // Measure container.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      sizeRef.current = { w: entry.contentRect.width, h: entry.contentRect.height };
    });
    ro.observe(el);
    sizeRef.current = { w: el.clientWidth, h: el.clientHeight };
    return () => ro.disconnect();
  }, []);

  // When the highlight changes, ease the orbit so that card reaches the nearest anchor ahead.
  useEffect(() => {
    if (activeIdx < 0) return;
    const s = stateRef.current;
    const base = (activeIdx / ORBIT.length) * Math.PI * 2;
    const current = base + s.t * DRIFT + s.target;
    let best = Infinity;
    for (const a of ANCHORS) {
      let d = (a - current) % (Math.PI * 2);
      if (d < 0) d += Math.PI * 2;
      if (d < best) best = d;
    }
    s.target += best;
  }, [activeIdx]);

  useEffect(() => {
    let raf;
    const frame = (now) => {
      const s = stateRef.current;
      const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 0;
      s.last = now;
      if (reduce) {
        s.offset = s.target;
      } else if (!paused) {
        s.t += dt;
        // Critically-damped ease toward the target offset.
        s.offset += (s.target - s.offset) * (1 - Math.exp(-dt * 2.4));
      }
      if (!paused || !s.rendered) {
        render();
        s.rendered = sizeRef.current.w > 0;
      }
      raf = requestAnimationFrame(frame);
    };

    const render = () => {
      const { w, h } = sizeRef.current;
      if (!w || !h) return;
      const s = stateRef.current;
      const cx = w / 2;
      const cy = h * 0.47;
      const rx = w / 2 - CARD_W / 2 - 20;
      const ry = h * 0.36;
      const hide = contentHalfWidth + CARD_W * 0.42;
      let activePos = null;

      ORBIT.forEach((item, i) => {
        const el = cardRefs.current[i];
        if (!el) return;
        const theta = (i / ORBIT.length) * Math.PI * 2 + s.t * DRIFT + s.offset;
        const x = cx + Math.cos(theta) * rx;
        const y = cy + Math.sin(theta) * ry;
        const depth = (Math.sin(theta) + 1) / 2; // 0 far (top) → 1 near (bottom)
        const reveal = Math.min(1, Math.max(0, (Math.abs(x - cx) - hide) / 90));
        const isActive = i === activeRef.current;
        const scale = (0.86 + depth * 0.16) * (isActive ? 1.06 : 1);
        const opacity = reveal * (0.68 + depth * 0.32) * (isActive ? 1 : 0.9);
        el.style.transform = `translate3d(${x - CARD_W / 2}px, ${y - CARD_H / 2}px, 0) scale(${scale})`;
        el.style.opacity = opacity.toFixed(3);
        el.style.zIndex = String(Math.round(depth * 10) + (isActive ? 20 : 0));
        el.style.pointerEvents = opacity > 0.4 ? "auto" : "none";
        if (isActive) activePos = { x, y, opacity };
      });

      // Inner decorative ring of dots drifting the opposite way.
      dotRefs.current.forEach((el, i) => {
        if (!el) return;
        const theta = (i / dotRefs.current.length) * Math.PI * 2 - s.t * DRIFT * 1.6;
        const x = cx + Math.cos(theta) * rx * 0.74;
        const y = cy + Math.sin(theta) * ry * 0.74;
        const reveal = Math.min(1, Math.max(0, (Math.abs(x - cx) - contentHalfWidth) / 60));
        el.style.transform = `translate3d(${x - 3}px, ${y - 3}px, 0)`;
        el.style.opacity = (reveal * 0.7).toFixed(3);
      });

      // Ellipse guides follow the container size.
      ringRefs.current.forEach((el, i) => {
        if (!el) return;
        const k = i === 0 ? 1 : 0.74;
        el.setAttribute("cx", cx);
        el.setAttribute("cy", cy);
        el.setAttribute("rx", rx * k);
        el.setAttribute("ry", ry * k);
      });

      // Connector from the search panel edge to the highlighted card.
      const line = lineRef.current;
      if (line) {
        if (activePos && activePos.opacity > 0.05) {
          const side = activePos.x < cx ? -1 : 1;
          const sx = cx + side * (contentHalfWidth - 8);
          const sy = cy + 56;
          const ex = activePos.x - side * (CARD_W / 2 - 6);
          const ey = activePos.y;
          const mx = (sx + ex) / 2;
          line.setAttribute("d", `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`);
          line.style.opacity = (activePos.opacity * 0.9).toFixed(3);
        } else {
          line.style.opacity = "0";
        }
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce, paused, contentHalfWidth]);

  return (
    <div ref={wrapRef} className="absolute inset-0" aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          <linearGradient id="orbit-link" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#8b87f8" stopOpacity="0" />
            <stop offset="0.5" stopColor="#8b87f8" stopOpacity="0.8" />
            <stop offset="1" stopColor="#6ee7c8" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <ellipse ref={(el) => (ringRefs.current[0] = el)} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeDasharray="2 6" />
        <ellipse ref={(el) => (ringRefs.current[1] = el)} fill="none" stroke="rgb(255 255 255 / 0.04)" />
        <path
          ref={lineRef}
          fill="none"
          stroke="url(#orbit-link)"
          strokeWidth="1.25"
          strokeDasharray="4 6"
          className="[animation:orbitDash_1.6s_linear_infinite]"
          style={{ opacity: 0, transition: "opacity 0.3s" }}
        />
      </svg>
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          ref={(el) => (dotRefs.current[i] = el)}
          className="absolute left-0 top-0 w-1.5 h-1.5 rounded-full bg-primary-300/70 will-change-transform"
          style={{ opacity: 0 }}
        />
      ))}
      {ORBIT.map((item, i) => (
        <OrbitCard key={item.key} item={item} active={item.key === activeKey} cardRef={(el) => (cardRefs.current[i] = el)} />
      ))}
    </div>
  );
}

/* ───────────────────────── Marquee (below xl) ───────────────────────── */

function ServiceMarquee({ activeKey }) {
  const rows = [ORBIT.slice(0, 6), ORBIT.slice(5)];
  return (
    <div
      className="relative mt-10 space-y-3 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
      aria-label="Popular services"
    >
      {rows.map((row, r) => (
        <div key={r} className="overflow-hidden">
          <motion.ul
            className="flex gap-3 w-max"
            animate={{ x: r === 0 ? ["0%", "-50%"] : ["-50%", "0%"] }}
            transition={{ duration: 38 + r * 6, ease: "linear", repeat: Infinity }}
          >
            {[...row, ...row].map((item, i) => {
              const Icon = item.icon;
              const t = tones[item.tone];
              const active = item.key === activeKey;
              return (
                <li key={`${item.key}-${i}`} aria-hidden={i >= row.length}>
                  <Link
                    to={item.to}
                    tabIndex={i >= row.length ? -1 : 0}
                    className={cn(
                      "flex items-center gap-2.5 h-11 pl-1.5 pr-4 rounded-xl border transition-colors duration-500",
                      active ? "bg-surface-850 border-primary-300/40" : "bg-surface-900/80 border-white/[0.08]"
                    )}
                  >
                    <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center", t.bg)}>
                      <Icon className={cn("w-4 h-4", t.icon)} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-ink-100 whitespace-nowrap">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

export default function HeroEcosystem({ query, onQueryChange, city, onCityChange, onSubmit, popular = [] }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const heroRef = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(heroRef, { amount: 0.15 });
  const [focused, setFocused] = useState(false);

  // Rotate the headline; pause while the user is typing in the search box.
  useEffect(() => {
    if (focused || !inView) return;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), MESSAGE_MS);
    return () => clearInterval(id);
  }, [focused, inView]);

  // Pointer parallax.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const orbitX = useTransform(sx, (v) => v * -16);
  const orbitY = useTransform(sy, (v) => v * -12);
  const glowX = useTransform(sx, (v) => v * 30);
  const glowY = useTransform(sy, (v) => v * 20);

  // Scroll parallax.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const orbitScrollY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const orbitFade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 70]);

  const onPointerMove = (e) => {
    if (reduce) return;
    const r = heroRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const activeKey = MESSAGES[msgIdx].key;

  return (
    <section
      ref={heroRef}
      onPointerMove={onPointerMove}
      className="relative overflow-hidden pt-28 sm:pt-32 xl:pt-0 xl:min-h-[860px] xl:h-[100svh] xl:max-h-[980px] flex items-center"
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent)]" />
        <motion.div
          style={{ x: glowX, y: glowY }}
          className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[900px] h-[560px] rounded-full bg-[radial-gradient(closest-side,rgb(97_80_226/0.28),transparent)] blur-2xl"
        />
        <div className="absolute left-[18%] top-[70%] w-[420px] h-[320px] rounded-full bg-[radial-gradient(closest-side,rgb(59_130_246/0.12),transparent)] blur-2xl" />
        <div className="absolute right-[14%] top-[22%] w-[380px] h-[300px] rounded-full bg-[radial-gradient(closest-side,rgb(20_184_143/0.10),transparent)] blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-surface-950" />
      </div>

      {/* Orbit (xl and up) */}
      <motion.div
        className="hidden xl:block absolute inset-0"
        style={{ x: orbitX, y: reduce ? 0 : orbitScrollY, opacity: orbitFade }}
      >
        <motion.div className="absolute inset-0" style={{ y: orbitY }}>
          <Orbit activeKey={activeKey} contentHalfWidth={400} paused={!inView} />
        </motion.div>
      </motion.div>

      {/* Centre column */}
      <motion.div style={{ y: reduce ? 0 : contentY }} className="relative z-30 container-page w-full">
        <div className="relative mx-auto max-w-[820px] text-center">
          {/* Soft vignette keeps text legible over the orbit guides */}
          <div
            className="hidden xl:block absolute -inset-x-16 -inset-y-20 -z-10 bg-[radial-gradient(closest-side,rgb(7_9_14/0.92),rgb(7_9_14/0.6)_60%,transparent)]"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: ease.out }}
            className="inline-flex items-center gap-2 h-8 pl-1.5 pr-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-[13px] text-ink-300"
          >
            <span className="inline-flex items-center h-5 px-2 rounded-full bg-emerald-400/15 text-emerald-300 text-[11px] font-semibold">
              New
            </span>
            Services and rentals, one account
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: ease.out }}
            className="mt-7"
          >
            <RotatingHeadline index={msgIdx} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: ease.out }}
            className="mt-6 mx-auto max-w-[540px] text-base sm:text-lg text-ink-400 leading-relaxed"
          >
            NexServe connects you with background-verified professionals for home services, and with
            trusted hosts for gear you only need for a few days.
          </motion.p>

          {/* Search panel */}
          <motion.form
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.24, ease: ease.out }}
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            role="search"
            className={cn(
              "mt-9 mx-auto max-w-[680px] p-2 rounded-[20px] bg-surface-900/85 backdrop-blur-xl border flex flex-col sm:flex-row items-stretch gap-2 text-left transition-[border-color,box-shadow] duration-300",
              focused
                ? "border-primary-400/40 shadow-[0_0_0_4px_rgb(116_104_240/0.12),0_24px_60px_-20px_rgb(0_0_0/0.8)]"
                : "border-white/[0.09] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)]"
            )}
          >
            <label className="relative flex items-center gap-2 h-12 sm:h-14 pl-3.5 pr-2 rounded-2xl sm:rounded-xl hover:bg-white/[0.03] transition-colors sm:w-[170px] shrink-0 cursor-pointer">
              <MapPin className="w-[18px] h-[18px] text-primary-300 shrink-0" aria-hidden="true" />
              <span className="sr-only">City</span>
              <select
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
                className="appearance-none bg-transparent text-[15px] font-medium text-white outline-none cursor-pointer flex-1 pr-5"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c} className="bg-surface-850">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-ink-400 absolute right-2 pointer-events-none" aria-hidden="true" />
            </label>
            <span className="hidden sm:block w-px my-3 bg-white/[0.08]" aria-hidden="true" />
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3.5 w-[18px] h-[18px] text-ink-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Try “deep cleaning” or “AC service”"
                aria-label="What service do you need?"
                className="w-full h-12 sm:h-14 pl-11 pr-3 bg-transparent text-[15px] sm:text-base text-white placeholder:text-ink-500 outline-none [&::-webkit-search-cancel-button]:hidden"
              />
            </div>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="group h-12 sm:h-14 px-6 rounded-2xl sm:rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-colors shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_10px_24px_-10px_rgb(97_80_226/0.8)]"
            >
              Search
              <ArrowRight className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </motion.button>
          </motion.form>

          {popular.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[13px]"
            >
              <span className="text-ink-500">Popular:</span>
              {popular.map((p) => (
                <Link
                  key={p.to}
                  to={p.to}
                  className="h-7 px-2.5 inline-flex items-center rounded-lg text-ink-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-colors"
                >
                  {p.label}
                </Link>
              ))}
            </motion.div>
          )}
        </div>

        <div className="xl:hidden">
          <ServiceMarquee activeKey={activeKey} />
        </div>
      </motion.div>
    </section>
  );
}
