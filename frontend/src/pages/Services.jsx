/**
 * Services.jsx — Categorized Marketplace Discovery Page.
 *
 * Features:
 * - Dynamic category fetching from FastAPI PostgreSQL backend
 * - Services organized into dedicated Category Sections (Home Cleaning, AC Repair, Salon, etc.)
 * - 3–4 popular services per category section with "View All" category links
 * - Category filter pills & real-time search
 * - Service Details Modal with full features, pricing & duration
 * - Direct integration with BookingWizardModal for instant slot booking
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { getCategories, getServices } from "../api/servicesApi";
import BookingWizardModal from "../components/booking/BookingWizardModal";

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const initialSearch = searchParams.get("search") || "";

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [priceFilter, setPriceFilter] = useState("all"); // "all" | "under500" | "500-1000" | "above1000"
  const [ratingFilter, setRatingFilter] = useState(0); // 0 | 4.0 | 4.5
  const [sortBy, setSortBy] = useState("rating"); // "rating" | "price-asc" | "price-desc" | "popularity"

  // Active Modals
  const [bookingService, setBookingService] = useState(null);
  const [detailService, setDetailService] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [catData, servData] = await Promise.all([
          getCategories({ includeServices: true }),
          getServices(),
        ]);
        setCategories(catData || []);
        setServices(servData || []);
      } catch (err) {
        console.warn("Failed to load services data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync state with URL params
  useEffect(() => {
    const q = searchParams.get("search");
    const c = searchParams.get("category");
    if (q !== null) setSearchQuery(q);
    if (c !== null) setSelectedCategory(c);
  }, [searchParams]);

  // Handle Category selection
  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    if (catId === "all") {
      const newParams = {};
      if (searchQuery) newParams.search = searchQuery;
      setSearchParams(newParams);
    } else {
      setSearchParams({ category: String(catId), ...(searchQuery ? { search: searchQuery } : {}) });
    }
  };

  // Group services by category
  const categorizedData = useMemo(() => {
    return categories.map((cat) => {
      // Find all services matching this category
      let catServices = services.filter((s) => s.category_id === cat.id);

      // Apply search filter if present
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        catServices = catServices.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            cat.name.toLowerCase().includes(q)
        );
      }

      // Apply price filter
      if (priceFilter === "under500") {
        catServices = catServices.filter((s) => s.price < 500);
      } else if (priceFilter === "500-1000") {
        catServices = catServices.filter((s) => s.price >= 500 && s.price <= 1000);
      } else if (priceFilter === "above1000") {
        catServices = catServices.filter((s) => s.price > 1000);
      }

      // Apply rating filter
      if (ratingFilter > 0) {
        catServices = catServices.filter((s) => (s.rating || 4.8) >= ratingFilter);
      }

      // Apply sorting
      catServices.sort((a, b) => {
        if (sortBy === "rating") return (b.rating || 4.8) - (a.rating || 4.8);
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "popularity") return (b.review_count || 0) - (a.review_count || 0);
        return 0;
      });

      return {
        ...cat,
        matchingServices: catServices,
        totalServices: services.filter((s) => s.category_id === cat.id).length,
      };
    });
  }, [categories, services, searchQuery, priceFilter, ratingFilter, sortBy]);

  // If a single category is selected, focus on it
  const isSingleCategoryView = selectedCategory !== "all";
  const activeCategoryObj = isSingleCategoryView
    ? categorizedData.find((c) => String(c.id) === String(selectedCategory))
    : null;

  const totalMatchingServices = categorizedData.reduce(
    (acc, cat) => acc + cat.matchingServices.length,
    0
  );

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ═══ HEADER BANNER ═══ */}
      <div className="text-center mb-8 animate-slide-up">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-500/15 text-primary-400 border border-primary-500/25 mb-3">
          ⚡ 100% Background-Verified Experts • Upfront Fixed Pricing
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-3">
          Explore Services by Category
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Select from home cleaning, AC repair, beauty, plumbing, electrical, car services, and more.
          Instant booking with verified professionals.
        </p>
      </div>

      {/* ═══ SEARCH & CATEGORY PILLS BAR ═══ */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-3xl mx-auto">
          <input
            type="text"
            placeholder="Search service e.g. 'Deep Cleaning', 'AC Repair', 'Haircut', 'Sofa'..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchParams({
                search: e.target.value,
                ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
              });
            }}
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-surface-900 border border-white/10 text-sm text-white placeholder-gray-400 outline-none focus:border-primary-500/50 shadow-xl transition-all"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                if (selectedCategory === "all") {
                  setSearchParams({});
                } else {
                  setSearchParams({ category: selectedCategory });
                }
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-700 text-xs text-gray-300 hover:text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => handleCategorySelect("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === "all"
                ? "bg-primary-600 text-white shadow-lg shadow-primary-500/25 ring-1 ring-primary-400"
                : "bg-surface-850 border border-white/10 text-gray-300 hover:text-white hover:bg-surface-800"
            }`}
          >
            <span>🌟</span>
            <span>All Categories</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(String(cat.id))}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                String(selectedCategory) === String(cat.id)
                  ? "bg-primary-600 text-white shadow-lg shadow-primary-500/25 ring-1 ring-primary-400"
                  : "bg-surface-850 border border-white/10 text-gray-300 hover:text-white hover:bg-surface-800"
              }`}
            >
              <span>{cat.icon_url || "✨"}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ FILTER & SORT TOOLBAR ═══ */}
      <div className="p-4 rounded-2xl bg-surface-850/80 border border-white/10 flex flex-wrap items-center justify-between gap-4 mb-8 text-xs backdrop-blur-md shadow-lg">
        <div className="flex flex-wrap items-center gap-4">
          {/* Active View / Breadcrumb Badge */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Viewing:</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-800 text-primary-300 font-bold border border-white/10">
              {isSingleCategoryView
                ? activeCategoryObj?.name || "Selected Category"
                : "All Category Sections"}
            </span>
            {isSingleCategoryView && (
              <button
                onClick={() => handleCategorySelect("all")}
                className="text-primary-400 hover:underline text-[11px]"
              >
                (Show All)
              </button>
            )}
          </div>

          {/* Price Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold">Price:</span>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="bg-surface-800 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="all">All Prices</option>
              <option value="under500">Under ₹500</option>
              <option value="500-1000">₹500 – ₹1000</option>
              <option value="above1000">Above ₹1000</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold">Rating:</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value))}
              className="bg-surface-800 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value={0}>Any Rating</option>
              <option value={4.5}>⭐ 4.5 & Above</option>
              <option value={4.0}>⭐ 4.0 & Above</option>
            </select>
          </div>
        </div>

        {/* Sort Control */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-semibold">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface-800 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer font-medium"
          >
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="popularity">Most Popular</option>
          </select>
        </div>
      </div>

      {/* ═══ CONTENT AREA ═══ */}
      {loading ? (
        <div className="space-y-12">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-8 w-64 skeleton rounded-xl" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-60 skeleton rounded-3xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : totalMatchingServices === 0 ? (
        <div className="py-20 text-center text-gray-400 p-8 rounded-3xl bg-surface-850/50 border border-white/5">
          <span className="text-5xl mb-3 block">🔎</span>
          <h3 className="text-lg font-bold text-white mb-1">No services found matching your criteria</h3>
          <p className="text-xs text-gray-400 mb-4">
            Try adjusting your search terms, category, or price filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setPriceFilter("all");
              setRatingFilter(0);
              setSearchParams({});
            }}
            className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-500 transition-colors shadow-lg"
          >
            Clear All Filters
          </button>
        </div>
      ) : isSingleCategoryView && activeCategoryObj ? (
        /* ═══ SINGLE CATEGORY VIEW ═══ */
        <div className="space-y-8 animate-fade-in">
          {/* Category Banner Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-surface-850 via-surface-800 to-surface-850 border border-primary-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-white/10 flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
                {activeCategoryObj.icon_url || "✨"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-extrabold text-white">{activeCategoryObj.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-500/20 text-primary-300">
                    {activeCategoryObj.matchingServices.length} Services
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-1 max-w-xl">
                  {activeCategoryObj.description ||
                    "Professional doorstep services provided by background-verified experts."}
                </p>
              </div>
            </div>

            <Link
              to={`/services/${activeCategoryObj.id}`}
              className="px-4 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-white font-bold text-xs border border-white/10 flex items-center gap-2 transition-all flex-shrink-0 shadow-md"
            >
              <span>👥</span> View Category Providers →
            </Link>
          </div>

          {/* Grid of All Services in this Category */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeCategoryObj.matchingServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                categoryName={activeCategoryObj.name}
                categoryIcon={activeCategoryObj.icon_url}
                onBook={() => setBookingService(service)}
                onDetails={() => setDetailService(service)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ═══ CATEGORIZED SECTIONS VIEW (ORGANIZED BY CATEGORY) ═══ */
        <div className="space-y-14 animate-fade-in">
          {categorizedData
            .filter((cat) => cat.matchingServices.length > 0)
            .map((cat) => {
              // Display 3-4 popular services in the main dashboard view
              const displayServices = searchQuery
                ? cat.matchingServices
                : cat.matchingServices.slice(0, 4);

              return (
                <section
                  key={cat.id}
                  className="rounded-3xl p-6 sm:p-8 bg-surface-850/40 border border-white/5 hover:border-white/10 transition-all shadow-xl"
                >
                  {/* Category Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-surface-800 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                        {cat.icon_url || "✨"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-white hover:text-primary-300 transition-colors">
                            {cat.name}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-700 text-gray-300 border border-white/5">
                            {cat.matchingServices.length} {cat.matchingServices.length === 1 ? "service" : "services"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {cat.description || "Doorstep service by verified professionals"}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons: View All in Category & Category Providers */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Link
                        to={`/services/${cat.id}`}
                        className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
                        title="View approved technicians in this category"
                      >
                        Providers
                      </Link>
                      <button
                        onClick={() => handleCategorySelect(String(cat.id))}
                        className="px-4 py-1.5 rounded-xl bg-primary-600/20 hover:bg-primary-600 text-primary-300 hover:text-white font-bold text-xs border border-primary-500/30 transition-all flex items-center gap-1 shadow-sm"
                      >
                        <span>View All ({cat.matchingServices.length})</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>

                  {/* 3–4 Popular Service Cards */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {displayServices.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        categoryName={cat.name}
                        categoryIcon={cat.icon_url}
                        onBook={() => setBookingService(service)}
                        onDetails={() => setDetailService(service)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
        </div>
      )}

      {/* ═══ SERVICE DETAILS MODAL ═══ */}
      {detailService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl rounded-3xl bg-surface-850 border border-white/15 p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setDetailService(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-700 text-gray-300 hover:text-white flex items-center justify-center text-sm transition-colors"
            >
              ✕
            </button>

            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30 flex items-center gap-1">
                  <span>{detailService.category?.icon_url || "✨"}</span>
                  <span>{detailService.category?.name || "Service"}</span>
                </span>
                <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-surface-800 px-2 py-0.5 rounded-full">
                  <span>⭐</span>
                  <span>{detailService.rating || 4.9}</span>
                  <span className="text-gray-400 font-normal">({detailService.review_count || 12} reviews)</span>
                </div>
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-2">{detailService.title}</h2>
              <p className="text-xs text-gray-300 leading-relaxed">{detailService.description}</p>
            </div>

            {/* Features & Specs */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-800/80 border border-white/5 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Estimated Duration</span>
                <span className="font-bold text-white">{detailService.duration_minutes} Minutes</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Warranty / Coverage</span>
                <span className="font-bold text-emerald-400">30-Day NexServe Protection</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Assigned Provider</span>
                <span className="font-bold text-white truncate block">
                  {detailService.provider?.full_name || "Verified NexServe Pro"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Payment Method</span>
                <span className="font-bold text-white">Online (Razorpay Escrow)</span>
              </div>
            </div>

            {/* Price & Action */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Standard Fixed Price</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-white">₹{detailService.price}</span>
                  <span className="text-xs text-gray-400">all inclusive</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {detailService.provider_id && (
                  <Link
                    to={`/providers/${detailService.provider_id}`}
                    className="px-4 py-2.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-white text-xs font-semibold border border-white/10 transition-colors"
                  >
                    View Provider Profile
                  </Link>
                )}
                <button
                  onClick={() => {
                    const target = detailService;
                    setDetailService(null);
                    setBookingService(target);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-xs shadow-lg shadow-primary-500/25 transition-all"
                >
                  Book This Service →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BOOKING WIZARD MODAL ═══ */}
      {bookingService && (
        <BookingWizardModal
          service={bookingService}
          onClose={() => setBookingService(null)}
          onSuccess={() => {
            setBookingService(null);
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
}

/**
 * Reusable Service Card Component for Category Sections.
 */
function ServiceCard({ service, categoryName, categoryIcon, onBook, onDetails }) {
  return (
    <div
      onClick={onDetails}
      className="p-5 rounded-3xl glass-card flex flex-col justify-between group hover:border-primary-500/40 transition-all cursor-pointer shadow-lg hover:shadow-primary-500/10"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/15 text-primary-300 border border-primary-500/25 flex items-center gap-1">
            <span>{categoryIcon || "✨"}</span>
            <span>{categoryName || "Service"}</span>
          </span>

          <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-surface-800 px-2 py-0.5 rounded-full border border-white/5">
            <span>⭐</span>
            <span>{service.rating || "4.8"}</span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-primary-300 transition-colors">
          {service.title}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed">
          {service.description}
        </p>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-bold block">Starting At</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-white">₹{service.price}</span>
            <span className="text-[11px] text-gray-400">/ {service.duration_minutes}m</span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onBook();
          }}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-xs shadow-md shadow-primary-500/20 transition-all flex items-center gap-1"
        >
          <span>Book</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
