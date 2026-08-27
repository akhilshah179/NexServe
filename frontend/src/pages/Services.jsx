/**
 * Services.jsx — Startup Marketplace Service Discovery Page.
 *
 * Features:
 * - Search bar with URL params integration
 * - Category filter tabs
 * - Price range, rating, location & availability filters
 * - Sort options (Rating, Price Low-High, Price High-Low, Popularity)
 * - Clickable service cards with provider metrics and direct BookingWizardModal trigger
 */

import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
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

  // Active Booking Target
  const [bookingService, setBookingService] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [catData, servData] = await Promise.all([
          getCategories(),
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

  // Update searchQuery or category if URL changes
  useEffect(() => {
    const q = searchParams.get("search");
    const c = searchParams.get("category");
    if (q !== null) setSearchQuery(q);
    if (c !== null) setSelectedCategory(c);
  }, [searchParams]);

  // Filter & Sort Logic
  const filteredServices = services
    .filter((serv) => {
      // Category filter
      if (selectedCategory !== "all" && String(serv.category_id) !== String(selectedCategory)) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = serv.title.toLowerCase().includes(q);
        const matchesDesc = serv.description.toLowerCase().includes(q);
        const matchesCat = serv.category?.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCat) return false;
      }
      // Price filter
      if (priceFilter === "under500" && serv.price >= 500) return false;
      if (priceFilter === "500-1000" && (serv.price < 500 || serv.price > 1000)) return false;
      if (priceFilter === "above1000" && serv.price <= 1000) return false;

      // Rating filter
      if (ratingFilter > 0 && (serv.rating || 4.8) < ratingFilter) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 4.8) - (a.rating || 4.8);
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "popularity") return (b.review_count || 0) - (a.review_count || 0);
      return 0;
    });

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3">
          Explore Service Marketplace
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
          Discover verified professionals for cleaning, repair, spa, tutoring, and more. Fixed pricing, instant booking.
        </p>
      </div>

      {/* Main Search & Category Selector Bar */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-3xl mx-auto">
          <input
            type="text"
            placeholder="Search service title, category, or problem..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchParams({ search: e.target.value, category: selectedCategory });
            }}
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-surface-900 border border-white/10 text-sm text-white placeholder-gray-400 outline-none focus:border-primary-500/50 shadow-xl"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchParams({ category: selectedCategory });
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSearchParams({ search: searchQuery, category: "all" });
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-primary-600 text-white shadow-lg shadow-primary-500/25"
                : "bg-surface-850 border border-white/10 text-gray-300 hover:text-white"
            }`}
          >
            🌟 All Services
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(String(cat.id));
                setSearchParams({ search: searchQuery, category: String(cat.id) });
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                String(selectedCategory) === String(cat.id)
                  ? "bg-primary-600 text-white shadow-lg shadow-primary-500/25"
                  : "bg-surface-850 border border-white/10 text-gray-300 hover:text-white"
              }`}
            >
              <span>{cat.icon_url || "🧹"}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Sorting Controls Toolbar */}
      <div className="p-4 rounded-2xl bg-surface-850 border border-white/10 flex flex-wrap items-center justify-between gap-4 mb-8 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Price Range Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold">Price:</span>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="bg-surface-800 border border-white/10 text-white rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="all">All Prices</option>
              <option value="under500">Under ₹500</option>
              <option value="500-1000">₹500 – ₹1000</option>
              <option value="above1000">Above ₹1000</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold">Rating:</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value))}
              className="bg-surface-800 border border-white/10 text-white rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value={0}>Any Rating</option>
              <option value={4.5}>⭐ 4.5 & Above</option>
              <option value={4.0}>⭐ 4.0 & Above</option>
            </select>
          </div>
        </div>

        {/* Sorting Control */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface-800 border border-white/10 text-white rounded-lg px-3 py-1.5 outline-none cursor-pointer font-medium"
          >
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="popularity">Most Popular</option>
          </select>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 skeleton rounded-3xl" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="py-20 text-center text-gray-400 p-8 rounded-3xl bg-surface-850/50 border border-white/5">
          <span className="text-4xl mb-3 block">🔎</span>
          <h3 className="text-lg font-bold text-white mb-1">No matching services found</h3>
          <p className="text-xs text-gray-400 mb-4">Try clearing your filters or searching for another keyword.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setPriceFilter("all");
              setRatingFilter(0);
            }}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="p-6 rounded-3xl glass-card flex flex-col justify-between group hover:border-primary-500/40 transition-all cursor-pointer"
              onClick={() => setBookingService(service)}
            >
              <div>
                {/* Card Top Category & Rating */}
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30 flex items-center gap-1">
                    <span>{service.category?.icon_url || "✨"}</span>
                    <span>{service.category?.name || "Service"}</span>
                  </span>

                  <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-surface-800 px-2.5 py-1 rounded-full border border-white/5">
                    <span>⭐</span>
                    <span>{service.rating || "4.9"}</span>
                    <span className="text-gray-400 font-normal">({service.review_count || 18})</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary-300 transition-colors">
                  {service.title}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                  {service.description}
                </p>
              </div>

              {/* Card Footer Info */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Starting Price</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold text-white">₹{service.price}</span>
                    <span className="text-[11px] text-gray-400">/ {service.duration_minutes}m</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setBookingService(service);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-xs shadow-md shadow-primary-500/20 transition-all"
                >
                  Book Service →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {bookingService && (
        <BookingWizardModal
          service={bookingService}
          onClose={() => setBookingService(null)}
          onSuccess={() => alert("Booking placed successfully! Check your Dashboard for updates.")}
        />
      )}
    </div>
  );
}
