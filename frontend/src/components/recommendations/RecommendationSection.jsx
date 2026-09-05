import React, { useEffect, useState } from "react";
import { FiZap, FiTrendingUp, FiRepeat, FiAward, FiStar, FiArrowRight } from "react-icons/fi";
import { fetchRecommendationsApi, trackInteractionApi } from "../../api/recommendationsApi";

export default function RecommendationSection({ onSelectService, currentCategoryId = null }) {
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
          const nonEmpty = res.sections.filter((s) => s.services && s.services.length > 0);
          setSections(nonEmpty);
        } else if (res && typeof res === "object") {
          // Fallback if dictionary format
          const mapped = [];
          if (res.recommended_for_you?.length) {
            mapped.push({ title: "Recommended For You", type: "personalized", services: res.recommended_for_you });
          }
          if (res.popular_near_you?.length) {
            mapped.push({ title: "Popular Near You", type: "popular", services: res.popular_near_you });
          }
          if (res.history_based?.length) {
            mapped.push({ title: "Based On Your Bookings", type: "history", services: res.history_based });
          }
          if (res.book_again?.length) {
            mapped.push({ title: "Book Again", type: "reorder", services: res.book_again });
          }
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

  if (loading || sections.length === 0) {
    return null;
  }

  const currentSection = sections[activeTabIdx] || sections[0];

  const getSectionIcon = (type) => {
    switch (type) {
      case "personalized":
        return FiZap;
      case "popular":
        return FiTrendingUp;
      case "history":
        return FiAward;
      case "reorder":
        return FiRepeat;
      default:
        return FiZap;
    }
  };

  const handleCardClick = (service) => {
    trackInteractionApi({
      service_id: service.id,
      interaction_type: "click",
    });
    if (onSelectService) {
      onSelectService(service);
    }
  };

  return (
    <section className="py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs tracking-wider uppercase">
            <FiZap />
            <span>AI Powered Suggestions</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Smart Recommendations</h2>
        </div>

        {/* Tab pills */}
        <div className="flex flex-wrap gap-2">
          {sections.map((sec, idx) => {
            const Icon = getSectionIcon(sec.type);
            const isActive = idx === activeTabIdx;
            return (
              <button
                key={idx}
                onClick={() => setActiveTabIdx(idx)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-blue-700 text-blue-100" : "bg-slate-900 text-slate-400"
                  }`}
                >
                  {sec.services.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of recommended services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {currentSection.services.map((service) => (
          <div
            key={service.id}
            onClick={() => handleCardClick(service)}
            className="group relative bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-blue-600/10 transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1"
          >
            {/* Image / Banner */}
            <div className="relative h-36 bg-slate-800 overflow-hidden">
              {service.image_url ? (
                <img
                  src={service.image_url}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/40 to-slate-900 text-slate-600">
                  <FiZap className="w-10 h-10 text-blue-500/40" />
                </div>
              )}
              {service.category && (
                <span className="absolute top-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md text-[10px] font-semibold text-blue-400 px-2.5 py-1 rounded-full border border-slate-700/50">
                  {service.category.name}
                </span>
              )}
              {service.rating && (
                <span className="absolute top-2.5 right-2.5 bg-amber-500/90 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                  <FiStar className="w-3 h-3 fill-slate-950" />
                  {service.rating.toFixed(1)}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition line-clamp-1">
                  {service.name || service.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {service.description || "Expert service verified by NexServe professionals."}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">Starting from</span>
                  <span className="text-base font-black text-emerald-400">
                    ₹{service.base_price || service.price}
                  </span>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/20 group-hover:gap-2 transition-all"
                >
                  <span>Book</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
