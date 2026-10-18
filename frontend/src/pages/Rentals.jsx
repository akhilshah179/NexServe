/**
 * Rentals.jsx — Physical Item Rental Discovery & Marketplace Page.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getRentalCategories, getRentalItems } from "../api/rentalsApi";
import RentalCard from "../components/cards/RentalCard";
import {
  SearchBar,
  FilterChips,
  Select,
  Button,
  Drawer,
  Field,
  Calendar,
  EmptyState,
  ErrorState,
  SkeletonGrid,
  Stagger,
  StaggerItem,
  Reveal,
  Breadcrumbs,
  cn,
} from "../components/ui";
import { rentalVisual } from "../lib/visuals";
import { formatDateShort, toISODate, daysBetween } from "../lib/format";
import {
  CalendarRange,

  ShieldCheck,
  Truck,
  SlidersHorizontal,
  X,
  LayoutGrid,
  BadgeCheck,
  PackageSearch,
} from "lucide-react";

export default function Rentals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const initialSearch = searchParams.get("search") || "";
  const initialStartDate = searchParams.get("start_date") || "";
  const initialEndDate = searchParams.get("end_date") || "";

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("popularity");


  // Load Categories and Items from API
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setLoadError(false);
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
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCategory, startDate, endDate, reloadKey]);

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

  const handleCategorySelect = (catSlug) => {
    setSelectedCategory(catSlug);
    const newParams = {};
    if (catSlug !== "all") newParams.category = catSlug;
    if (searchQuery) newParams.search = searchQuery;
    if (startDate) newParams.start_date = startDate;
    if (endDate) newParams.end_date = endDate;
    setSearchParams(newParams);
  };

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
      if (sortBy === "popularity")
        return (b.total_rentals || b.review_count || 0) - (a.total_rentals || a.review_count || 0);
      return 0;
    });

    return result;
  }, [items, searchQuery, fulfillmentFilter, priceFilter, sortBy]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const datesSelected = Boolean(startDate && endDate);
  const nights = datesSelected ? daysBetween(startDate, endDate) : 0;

  const writeParams = (overrides) => {
    const next = {
      category: selectedCategory !== "all" ? selectedCategory : "",
      search: searchQuery,
      start_date: startDate,
      end_date: endDate,
      ...overrides,
    };
    const params = {};
    Object.entries(next).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
    setSearchParams(params, { replace: true });
  };

  const updateSearch = (value) => {
    setSearchQuery(value);
    writeParams({ search: value });
  };

  const applyDates = ({ start, end }) => {
    setStartDate(start);
    setEndDate(end);
    if (start && end) {
      writeParams({ start_date: start, end_date: end });
      setDatesOpen(false);
    }
  };

  const clearDates = () => {
    setStartDate("");
    setEndDate("");
    writeParams({ start_date: "", end_date: "" });
  };

  const resetAll = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setStartDate("");
    setEndDate("");
    setFulfillmentFilter("all");
    setPriceFilter("all");
    setSearchParams({});
  };

  const activeFilterCount = (fulfillmentFilter !== "all" ? 1 : 0) + (priceFilter !== "all" ? 1 : 0);
  const hasAnyFilter = searchQuery || selectedCategory !== "all" || datesSelected || activeFilterCount > 0;

  const filterFields = (
    <>
      <Field label="Fulfilment">
        <Select rental value={fulfillmentFilter} onChange={(e) => setFulfillmentFilter(e.target.value)}>
          <option value="all">Delivery or pickup</option>
          <option value="delivery">Doorstep delivery</option>
          <option value="pickup">Self pickup</option>
        </Select>
      </Field>
      <Field label="Daily rate">
        <Select rental value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)}>
          <option value="all">Any price</option>
          <option value="under500">Under ₹500/day</option>
          <option value="500-2000">₹500 – ₹2,000/day</option>
          <option value="above2000">Above ₹2,000/day</option>
        </Select>
      </Field>
      <Field label="Sort by">
        <Select rental value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="popularity">Most rented</option>
          <option value="rating">Top rated</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </Select>
      </Field>
    </>
  );

  return (
    <div className="pb-24">
      {/* Rentals hero — emerald identity */}
      <header className="relative pt-28 sm:pt-32 pb-10 overflow-hidden">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_70%_0%,rgb(20_184_143/0.14),transparent)]" />
          <div className="absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_60%_70%_at_60%_0%,black,transparent)]" />
        </div>
        <div className="container-page">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Rentals" }]} className="mb-5" />
          <Reveal y={12} className="max-w-3xl">
            <p className="eyebrow eyebrow-rental mb-3">NexServe Rentals</p>
            <h1 className="text-[34px] sm:text-5xl font-semibold text-white leading-[1.08]">
              Rent verified gear for a day, a week, or a trip.
            </h1>
            <p className="mt-4 text-[15px] sm:text-lg text-ink-400 leading-relaxed max-w-2xl">
              Cameras, camping kits, sound systems, consoles and more from verified local hosts. Every order includes a refundable deposit.
            </p>
          </Reveal>

          {/* Search + dates */}
          <Reveal delay={0.1} className="mt-8">
            <div className="p-2 rounded-[20px] bg-surface-900/90 border border-white/[0.08] shadow-[0_24px_60px_-24px_rgb(0_0_0/0.8)] flex flex-col md:flex-row gap-2">
              <SearchBar
                className="flex-1"
                value={searchQuery}
                onChange={updateSearch}
                accent="rental"
                placeholder="Search cameras, tents, speakers, consoles…"
                ariaLabel="Search rentals"
              />
              <DatePickerButton
                open={datesOpen}
                setOpen={setDatesOpen}
                start={startDate}
                end={endDate}
                nights={nights}
                onChange={applyDates}
                onClear={clearDates}
              />
            </div>
          </Reveal>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-400">
            <li className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-teal-300" aria-hidden="true" />Refundable deposits</li>
            <li className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-emerald-300" aria-hidden="true" />Delivery or self-pickup</li>
            <li className="flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-emerald-300" aria-hidden="true" />Verified hosts</li>
          </ul>
        </div>
      </header>

      {/* Sticky category + filter bar */}
      <div className="sticky top-16 z-30 bg-surface-950/85 backdrop-blur-xl border-y border-white/[0.06]">
        <div className="container-page py-3 flex items-center gap-3">
          <FilterChips
            ariaLabel="Rental category"
            accent="rental"
            className="flex-1 min-w-0"
            value={selectedCategory}
            onChange={(slug) => handleCategorySelect(slug)}
            items={[
              { id: "all", label: "All gear", icon: LayoutGrid },
              ...categories.map((c) => ({ id: c.slug, label: c.name, icon: rentalVisual(c).icon, count: c.item_count })),
            ]}
          />
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Select rental className="!h-9 !min-h-9 !py-0 !text-[13px] w-[164px]" value={fulfillmentFilter} onChange={(e) => setFulfillmentFilter(e.target.value)} aria-label="Fulfilment">
              <option value="all">Delivery or pickup</option>
              <option value="delivery">Delivery</option>
              <option value="pickup">Self pickup</option>
            </Select>
            <Select rental className="!h-9 !min-h-9 !py-0 !text-[13px] w-[140px]" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} aria-label="Daily rate">
              <option value="all">Any price</option>
              <option value="under500">Under ₹500</option>
              <option value="500-2000">₹500 – ₹2,000</option>
              <option value="above2000">Above ₹2,000</option>
            </Select>
            <Select rental className="!h-9 !min-h-9 !py-0 !text-[13px] w-[160px]" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort rentals">
              <option value="popularity">Sort: Most rented</option>
              <option value="rating">Sort: Top rated</option>
              <option value="price-asc">Sort: Price low–high</option>
              <option value="price-desc">Sort: Price high–low</option>
            </Select>
          </div>
          <Button variant="secondary" size="sm" icon={SlidersHorizontal} className="lg:hidden shrink-0" onClick={() => setFiltersOpen(true)} aria-label="Open filters">
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-400 text-surface-950 text-[11px] flex items-center justify-center">{activeFilterCount}</span>
            )}
          </Button>
        </div>
      </div>

      <div className="container-page pt-8">
        {!loading && !loadError && (
          <div className="flex flex-wrap items-center gap-2 mb-8 text-sm" aria-live="polite">
            <p className="text-ink-300">
              <span className="text-white font-semibold tabular">{filteredItems.length}</span> {filteredItems.length === 1 ? "item" : "items"}
              {activeCategoryObj ? ` in ${activeCategoryObj.name}` : ""}
              {datesSelected ? ` available ${formatDateShort(startDate)} – ${formatDateShort(endDate)}` : ""}
            </p>
            {hasAnyFilter && (
              <button type="button" onClick={resetAll} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[13px] text-ink-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Clear all
              </button>
            )}
          </div>
        )}

        {loading ? (
          <SkeletonGrid count={8} className="lg:grid-cols-3 xl:grid-cols-4" />
        ) : loadError ? (
          <ErrorState title="Rentals didn't load" onRetry={() => setReloadKey((k) => k + 1)} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            tone="rental"
            icon={PackageSearch}
            title={datesSelected ? "Nothing free for those dates" : "No rentals match your filters"}
            description={
              datesSelected
                ? "Everything matching is booked for that range. Try shifting your dates or another category."
                : "Try a different keyword, category, or price range."
            }
            action={<Button variant="rental" onClick={resetAll}>Clear all filters</Button>}
            secondaryAction={datesSelected ? <Button variant="ghost" onClick={clearDates}>Remove dates</Button> : null}
          />
        ) : (
          <Stagger key={`${selectedCategory}-${startDate}-${endDate}-${sortBy}`} animateOnMount className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <StaggerItem key={item.id}>
                <RentalCard
                  item={item}
                  datesSelected={datesSelected}
                  to={`/rentals/${item.id}${datesSelected ? `?start_date=${startDate}&end_date=${endDate}` : ""}`}
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { setFulfillmentFilter("all"); setPriceFilter("all"); setSortBy("popularity"); }}>
              Reset
            </Button>
            <Button variant="rental" onClick={() => setFiltersOpen(false)}>Show {filteredItems.length} items</Button>
          </div>
        }
      >
        <div className="p-5 space-y-5">{filterFields}</div>
      </Drawer>
    </div>
  );
}

