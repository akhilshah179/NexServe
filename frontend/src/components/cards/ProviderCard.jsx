import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Briefcase, Zap, Siren, Send, ArrowUpRight } from "lucide-react";
import { Avatar, Rating, VerifiedBadge, cn } from "../ui";
import { formatINR } from "../../lib/format";
import { ease } from "../../lib/motion";

/**
 * ProviderCard — professional summary that links to the full profile.
 * `startingPrice` overrides the hourly rate when the caller knows the
 * provider's cheapest service in the current category.
 */
export default function ProviderCard({ provider: p, startingPrice, to, className }) {
  const href = to || `/providers/${p.id}`;
  const instant = (p.booking_mode || "instant_booking") !== "request_booking";
  const verified = !p.verification_status || p.verification_status === "approved";
  const price = startingPrice ?? p.hourly_rate;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.28, ease: ease.out }}
      className={cn("group relative surface card-interactive p-5 flex flex-col h-full", className)}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar src={p.profile_image} name={p.full_name} size="lg" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-surface-900",
              instant ? "bg-emerald-400" : "bg-amber-400"
            )}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-white truncate">
              <Link
                to={href}
                className="focus-visible:outline-none after:absolute after:inset-0 after:content-[''] after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-primary-400/60"
              >
                {p.full_name}
              </Link>
            </h3>
            {verified && <VerifiedBadge iconOnly />}
          </div>
          <p className="mt-0.5 text-[13px] text-ink-400 flex items-center gap-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{p.location || "Available across the city"}</span>
          </p>
          <div className="mt-2 flex items-center gap-3 text-[13px]">
            <Rating value={p.rating} count={p.review_count} />
            {p.experience_years ? (
              <span className="inline-flex items-center gap-1 text-ink-300">
                <Briefcase className="w-3.5 h-3.5 text-ink-400" aria-hidden="true" />
                {p.experience_years} yrs
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {p.bio && <p className="mt-4 text-sm text-ink-400 leading-relaxed line-clamp-2">{p.bio}</p>}

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium ring-1 ring-inset",
            instant ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" : "bg-amber-500/10 text-amber-300 ring-amber-400/20"
          )}
        >
          {instant ? <Zap className="w-3 h-3" aria-hidden="true" /> : <Send className="w-3 h-3" aria-hidden="true" />}
          {instant ? "Instant booking" : "On request"}
        </span>
        {p.emergency_available && (
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-400/20">
            <Siren className="w-3 h-3" aria-hidden="true" />
            24/7 emergency
          </span>
        )}
        {p.service_radius_km ? (
          <span className="inline-flex items-center h-6 px-2 rounded-md text-xs font-medium bg-white/[0.04] text-ink-300 ring-1 ring-inset ring-white/[0.08]">
            {p.service_radius_km} km radius
          </span>
        ) : null}
      </div>

      <div className="mt-auto pt-5">
        <div className="pt-4 border-t border-white/[0.06] flex items-end justify-between">
          <div>
            <p className="text-xs text-ink-400">{startingPrice != null ? "Services from" : "Hourly rate"}</p>
            <p className="text-lg font-semibold text-white tabular font-heading">
              {price != null ? formatINR(price) : "On quote"}
              {startingPrice == null && price != null && <span className="text-sm font-normal text-ink-400">/hr</span>}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-300 group-hover:text-primary-200 transition-colors">
            View profile
            <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}
