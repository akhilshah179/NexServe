/**
 * ProviderDetail.jsx — Startup-Grade Provider Profile & Booking Gateway.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { fetchProviderByIdApi } from "../api/providersApi";
import { getServices } from "../api/servicesApi";
import { fetchProviderReviewsApi } from "../api/reviewsApi";
import BookingWizardModal from "../components/booking/BookingWizardModal";
import {
  Star,
  MapPin,
  Clock,
  ShieldCheck,
  CalendarDays,
  Briefcase,
  ArrowRight,
  MessageSquare,
  Zap,
  Send,
  Siren,
  Radius,
  UserX,
  Wrench,
} from "lucide-react";
import {
  Avatar,
  Badge,
  VerifiedBadge,
  Rating,
  Tabs,
  Button,
  ButtonLink,
  Select,
  Field,
  Breadcrumbs,
  EmptyState,
  ErrorState,
  Skeleton,
  Stagger,
  StaggerItem,
  Reveal,
  cn,
} from "../components/ui";
import { serviceVisual } from "../lib/visuals";
import { formatINR, formatDuration, formatDate } from "../lib/format";

export default function ProviderDetail() {
  const { providerId } = useParams();
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("services");

  const [bookingServiceTarget, setBookingServiceTarget] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [provData, servsData, revsData] = await Promise.all([
        fetchProviderByIdApi(Number(providerId)),
        getServices({ providerId: Number(providerId) }),
        fetchProviderReviewsApi(Number(providerId)).catch(() => []),
      ]);
      setProvider(provData);
      setServices(servsData || []);
      setReviews(revsData || []);
    } catch (err) {
      console.warn("Failed to load provider profile:", err);
      setLoadError(err.response?.status === 404 ? "notfound" : "error");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    if (providerId) loadData();
  }, [providerId, loadData]);

  const ratingBreakdown = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((star) => ({ star, n: reviews.filter((r) => Math.round(r.rating) === star).length }));
    const avg = reviews.length ? reviews.reduce((a, r) => a + Number(r.rating || 0), 0) / reviews.length : null;
    return { counts, avg };
  }, [reviews]);

  if (loading) {
    return (
      <div className="pt-24 pb-24 container-page space-y-6">
        <Skeleton className="h-56 rounded-3xl" />
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (loadError || !provider) {
    return (
      <div className="pt-32 pb-24 container-page">
        {loadError === "error" ? (
          <ErrorState title="This profile didn't load" onRetry={loadData} backTo="/services" backLabel="Browse services" />
        ) : (
          <EmptyState
            icon={UserX}
            title="Professional not found"
            description="This profile may be unavailable or no longer active."
            action={<ButtonLink to="/services">Browse services</ButtonLink>}
          />
        )}
      </div>
    );
  }

  let portfolioPhotos = [];
  try {
    portfolioPhotos = provider.portfolio_photos
      ? typeof provider.portfolio_photos === "string"
        ? JSON.parse(provider.portfolio_photos)
        : provider.portfolio_photos
      : [];
  } catch {
    portfolioPhotos = [];
  }

  const instant = provider.booking_mode !== "request_booking";
  const verified = !provider.verification_status || provider.verification_status === "approved";
  const coverVisual = serviceVisual(services[0]?.category);
  const bookTarget = services.find((s) => String(s.id) === String(selectedServiceId)) || services[0];
  const minPrice = services.length ? Math.min(...services.map((s) => s.price)) : null;

  return (
    <div className="pb-28 lg:pb-24">
      {/* Cover */}
      <div className="relative h-56 sm:h-72 overflow-hidden">
        <img src={coverVisual.image} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950/70 via-surface-950/50 to-surface-950" />
        <div className="absolute inset-x-0 top-20 container-page">
          <Breadcrumbs items={[{ label: "Services", to: "/services" }, { label: provider.full_name }]} />
        </div>
      </div>

      <div className="container-page">
        {/* Identity */}
        <Reveal y={12} className="relative -mt-20 sm:-mt-24 flex flex-col md:flex-row md:items-end gap-5 md:gap-6">
          <Avatar src={provider.profile_image} name={provider.full_name} size="2xl" className="ring-4 ring-surface-950 shadow-2xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-semibold text-white">{provider.full_name}</h1>
              {verified && <VerifiedBadge label="Verified professional" />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-300">
              <Rating value={provider.rating} count={provider.review_count ?? reviews.length} size="md" />
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-ink-400" aria-hidden="true" />
                {provider.location || "Bengaluru"}
              </span>
              {provider.experience_years ? (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-ink-400" aria-hidden="true" />
                  {provider.experience_years} years experience
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-ink-400" aria-hidden="true" />
                Member since {new Date(provider.created_at || Date.now()).getFullYear()}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={instant ? "emerald" : "amber"} size="lg" icon={instant ? Zap : Send}>
              {instant ? "Instant booking" : "Booking on request"}
            </Badge>
            {provider.emergency_available && (
              <Badge tone="rose" size="lg" icon={Siren}>
                24/7 emergency
              </Badge>
            )}
          </div>
        </Reveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px] items-start">
          {/* Main column */}
          <div className="min-w-0">
            <Tabs
              variant="underline"
              ariaLabel="Profile sections"
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { id: "services", label: "Services", count: services.length },
                { id: "about", label: "About" },
                { id: "reviews", label: "Reviews", count: reviews.length },
              ]}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="pt-6"
              >
                {activeTab === "services" &&
                  (services.length === 0 ? (
                    <EmptyState compact icon={Wrench} title="No services listed yet" description="This professional hasn't published services in the catalogue." />
                  ) : (
                    <Stagger animateOnMount className="space-y-3">
                      {services.map((service) => {
                        const v = serviceVisual(service.category);
                        const SIcon = v.icon;
                        return (
                          <StaggerItem key={service.id}>
                            <div className="group surface card-interactive p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                              <span className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", v.toneClasses.bg)}>
                                <SIcon className={cn("w-5 h-5", v.toneClasses.icon)} aria-hidden="true" />
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base font-semibold text-white">{service.title}</h3>
                                  <Rating value={service.rating} count={service.review_count} />
                                </div>
                                <p className="mt-1 text-sm text-ink-400 line-clamp-2">{service.description}</p>
                                <p className="mt-2 text-xs text-ink-400 flex items-center gap-3">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                                    {formatDuration(service.duration_minutes)}
                                  </span>
                                  <span>{service.category?.name}</span>
                                </p>
                              </div>
                              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-white/[0.06]">
                                <p className="text-xl font-semibold text-white tabular font-heading">{formatINR(service.price)}</p>
                                <Button size="sm" iconRight={ArrowRight} onClick={() => setBookingServiceTarget(service)}>
                                  Book
                                </Button>
                              </div>
                            </div>
                          </StaggerItem>
                        );
                      })}
                    </Stagger>
                  ))}

                {activeTab === "about" && (
                  <div className="space-y-6">
                    <div className="surface p-6">
                      <h2 className="text-base font-semibold text-white">About {provider.full_name.split(" ")[0]}</h2>
                      <p className="mt-3 text-[15px] text-ink-300 leading-relaxed">
                        {provider.bio || "Certified professional providing quality residential and commercial services across the city."}
                      </p>
                      <dl className="mt-6 grid sm:grid-cols-3 gap-3">
                        <div className="surface-inset p-4">
                          <dt className="text-xs text-ink-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" aria-hidden="true" />Working hours</dt>
                          <dd className="mt-1 text-sm font-medium text-white">{provider.working_hours || "Mon–Sat, 9 AM – 7 PM"}</dd>
                        </div>
                        <div className="surface-inset p-4">
                          <dt className="text-xs text-ink-400 flex items-center gap-1.5"><Radius className="w-3.5 h-3.5" aria-hidden="true" />Service area</dt>
                          <dd className="mt-1 text-sm font-medium text-white">{provider.service_radius_km || 15} km radius</dd>
                        </div>
                        <div className="surface-inset p-4">
                          <dt className="text-xs text-ink-400 flex items-center gap-1.5"><Siren className="w-3.5 h-3.5" aria-hidden="true" />Emergency</dt>
                          <dd className={cn("mt-1 text-sm font-medium", provider.emergency_available ? "text-emerald-300" : "text-ink-300")}>
                            {provider.emergency_available ? "Available 24/7" : "Standard hours only"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    {portfolioPhotos.length > 0 && (
                      <div className="surface p-6">
                        <h2 className="text-base font-semibold text-white">Recent work</h2>
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {portfolioPhotos.map((photo, i) => (
                            <motion.img
                              key={i}
                              src={photo}
                              alt={`Portfolio sample ${i + 1}`}
                              whileHover={{ scale: 1.03 }}
                              className="w-full aspect-[4/3] rounded-xl object-cover ring-1 ring-white/10"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "reviews" &&
                  (reviews.length === 0 ? (
                    <EmptyState compact icon={MessageSquare} title="No written reviews yet" description="Reviews appear here after customers complete a booking." />
                  ) : (
                    <div className="space-y-6">
                      <div className="surface p-6 grid sm:grid-cols-[160px_1fr] gap-6 items-center">
                        <div className="text-center sm:text-left">
                          <p className="text-5xl font-semibold text-white tabular font-heading">{ratingBreakdown.avg?.toFixed(1)}</p>
                          <div className="mt-2 flex justify-center sm:justify-start gap-0.5" aria-hidden="true">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} className={cn("w-4 h-4", i <= Math.round(ratingBreakdown.avg) ? "fill-amber-400 text-amber-400" : "text-surface-600")} />
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-ink-400">{reviews.length} reviews</p>
                        </div>
                        <ul className="space-y-1.5">
                          {ratingBreakdown.counts.map(({ star, n }) => (
                            <li key={star} className="flex items-center gap-3 text-xs text-ink-400">
                              <span className="w-3 tabular">{star}</span>
                              <span className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <motion.span
                                  className="block h-full bg-amber-400 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(n / reviews.length) * 100}%` }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                />
                              </span>
                              <span className="w-6 text-right tabular">{n}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Stagger animateOnMount className="space-y-3">
                        {reviews.map((rev) => (
                          <StaggerItem key={rev.id} className="surface p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar name={rev.customer?.full_name || "Customer"} src={rev.customer?.profile_image} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{rev.customer?.full_name || "Verified customer"}</p>
                                  <p className="text-xs text-ink-500">{formatDate(rev.created_at)}</p>
                                </div>
                              </div>
                              <Rating value={rev.rating} />
                            </div>
                            {rev.comment && <p className="mt-3 text-sm text-ink-200 leading-relaxed">{rev.comment}</p>}
                            {rev.provider_reply && (
                              <div className="mt-4 pl-4 border-l-2 border-primary-400/40">
                                <p className="text-xs font-medium text-primary-300">Reply from {provider.full_name.split(" ")[0]}</p>
                                <p className="mt-1 text-sm text-ink-300">{rev.provider_reply}</p>
                              </div>
                            )}
                          </StaggerItem>
                        ))}
                      </Stagger>
                    </div>
                  ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Booking card */}
          <aside className="lg:sticky lg:top-24">
            <div className="surface-raised p-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-ink-400">{minPrice != null ? "Services from" : "Hourly rate"}</p>
                  <p className="text-3xl font-semibold text-white tabular font-heading">
                    {formatINR(minPrice ?? provider.hourly_rate ?? 499)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                  <span className="live-dot text-emerald-400" aria-hidden="true" />
                  Taking bookings
                </span>
              </div>

              {services.length > 1 && (
                <Field label="Service" className="mt-5">
                  <Select value={bookTarget?.id || ""} onChange={(e) => setSelectedServiceId(e.target.value)}>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — {formatINR(s.price)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <ul className="mt-5 space-y-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-ink-400">Working hours</span>
                  <span className="text-ink-100 text-right">{provider.working_hours || "Mon–Sat"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-ink-400">Booking</span>
                  <span className="text-ink-100">{instant ? "Confirmed instantly" : "Confirmed by pro"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-ink-400">Hourly rate</span>
                  <span className="text-ink-100 tabular">{formatINR(provider.hourly_rate || 499)}/hr</span>
                </li>
              </ul>

              <div className="mt-6">
                {bookTarget ? (
                  <Button fullWidth size="lg" iconRight={ArrowRight} onClick={() => setBookingServiceTarget(bookTarget)}>
                    Book {provider.full_name.split(" ")[0]}
                  </Button>
                ) : (
                  <ButtonLink to="/services" fullWidth size="lg" variant="secondary">
                    Browse available services
                  </ButtonLink>
                )}
              </div>
            </div>
            <div className="mt-4 p-4 rounded-2xl border border-white/[0.06] flex gap-3 text-[13px] text-ink-400">
              <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0" aria-hidden="true" />
              <p>
                <span className="text-ink-100 font-medium">NexServe Pro guarantee.</span> Identity verified, secure payments and 30-day
                re-work protection.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {bookTarget && (
        <div className="lg:hidden fixed inset-x-0 bottom-[63px] md:bottom-0 z-30 border-t border-white/[0.06] bg-surface-950/90 backdrop-blur-xl">
          <div className="container-page py-3 flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-400 truncate">{bookTarget.title}</p>
              <p className="text-lg font-semibold text-white tabular">{formatINR(bookTarget.price)}</p>
            </div>
            <Button iconRight={ArrowRight} onClick={() => setBookingServiceTarget(bookTarget)}>
              Book now
            </Button>
          </div>
        </div>
      )}

      {bookingServiceTarget && (
        <BookingWizardModal
          service={bookingServiceTarget}
          initialProvider={provider}
          onClose={() => setBookingServiceTarget(null)}
          onSuccess={() => {
            setBookingServiceTarget(null);
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
}
