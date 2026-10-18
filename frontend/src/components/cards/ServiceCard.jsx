import { motion } from "framer-motion";
import { Clock, Zap, Send, ArrowRight } from "lucide-react";
import { Rating, cn } from "../ui";
import { serviceVisual } from "../../lib/visuals";
import { formatINR, formatDuration } from "../../lib/format";
import { ease } from "../../lib/motion";

/**
 * ServiceCard
 * - `media` variant shows a category photograph (for mixed-category grids).
 * - default variant leads with the category icon (for single-category grids
 *   where repeated photos would look monotonous).
 */
export default function ServiceCard({ service, category, onBook, onDetails, media = false, showCategory = true, className }) {
  const cat = category || service.category;
  const visual = serviceVisual(cat);
  const Icon = visual.icon;
  const instant = (service.provider?.booking_mode || "instant_booking") !== "request_booking";
  const clickable = !!onDetails;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.28, ease: ease.out }}
      className={cn(
        "group relative surface card-interactive overflow-hidden flex flex-col h-full",
        clickable && "cursor-pointer",
        className
      )}
      onClick={clickable ? () => onDetails(service) : undefined}
    >
      {media ? (
        <div className="relative h-40 overflow-hidden bg-surface-850">
          <img
            src={visual.image}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/20 to-transparent" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-lg bg-surface-950/70 backdrop-blur-md text-xs font-medium text-white ring-1 ring-inset ring-white/10">
            <span className={cn("w-5 h-5 rounded-md flex items-center justify-center", visual.toneClasses.bg)}>
              <Icon className={cn("w-3 h-3", visual.toneClasses.icon)} aria-hidden="true" />
            </span>
            {cat?.name || "Service"}
          </span>
        </div>
      ) : !showCategory ? (
        <div className="px-5 pt-5 flex items-center justify-between gap-3">
          <Rating value={service.rating} count={service.review_count} />
        </div>
      ) : (
        <div className="px-5 pt-5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-300 min-w-0">
            <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", visual.toneClasses.bg)}>
              <Icon className={cn("w-4 h-4", visual.toneClasses.icon)} aria-hidden="true" />
            </span>
            <span className="truncate">{cat?.name || "Service"}</span>
          </span>
          <Rating value={service.rating} count={service.review_count} />
        </div>
      )}

      <div className={cn("flex-1 flex flex-col px-5", media ? "pt-4" : "pt-4")}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-white leading-snug line-clamp-2 group-hover:text-primary-100 transition-colors">
            {clickable ? (
              <button
                type="button"
                className="text-left focus-visible:outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-primary-400/60 after:rounded-2xl"
                onClick={(e) => {
                  e.stopPropagation();
                  onDetails(service);
                }}
              >
                {service.title || service.name}
              </button>
            ) : (
              service.title || service.name
            )}
          </h3>
          {media && <Rating value={service.rating} count={service.review_count} className="shrink-0 mt-0.5" />}
        </div>
        <p className="mt-1.5 text-sm text-ink-400 leading-relaxed line-clamp-2">
          {service.description || "Delivered by a verified NexServe professional."}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-300">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-ink-400" aria-hidden="true" />
            {formatDuration(service.duration_minutes || 60)}
          </span>
          <span className={cn("inline-flex items-center gap-1.5", instant ? "text-emerald-300" : "text-amber-300")}>
            {instant ? <Zap className="w-3.5 h-3.5" aria-hidden="true" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
            {instant ? "Instant booking" : "Booking on request"}
          </span>
        </div>
      </div>

      <div className="mt-5 mx-5 mb-5 pt-4 border-t border-white/[0.06] flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-ink-400">Starts at</p>
          <p className="text-xl font-semibold text-white tabular tracking-tight font-heading">
            {formatINR(service.price ?? service.base_price)}
          </p>
        </div>
        {onBook && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBook(service);
            }}
            className="relative z-10 inline-flex items-center gap-1.5 h-10 pl-4 pr-3.5 rounded-xl bg-white/[0.06] text-sm font-semibold text-white ring-1 ring-inset ring-white/10 transition-colors duration-200 hover:bg-primary-600 hover:ring-primary-500 group-hover:bg-primary-600 group-hover:ring-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            Book
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </motion.article>
  );
}
