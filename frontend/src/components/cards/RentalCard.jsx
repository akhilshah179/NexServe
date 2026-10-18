import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Truck, Store, ShieldCheck, CalendarCheck, ArrowRight } from "lucide-react";
import { Rating, SmartImage, cn } from "../ui";
import { rentalImage, rentalVisual } from "../../lib/visuals";
import { formatINR } from "../../lib/format";
import { ease } from "../../lib/motion";

/**
 * RentalCard — large-image listing card with rental-specific pricing.
 * `datesSelected` switches the availability line to "Available for your
 * dates" (the catalogue API already filters by date range).
 */
export default function RentalCard({ item, to, datesSelected, className }) {
  const title = item.title || item.name || "Rental item";
  const daily = item.daily_rate ?? item.price_per_day ?? 0;
  const deposit = item.security_deposit ?? 0;
  const delivery = item.delivery_available ?? item.is_delivery_available;
  const pickup = item.pickup_available ?? item.is_pickup_available;
  const location = item.city || item.location;
  const visual = rentalVisual(item.category);
  const Icon = visual.icon;
  const stock = Number(item.quantity ?? 1);

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.28, ease: ease.out }}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-surface-900 border border-white/[0.06] shadow-[var(--shadow-card)] card-interactive hover:border-emerald-400/20 flex flex-col h-full",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-850">
        <SmartImage
          src={rentalImage(item)}
          alt={title}
          fallbackIcon={Icon}
          tone="rental"
          className="absolute inset-0"
          imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950/70 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 max-w-[calc(100%-24px)] inline-flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-lg bg-surface-950/70 backdrop-blur-md text-xs font-medium text-white ring-1 ring-inset ring-white/10">
          <Icon className="w-3.5 h-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
          <span className="truncate">{item.category?.name || "Rental"}</span>
        </span>
        <div className="absolute left-3 bottom-3 flex gap-1.5">
          {delivery && (
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-surface-950/75 backdrop-blur-md text-[11px] font-medium text-white ring-1 ring-inset ring-white/10">
              <Truck className="w-3 h-3 text-emerald-300" aria-hidden="true" />
              Delivery
            </span>
          )}
          {pickup && (
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-surface-950/75 backdrop-blur-md text-[11px] font-medium text-white ring-1 ring-inset ring-white/10">
              <Store className="w-3 h-3 text-emerald-300" aria-hidden="true" />
              Pickup
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5">
        <div className="mb-1.5">
          <Rating value={item.rating} count={item.review_count} />
        </div>
        <h3 className="text-base font-semibold text-white leading-snug line-clamp-2">
          <Link
            to={to || `/rentals/${item.id}`}
            className="focus-visible:outline-none after:absolute after:inset-0 after:content-[''] after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-emerald-400/60"
          >
            {title}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-400">
          {location && (
            <span className="inline-flex items-center gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[180px]">{location}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-emerald-300">
            <CalendarCheck className="w-3.5 h-3.5" aria-hidden="true" />
            {datesSelected ? "Available for your dates" : stock > 1 ? `${stock} in stock` : "Available"}
          </span>
        </div>

        <div className="mt-auto pt-4">
          <div className="pt-4 border-t border-white/[0.06] flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xl font-semibold text-white tabular font-heading">
                {formatINR(daily)}
                <span className="text-sm font-normal text-ink-400"> /day</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-400 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-300" aria-hidden="true" />
                {formatINR(deposit)} deposit
              </p>
            </div>
            <span className="relative inline-flex items-center gap-1 h-9 pl-3.5 pr-3 rounded-xl text-sm font-semibold bg-emerald-400/10 text-emerald-200 ring-1 ring-inset ring-emerald-400/25 transition-colors duration-200 group-hover:bg-emerald-400 group-hover:text-surface-950 group-hover:ring-emerald-400 shrink-0">
              Rent
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