/** Date range trigger with an animated popover calendar. */
function DatePickerButton({ open, setOpen, start, end, nights, onChange, onClear }) {
  const ref = useRef(null);
  const [draft, setDraft] = useState({ start, end });

  useEffect(() => {
    if (open) setDraft({ start, end });
  }, [open, start, end]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const label = start && end ? `${formatDateShort(start)} → ${formatDateShort(end)}` : "Add dates";

  return (
    <div ref={ref} className="relative md:w-[300px] shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "w-full h-12 px-4 rounded-2xl flex items-center gap-3 text-left border transition-colors",
          open ? "border-emerald-400/50 bg-surface-800" : "border-white/[0.08] bg-surface-850 hover:border-white/15"
        )}
      >
        <CalendarRange className="w-[18px] h-[18px] text-emerald-300 shrink-0" aria-hidden="true" />
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] text-ink-400 leading-none">Rental dates</span>
          <span className={cn("block text-sm mt-1 truncate", start && end ? "text-white font-medium" : "text-ink-400")}>{label}</span>
        </span>
        {start && end && (
          <span className="text-xs text-emerald-300 tabular shrink-0">{nights || 1}d</span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Choose rental dates"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 z-40 w-[min(340px,calc(100vw-2rem))] p-4 rounded-2xl bg-surface-850 border border-white/[0.08] shadow-[var(--shadow-pop)] origin-top-right"
          >
            <p className="text-xs text-ink-400 mb-3">
              {!draft.start ? "Select a pickup date" : !draft.end ? "Now select a return date" : "Dates selected"}
            </p>
            <Calendar
              mode="range"
              accent="rental"
              value={draft}
              min={toISODate(new Date())}
              onChange={(v) => {
                setDraft(v);
                if (v.start && v.end) onChange(v);
              }}
            />
            {(start || end) && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="mt-3 w-full h-9 rounded-lg text-[13px] text-ink-300 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                Clear dates
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

