/**
 * Rentals.jsx — Physical Item Rental Discovery & Marketplace Page.
 *
 * Features:
 * - 10 Standardized Rental Categories (Vehicles, Cameras, Electronics, Camping, etc.)
 * - Real-time date availability filtering (backend conflict overlap prevention)
 * - Price & fulfillment type filters (Self Pickup / Doorstep Delivery)
 * - Clear display of daily rates and separate refundable security deposits
 * - Responsive glassmorphic item cards with high-res galleries
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { getRentalCategories, getRentalItems } from "../api/rentalsApi";

export default function Rentals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const initialSearch = searchParams.get("search") || "";
  const initialStartDate = searchParams.get("start_date") || "";
  const initialEndDate = searchParams.get("end_date") || "";

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all"); // "all" | "pickup" | "delivery"
  const [priceFilter, setPriceFilter] = useState("all"); // "all" | "under500" | "500-2000" | "above2000"
  const [sortBy, setSortBy] = useState("popularity"); // "popularity" | "price-asc" | "price-desc" | "rating"

  const navigate = useNavigate();

  // Load Categories and Items from API
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [catData, itemData] = await Promise.all([
          getRentalCategories(),
          getRentalItems({
            category_slug: selectedCategory !== "all" ? selectedCategory : undefined,
            search: searchQuery || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          }),
        ]);
        setCategories(catData || []);
        setItems(itemData || []);
      } catch (err) {
        console.error("Failed to load rental marketplace data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCategory, startDate, endDate]);

  // Sync state with URL params
  useEffect(() => {
    const q = searchParams.get("search");
    const c = searchParams.get("category");
    const sd = searchParams.get("start_date");
    const ed = searchParams.get("end_date");
    if (q !== null) setSearchQuery(q);
    if (c !== null) setSelectedCategory(c);
    if (sd !== null) setStartDate(sd);
    if (ed !== null) setEndDate(ed);
  }, [searchParams]);

  // Handle Category selection
  const handleCategorySelect = (catSlug) => {
    setSelectedCategory(catSlug);
    const newParams = {};
    if (catSlug !== "all") newParams.category = catSlug;
    if (searchQuery) newParams.search = searchQuery;
    if (startDate) newParams.start_date = startDate;
    if (endDate) newParams.end_date = endDate;
    setSearchParams(newParams);
  };

  // Filter and sort items in frontend for immediate responsiveness
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((it) => {
        const title = (it.title || it.name || "").toLowerCase();
        const desc = (it.description || "").toLowerCase();
        const brand = (it.brand || "").toLowerCase();
        const city = (it.city || it.location || "").toLowerCase();
        return title.includes(q) || desc.includes(q) || brand.includes(q) || city.includes(q);
      });
    }

    if (fulfillmentFilter === "delivery") {
      result = result.filter((it) => it.delivery_available ?? it.is_delivery_available);
    } else if (fulfillmentFilter === "pickup") {
      result = result.filter((it) => it.pickup_available ?? it.is_pickup_available);
    }

    if (priceFilter === "under500") {
      result = result.filter((it) => (it.daily_rate ?? it.price_per_day ?? 0) < 500);
    } else if (priceFilter === "500-2000") {
      result = result.filter((it) => {
        const rate = it.daily_rate ?? it.price_per_day ?? 0;
        return rate >= 500 && rate <= 2000;
      });
    } else if (priceFilter === "above2000") {
      result = result.filter((it) => (it.daily_rate ?? it.price_per_day ?? 0) > 2000);
    }

    result.sort((a, b) => {
      const rateA = a.daily_rate ?? a.price_per_day ?? 0;
      const rateB = b.daily_rate ?? b.price_per_day ?? 0;
      if (sortBy === "rating") return (b.rating || 4.8) - (a.rating || 4.8);
      if (sortBy === "price-asc") return rateA - rateB;
      if (sortBy === "price-desc") return rateB - rateA;
      if (sortBy === "popularity") return (b.total_rentals || b.review_count || 0) - (a.total_rentals || a.review_count || 0);
      return 0;
    });

    return result;
  }, [items, searchQuery, fulfillmentFilter, priceFilter, sortBy]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ═══ HEADER BANNER ═══ */}
      <div className="text-center mb-8 animate-slide-up">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 mb-3 shadow-lg shadow-emerald-500/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          📦 NexServe Rental Marketplace • Escrow Protected Deposits
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-3">
          Rent Top Equipment, Gear & Vehicles
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
          From Sony FX3 cinema cameras to royal Enfield bikes, DJ consoles, camping tents, and gaming rigs.
          Book verified gear with doorstep delivery or express self-pickup.
        </p>
      </div>

      {/* ═══ DATE RANGE & SEARCH FILTER BAR ═══ */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-surface-900/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Query */}
          <div className="md:col-span-5 relative">
            <input
              type="text"
              placeholder="Search cameras, tents, gaming consoles, bikes, laptops..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchParams({
                  search: e.target.value,
                  ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
                  ...(startDate ? { start_date: startDate } : {}),
                  ...(endDate ? { end_date: endDate } : {}),
                });
              }}
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-surface-800 border border-white/10 text-xs sm:text-sm text-white placeholder-gray-400 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔍</span>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  const p = {};
                  if (selectedCategory !== "all") p.category = selectedCategory;
                  if (startDate) p.start_date = startDate;
                  if (endDate) p.end_date = endDate;
                  setSearchParams(p);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-700 text-xs text-gray-300 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Range: Start Date */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-2 bg-surface-800 border border-white/10 rounded-2xl px-3 py-2 text-xs">
              <span className="text-gray-400 font-medium whitespace-nowrap">From:</span>
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSearchParams({
                    ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
                    ...(searchQuery ? { search: searchQuery } : {}),
                    start_date: e.target.value,
                    ...(endDate ? { end_date: endDate } : {}),
                  });
                }}
                className="bg-transparent text-white text-xs outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Date Range: End Date */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-2 bg-surface-800 border border-white/10 rounded-2xl px-3 py-2 text-xs">
              <span className="text-gray-400 font-medium whitespace-nowrap">Until:</span>
              <input
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSearchParams({
                    ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
                    ...(searchQuery ? { search: searchQuery } : {}),
                    ...(startDate ? { start_date: startDate } : {}),
                    end_date: e.target.value,
                  });
                }}
                className="bg-transparent text-white text-xs outline-none w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Reset button */}
          <div className="md:col-span-1 flex justify-end">
            {(startDate || endDate || searchQuery || selectedCategory !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setStartDate("");
                  setEndDate("");
                  setFulfillmentFilter("all");
                  setPriceFilter("all");
                  setSearchParams({});
                }}
                className="w-full py-2.5 px-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors text-center"
                title="Reset Filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 scrollbar-none border-t border-white/5">
          <button
            onClick={() => handleCategorySelect("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === "all"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400"
                : "bg-surface-850 border border-white/10 text-gray-300 hover:text-white hover:bg-surface-800"
            }`}
          >
            <span>🌟</span>
            <span>All Rentals ({items.length})</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedCategory === cat.slug
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400"
                  : "bg-surface-850 border border-white/10 text-gray-300 hover:text-white hover:bg-surface-800"
              }`}
            >
              <span>{cat.icon_url || "📦"}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ FILTER & SORT TOOLBAR ═══ */}
      <div className="p-4 rounded-2xl bg-surface-850/80 border border-white/10 flex flex-wrap items-center justify-between gap-4 mb-8 text-xs backdrop-blur-md shadow-lg">
        <div className="flex flex-wrap items-center gap-4">
          {/* Active Category Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Viewing:</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-800 text-emerald-300 font-bold border border-white/10">
              {activeCategoryObj ? activeCategoryObj.name : "All Available Items"}
            </span>
            <span className="text-gray-400">({filteredItems.length} items found)</span>
          </div>

          {/* Fulfillment Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold">Fulfillment:</span>
            <select
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value)}
              className="bg-surface-800 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="all">All Options</option>
              <option value="delivery">🚚 Doorstep Delivery</option>
              <option value="pickup">📍 Self Pickup</option>
            </select>
          </div>

          {/* Price Range Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-semibold">Daily Rate:</span>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="bg-surface-800 border border-white/10 text-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="all">Any Price</option>
              <option value="under500">Under ₹500/day</option>
              <option value="500-2000">₹500 – ₹2,000/day</option>
              <option value="above2000">Above ₹2,000/day</option>
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
            <option value="popularity">Most Rented</option>
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* ═══ RENTAL ITEMS GRID ═══ */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-96 skeleton rounded-3xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center text-gray-400 p-8 rounded-3xl bg-surface-850/50 border border-white/5 space-y-4">
          <span className="text-6xl block">📦</span>
          <h3 className="text-lg font-bold text-white">No rental items found</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {startDate && endDate
              ? "All items in this category might be currently booked for the selected dates. Try different dates or categories."
              : "Try adjusting your search keywords, price, or category filters."}
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setStartDate("");
              setEndDate("");
              setFulfillmentFilter("all");
              setPriceFilter("all");
              setSearchParams({});
            }}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
          {filteredItems.map((item) => (
            <RentalCard
              key={item.id}
              item={item}
              startDate={startDate}
              endDate={endDate}
              onSelect={() => navigate(`/rentals/${item.id}${startDate && endDate ? `?start_date=${startDate}&end_date=${endDate}` : ""}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * High-aesthetic Rental Item Card with cover photo, badges, daily rate, and security deposit.
 */
function RentalCard({ item, startDate, endDate, onSelect }) {
  const primaryImage =
    item.images?.find((img) => img.is_primary)?.image_url ||
    item.images?.[0]?.image_url ||
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80";

  const title = item.title || item.name || "Rental Item";
  const dailyRate = item.daily_rate ?? item.price_per_day ?? 0;
  const securityDeposit = item.security_deposit ?? 0;
  const isDelivery = item.delivery_available ?? item.is_delivery_available;
  const isPickup = item.pickup_available ?? item.is_pickup_available;
  const city = item.city || item.location || "Available in Mumbai";
  const deliveryFee = item.delivery_fee ?? 0;

  return (
    <div
      onClick={onSelect}
      className="rounded-3xl glass-card overflow-hidden flex flex-col justify-between group hover:border-emerald-500/40 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1"
    >
      <div>
        {/* Cover Image & Overlays */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-surface-900">
          <img
            src={primaryImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-950/80 via-transparent to-black/30" />

          {/* Category Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/30 shadow">
            <span>{item.category?.icon_url || "📦"}</span>
            <span>{item.category?.name || "Rental"}</span>
          </div>

          {/* Rating Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-surface-950/80 backdrop-blur-md text-yellow-400 border border-white/10 shadow">
            <span>⭐</span>
            <span>{item.rating || "4.9"}</span>
            <span className="text-gray-400 text-[9px]">({item.review_count || 12})</span>
          </div>

          {/* Fulfillment Capabilities at bottom of image */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 flex-wrap">
            {isDelivery && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                🚚 Delivery ₹{deliveryFee}
              </span>
            )}
            {isPickup && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-900/90 text-gray-200 border border-white/10">
                📍 Express Pickup
              </span>
            )}
          </div>
        </div>

        {/* Item Info Body */}
        <div className="p-4 sm:p-5 space-y-2">
          {item.brand && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
              {item.brand} {item.model ? `• ${item.model}` : ""}
            </span>
          )}

          <h3 className="text-base font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
            {title}
          </h3>

          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-400">
            <span>📍 {city}</span>
            <span>•</span>
            <span className="text-gray-400">Min {item.min_rental_days || 1} day(s)</span>
          </div>
        </div>
      </div>

      {/* Pricing & CTA Footer */}
      <div className="p-4 sm:p-5 pt-3 border-t border-white/5 bg-surface-900/40 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-white">₹{dailyRate}</span>
            <span className="text-[11px] text-gray-400">/ day</span>
          </div>
          <div className="text-[10px] text-emerald-400/90 font-medium">
            + ₹{securityDeposit} refundable deposit
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 flex-shrink-0"
        >
          <span>Rent Now</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
