import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../ui";
import { serviceVisual } from "../../lib/visuals";
import { ease } from "../../lib/motion";

/**
 * CategoryCard
 * - `variant="image"`: photographic tile for the homepage.
 * - `variant="tile"` (default): compact icon tile for dense grids.
 */
export default function CategoryCard({ category, count, to, variant = "tile", className }) {
  const visual = serviceVisual(category);
  const Icon = visual.icon;
  const href = to || `/services?category=${category.id}`;

  if (variant === "image") {
    return (
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.28, ease: ease.out }} className={cn("h-full", className)}>
        <Link
          to={href}
          className="group relative block h-full min-h-[220px] overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-900 shadow-[var(--shadow-card)] card-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70"
        >
          <img
            src={visual.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-700 ease-out group-hover:scale-[1.07]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/60 to-surface-950/10" />
          <div className="relative h-full flex flex-col justify-between p-5">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-surface-950/60 backdrop-blur-md ring-1 ring-inset ring-white/10 flex items-center justify-center">
                <Icon className={cn("w-5 h-5", visual.toneClasses.icon)} aria-hidden="true" />
              </span>
              <span className="w-8 h-8 rounded-full bg-white/0 group-hover:bg-white text-white group-hover:text-surface-950 ring-1 ring-inset ring-white/20 flex items-center justify-center transition-colors duration-300">
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{category.name}</h3>
              {category.description && (
                <p className="mt-1 text-[13px] text-ink-300 leading-relaxed line-clamp-2">{category.description}</p>
              )}
              {count !== undefined && (
                <p className="mt-2.5 text-xs font-medium text-ink-400">
                  {count} {count === 1 ? "service" : "services"}
                </p>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25, ease: ease.out }} className={cn("h-full", className)}>
      <Link
        to={href}
        className="group flex items-center gap-3.5 h-full p-4 rounded-2xl bg-surface-900 border border-white/[0.06] card-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70"
      >
        <span
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105",
            visual.toneClasses.bg
          )}
        >
          <Icon className={cn("w-5 h-5", visual.toneClasses.icon)} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white truncate">{category.name}</span>
          <span className="block text-xs text-ink-400 mt-0.5">
            {count !== undefined ? `${count} ${count === 1 ? "service" : "services"}` : "Verified pros"}
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
