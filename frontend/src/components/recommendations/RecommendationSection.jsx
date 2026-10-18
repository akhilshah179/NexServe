import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, TrendingUp, History, RotateCcw } from "lucide-react";
import { fetchRecommendationsApi, trackInteractionApi } from "../../api/recommendationsApi";
import ServiceCard from "../cards/ServiceCard";
import { Tabs, Reveal } from "../ui";
import { ease } from "../../lib/motion";

const ICONS = {
  personalized: Sparkles,
  popular: TrendingUp,
  popular_near_you: TrendingUp,
  history: History,
  reorder: RotateCcw,
  book_again: RotateCcw,
};

/**
 * Personalised recommendations. Renders nothing until there is something
 * useful to show, so it can be dropped into any page safely.
 */
export default function RecommendationSection({ onSelectService, currentCategoryId = null, title = "Picked for you" }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchRecommendationsApi({ category_id: currentCategoryId })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.sections && Array.isArray(res.sections)) {
          setSections(res.sections.filter((s) => s.services && s.services.length > 0));
        } else if (res && typeof res === "object") {
          const mapped = [];
          if (res.recommended_for_you?.length) mapped.push({ title: "Recommended for you", type: "personalized", services: res.recommended_for_you });
          if (res.popular_near_you?.length) mapped.push({ title: "Popular near you", type: "popular", services: res.popular_near_you });
          if (res.history_based?.length) mapped.push({ title: "Based on your bookings", type: "history", services: res.history_based });
          if (res.book_again?.length) mapped.push({ title: "Book again", type: "reorder", services: res.book_again });
          setSections(mapped);
        }
      })
      .catch((err) => console.debug("Failed to fetch recommendations:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentCategoryId]);

  if (loading || sections.length === 0) return null;

  const idx = Math.min(activeTabIdx, sections.length - 1);
  const current = sections[idx];

  const handleSelect = (service) => {
    trackInteractionApi({ service_id: service.id, interaction_type: "click" });
    onSelectService?.(service);
  };

  return (
    <div className="mt-16 sm:mt-20">
      <Reveal className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
        <div>
          <p className="eyebrow mb-3">For you</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-[15px] text-ink-400">Suggestions based on what's popular nearby and what you've booked before.</p>
        </div>
        {sections.length > 1 && (
          <Tabs
            ariaLabel="Recommendation type"
            value={String(idx)}
            onChange={(id) => setActiveTabIdx(Number(id))}
            items={sections.map((s, i) => ({
              id: String(i),
              label: s.title,
              icon: ICONS[s.type] || Sparkles,
              count: s.services.length,
            }))}
          />
        )}
      </Reveal>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: ease.out }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {current.services.slice(0, current.services.length >= 8 ? 8 : 4).map((service) => (
            <ServiceCard key={service.id} service={service} onBook={handleSelect} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
