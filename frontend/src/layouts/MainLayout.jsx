/**
 * MainLayout — Navbar, animated page outlet, footer and mobile tab bar.
 */

import { Outlet, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Headphones, ArrowUpRight } from "lucide-react";
import Navbar from "../components/common/Navbar";
import MobileNav from "../components/common/MobileNav";
import Logo from "../components/common/Logo";
import { ease } from "../lib/motion";

const FOOTER = [
  {
    title: "Services",
    links: [
      { label: "Home cleaning", to: "/services?search=cleaning" },
      { label: "AC repair", to: "/services?search=AC" },
      { label: "Electricians", to: "/services?search=electrical" },
      { label: "Plumbing", to: "/services?search=plumbing" },
      { label: "Salon at home", to: "/services?search=salon" },
    ],
  },
  {
    title: "Rentals",
    links: [
      { label: "Cameras & photography", to: "/rentals?category=cameras-photography" },
      { label: "Camping & outdoor", to: "/rentals?category=camping-outdoor" },
      { label: "Party & event gear", to: "/rentals?category=party-event-equipment" },
      { label: "Gaming equipment", to: "/rentals?category=gaming-equipment" },
      { label: "Vehicles", to: "/rentals?category=vehicles" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About NexServe", to: "/about" },
      { label: "Trust & safety", to: "/about#trust" },
      { label: "Become a professional", to: "/login" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Service history", to: "/history" },
      { label: "My rentals", to: "/my-rentals" },
      { label: "Help center", to: "/contact#faq" },
    ],
  },
];

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-surface-950 text-ink-100">
      <Navbar />

      <main id="main-content" className="flex-1 outline-none" tabIndex={-1}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: ease.out }}
        >
          <Outlet />
        </motion.div>
      </main>

      <MobileNav />

      <footer className="relative border-t border-white/[0.06] bg-surface-950 pb-24 md:pb-0">
        <div className="container-page pt-16 pb-10">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-4 text-sm text-ink-400 leading-relaxed">
                The marketplace for trusted home services and verified gear rentals — booked in minutes, protected end to end.
              </p>
              <ul className="mt-6 space-y-2.5 text-[13px] text-ink-300">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent-400" aria-hidden="true" />
                  Background-verified professionals
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  Secure payments &amp; protected deposits
                </li>
                <li className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-primary-300" aria-hidden="true" />
                  Support 7 days a week
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
              {FOOTER.map((col) => (
                <div key={col.title}>
                  <h3 className="text-[13px] font-semibold text-white">{col.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <Link to={l.to} className="text-[13px] text-ink-400 hover:text-white transition-colors">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-ink-500">
            <p>© {new Date().getFullYear()} NexServe Technologies. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <Link to="/about#trust" className="hover:text-ink-200 transition-colors">
                Privacy
              </Link>
              <Link to="/about#trust" className="hover:text-ink-200 transition-colors">
                Terms
              </Link>
              <a href="mailto:support@nexserve.com" className="inline-flex items-center gap-1 hover:text-ink-200 transition-colors">
                support@nexserve.com
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
