/**
 * Services.jsx — Categorized Marketplace Discovery Page.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, Clock, ShieldCheck, ArrowRight, Users, X, SearchX, LayoutGrid, CreditCard, UserCheck } from "lucide-react";
import { getCategories, getServices } from "../api/servicesApi";
import BookingWizardModal from "../components/booking/BookingWizardModal";
import ServiceCard from "../components/cards/ServiceCard";
import {
  PageHeader,
  SearchBar,
  FilterChips,
  Select,
  Button,
  ButtonLink,
  Drawer,
  Modal,
  Field,
  Rating,
  Avatar,
  EmptyState,
  ErrorState,
  SkeletonGrid,
  Skeleton,
  Stagger,
  StaggerItem,
  Reveal,
  cn,
} from "../components/ui";
import { serviceVisual } from "../lib/visuals";
import { formatINR, formatDuration } from "../lib/format";

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "all";
  const initialSearch = searchParams.get("search") || "";

  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [priceFilter, setPriceFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState("rating");

  // Active Modals
  const [bookingService, setBookingService] = useState(null);
  const [detailService, setDetailService] = useState(null);

  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const [catData, servData] = await Promise.all([getCategories({ includeServices: true }), getServices()]);
      setCategories(catData || []);
      setServices(servData || []);
    } catch (err) {
      console.warn("Failed to load services data:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      let catServices = services.filter((s) => s.category_id === cat.id);

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        catServices = catServices.filter(
          (s) =>
            s.title?.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            cat.name?.toLowerCase().includes(q)
        );
      }

      if (priceFilter === "under500") {
        catServices = catServices.filter((s) => s.price < 500);
      } else if (priceFilter === "500-1000") {
        catServices = catServices.filter((s) => s.price >= 500 && s.price <= 1000);
      } else if (priceFilter === "above1000") {
        catServices = catServices.filter((s) => s.price > 1000);
      }

      if (ratingFilter > 0) {
        catServices = catServices.filter((s) => (s.rating || 4.8) >= ratingFilter);
      }

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

  const isSingleCategoryView = selectedCategory !== "all";
  const activeCategoryObj = isSingleCategoryView
    ? categorizedData.find((c) => String(c.id) === String(selectedCategory))
    : null;

  const totalMatchingServices = categorizedData.reduce(
    (acc, cat) => acc + cat.matchingServices.length,
    0
  );

  const updateSearch = (value) => {
    setSearchQuery(value);
    const params = {};
    if (value) params.search = value;
    if (selectedCategory !== "all") params.category = selectedCategory;
    setSearchParams(params, { replace: true });
  };

  const clearAll = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setPriceFilter("all");
    setRatingFilter(0);
    setSearchParams({});
  };

  const activeFilterCount = (priceFilter !== "all" ? 1 : 0) + (ratingFilter > 0 ? 1 : 0);

  const filterControls = (
    <>
      <Field label="Price">
        <Select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} aria-label="Filter by price">
          <option value="all">Any price</option>
          <option value="under500">Under ₹500</option>
          <option value="500-1000">₹500 – ₹1,000</option>
          <option value="above1000">Above ₹1,000</option>
        </Select>
      </Field>
      <Field label="Rating">
        <Select value={ratingFilter} onChange={(e) => setRatingFilter(Number(e.target.value))} aria-label="Filter by rating">
          <option value={0}>Any rating</option>
          <option value={4.5}>4.5 and above</option>
          <option value={4.0}>4.0 and above</option>
        </Select>
      </Field>
      <Field label="Sort by">
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort services">
          <option value="rating">Top rated</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="popularity">Most popular</option>
        </Select>
      </Field>
    </>
  );

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Services"
        title="Find the right pro for any job"
        subtitle="Upfront prices, verified professionals and live availability across every category."
      >
        <Reveal delay={0.1} className="mt-8 max-w-2xl">
          <SearchBar
            value={searchQuery}
            onChange={updateSearch}
            size="lg"
            placeholder="Search “deep cleaning”, “AC repair”, “haircut”…"
            ariaLabel="Search services"
          />
        </Reveal>
      </PageHeader>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-30 bg-surface-950/85 backdrop-blur-xl border-y border-white/[0.06]">
        <div className="container-page py-3 flex items-center gap-3">
          <FilterChips
            ariaLabel="Category"
            className="flex-1 min-w-0"
            value={selectedCategory}
            onChange={(id) => handleCategorySelect(String(id))}
            items={[
              { id: "all", label: "All", icon: LayoutGrid },
              ...categories.map((c) => ({ id: String(c.id), label: c.name, icon: serviceVisual(c).icon })),
            ]}
          />
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Select className="!h-9 !min-h-9 !py-0 !text-[13px] w-[140px]" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} aria-label="Filter by price">
              <option value="all">Any price</option>
              <option value="under500">Under ₹500</option>
              <option value="500-1000">₹500 – ₹1,000</option>
              <option value="above1000">Above ₹1,000</option>
            </Select>
            <Select className="!h-9 !min-h-9 !py-0 !text-[13px] w-[136px]" value={ratingFilter} onChange={(e) => setRatingFilter(Number(e.target.value))} aria-label="Filter by rating">
              <option value={0}>Any rating</option>
              <option value={4.5}>4.5+ rating</option>
              <option value={4.0}>4.0+ rating</option>
            </Select>
            <Select className="!h-9 !min-h-9 !py-0 !text-[13px] w-[164px]" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort services">
              <option value="rating">Sort: Top rated</option>
              <option value="price-asc">Sort: Price low–high</option>
              <option value="price-desc">Sort: Price high–low</option>
              <option value="popularity">Sort: Most popular</option>
            </Select>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={SlidersHorizontal}
            className="lg:hidden shrink-0"
            onClick={() => setFiltersOpen(true)}
            aria-label="Open filters"
          >
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[11px] flex items-center justify-center">{activeFilterCount}</span>
            )}
          </Button>
        </div>
      </div>

      <div className="container-page pt-8">
        {/* Result summary */}
        {!loading && !loadError && (
          <div className="flex flex-wrap items-center gap-2 mb-8 text-sm" aria-live="polite">
            <p className="text-ink-300">
              <span className="text-white font-semibold tabular">{totalMatchingServices}</span>{" "}
              {totalMatchingServices === 1 ? "service" : "services"}
              {isSingleCategoryView && activeCategoryObj ? ` in ${activeCategoryObj.name}` : ""}
              {searchQuery ? ` matching “${searchQuery}”` : ""}
            </p>
            {(searchQuery || isSingleCategoryView || activeFilterCount > 0) && (
              <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[13px] text-ink-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-12">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-5">
                <Skeleton className="h-8 w-64" />
                <SkeletonGrid count={3} media={false} />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <ErrorState title="Services didn't load" onRetry={loadData} retrying={loading} />
        ) : totalMatchingServices === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No services match your search"
            description="Try a broader keyword, another category, or remove a price or rating filter."
            action={<Button variant="secondary" onClick={clearAll}>Clear all filters</Button>}
          />
        ) : isSingleCategoryView && activeCategoryObj ? (
          <AnimatePresence mode="wait">
            <motion.div key={activeCategoryObj.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <CategoryBanner category={activeCategoryObj} count={activeCategoryObj.matchingServices.length} />
              <Stagger animateOnMount className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeCategoryObj.matchingServices.map((service) => (
                  <StaggerItem key={service.id}>
                    <ServiceCard
                      service={service}
                      category={activeCategoryObj}
                      showCategory={false}
                      onBook={() => setBookingService(service)}
                      onDetails={() => setDetailService(service)}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-16">
            {categorizedData
              .filter((cat) => cat.matchingServices.length > 0)
              .map((cat) => {
                const displayServices = searchQuery ? cat.matchingServices : cat.matchingServices.slice(0, 4);
                const visual = serviceVisual(cat);
                const Icon = visual.icon;
                return (
                  <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
                    <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3.5">
                        <span className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", visual.toneClasses.bg)}>
                          <Icon className={cn("w-5 h-5", visual.toneClasses.icon)} aria-hidden="true" />
                        </span>
                        <div>
                          <h2 id={`cat-${cat.id}`} className="text-xl font-semibold text-white">
                            {cat.name}
                          </h2>
                          <p className="text-[13px] text-ink-400 mt-0.5 line-clamp-1">{cat.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ButtonLink to={`/services/${cat.id}`} variant="ghost" size="sm" icon={Users}>
                          Professionals
                        </ButtonLink>
                        {!searchQuery && cat.matchingServices.length > 4 && (
                          <Button variant="secondary" size="sm" iconRight={ArrowRight} onClick={() => handleCategorySelect(String(cat.id))}>
                            All {cat.matchingServices.length}
                          </Button>
                        )}
                      </div>
                    </Reveal>
                    <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {displayServices.map((service) => (
                        <StaggerItem key={service.id}>
                          <ServiceCard
                            service={service}
                            category={cat}
                            showCategory={false}
                            onBook={() => setBookingService(service)}
                            onDetails={() => setDetailService(service)}
                          />
                        </StaggerItem>
                      ))}
                    </Stagger>
                  </section>
                );
              })}
          </div>
        )}
      </div>

      {/* Mobile filters */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPriceFilter("all");
                setRatingFilter(0);
                setSortBy("rating");
              }}
            >
              Reset
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Show {totalMatchingServices} results</Button>
          </div>
        }
      >
        <div className="p-5 space-y-5">{filterControls}</div>
      </Drawer>

      {/* Service details */}
      <ServiceDetailModal
        service={detailService}
        onClose={() => setDetailService(null)}
        onBook={(svc) => {
          setDetailService(null);
          setBookingService(svc);
        }}
      />

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

function CategoryBanner({ category, count }) {
  const visual = serviceVisual(category);
  const Icon = visual.icon;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-surface-900">
      <img src={visual.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-r from-surface-950 via-surface-950/85 to-surface-950/30" />
      <div className="relative p-6 sm:p-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-xl">
          <span className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", visual.toneClasses.bg)}>
            <Icon className={cn("w-6 h-6", visual.toneClasses.icon)} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-3xl font-semibold text-white">{category.name}</h2>
          <p className="mt-2 text-ink-300 leading-relaxed">
            {category.description || "Professional doorstep services by background-verified experts."}
          </p>
          <p className="mt-3 text-sm text-ink-400">{count} {count === 1 ? "service" : "services"} available</p>
        </div>
        <ButtonLink to={`/services/${category.id}`} variant="secondary" icon={Users} className="self-start md:self-auto">
          Browse professionals
        </ButtonLink>
      </div>
    </div>
  );
}

function ServiceDetailModal({ service, onClose, onBook }) {
  const visual = serviceVisual(service?.category);
  return (
    <Modal open={!!service} onClose={onClose} size="lg" hideClose bodyClassName="!px-0 !pb-0">
      {service && (
        <div>
          <div className="relative h-48 sm:h-56 -mt-4 sm:-mt-0">
            <img src={visual.image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/30 to-transparent" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-950/70 backdrop-blur-md text-white flex items-center justify-center hover:bg-surface-950"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 sm:px-7 pb-6 -mt-8 relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-ink-300">{service.category?.name || "Service"}</span>
              <span className="text-ink-500">·</span>
              <Rating value={service.rating} count={service.review_count} />
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{service.title}</h2>
            <p className="mt-2 text-sm text-ink-300 leading-relaxed">{service.description}</p>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="surface-inset p-4">
                <dt className="text-xs text-ink-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Duration
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">{formatDuration(service.duration_minutes)}</dd>
              </div>
              <div className="surface-inset p-4">
                <dt className="text-xs text-ink-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Protection
                </dt>
                <dd className="mt-1 text-sm font-semibold text-emerald-300">30-day re-work</dd>
              </div>
              <div className="surface-inset p-4">
                <dt className="text-xs text-ink-400 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" aria-hidden="true" /> Offered by
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white flex items-center gap-2 min-w-0">
                  <Avatar src={service.provider?.profile_image} name={service.provider?.full_name || "Pro"} size="xs" />
                  <span className="truncate">{service.provider?.full_name || "Verified pro"}</span>
                </dd>
              </div>
              <div className="surface-inset p-4">
                <dt className="text-xs text-ink-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" aria-hidden="true" /> Payment
                </dt>
                <dd className="mt-1 text-sm font-semibold text-white">Secure online</dd>
              </div>
            </dl>

            <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-ink-400">Starts at</p>
                <p className="text-2xl font-semibold text-white tabular font-heading">{formatINR(service.price)}</p>
              </div>
              <div className="flex gap-2">
                {service.provider_id && (
                  <ButtonLink to={`/providers/${service.provider_id}`} variant="secondary" className="flex-1 sm:flex-none">
                    View provider
                  </ButtonLink>
                )}
                <Button onClick={() => onBook(service)} iconRight={ArrowRight} className="flex-1 sm:flex-none">
                  Book service
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
