/**
 * RentalDetail.jsx — Production-Grade Rental Item Detail & Checkout Page.
 */

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  getRentalItemDetail,
  checkRentalAvailability,
  calculateRentalPrice,
  createRentalBooking,
  createRentalReview,
} from "../api/rentalsApi";
import { initiateRentalRazorpayCheckout } from "../utils/razorpay";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  Truck,
  Store,
  MapPin,
  CalendarRange,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Minus,
  Plus,

  PackageSearch,
  RotateCcw,
  Wallet,
  ClipboardList,
  MessageSquare,
  LogIn,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react";
import {
  Breadcrumbs,
  Rating,
  StarInput,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Calendar,
  Field,
  Input,
  Textarea,
  Alert,
  EmptyState,
  Skeleton,
  PriceRow,
  PriceTotal,
  PriceBreakdown,
  Reveal,
  SmartImage,
  useToast,
  cn,
} from "../components/ui";
import { rentalVisual, FALLBACK_RENTAL_IMAGE } from "../lib/visuals";
import { formatINR, formatDate, formatDateShort, toISODate, getErrorMessage } from "../lib/format";
import { ease } from "../lib/motion";

export default function RentalDetail() {
  const { itemId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const [item, setItem] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking Form State
  const [startDate, setStartDate] = useState(
    searchParams.get("start_date") || toISODate(Date.now() + 86400000)
  );
  const [endDate, setEndDate] = useState(
    searchParams.get("end_date") || toISODate(Date.now() + 86400000 * 3)
  );
  const [quantity, setQuantity] = useState(1);
  const [deliveryRequested, setDeliveryRequested] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [couponCode, setCouponCode] = useState("");

  // Calculation & Availability State
  const [isAvailable, setIsAvailable] = useState(true);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [priceQuote, setPriceQuote] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Load Item details
  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true);
        const data = await getRentalItemDetail(itemId);
        setItem(data);
        if (!data.pickup_available && data.delivery_available) {
          setDeliveryRequested(true);
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load rental item.");
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [itemId]);

  // Check Availability & Price Quote
  useEffect(() => {
    if (!item || !startDate || !endDate) return;

    if (new Date(startDate) > new Date(endDate)) {
      setIsAvailable(false);
      setAvailabilityMessage("End date must be on or after start date.");
      setPriceQuote(null);
      return;
    }

    let isSubscribed = true;

    async function evaluateAvailabilityAndPrice() {
      setCheckingAvailability(true);
      setCalculatingPrice(true);
      try {
        const [availRes, quoteRes] = await Promise.all([
          checkRentalAvailability(itemId, {
            start_date: startDate,
            end_date: endDate,
            quantity: Number(quantity),
          }),
          calculateRentalPrice(itemId, {
            start_date: startDate,
            end_date: endDate,
            quantity: Number(quantity),
            delivery_requested: deliveryRequested,
            coupon_code: couponCode.trim() || undefined,
          }),
        ]);

        if (isSubscribed) {
          setIsAvailable(availRes.is_available);
          setAvailabilityMessage(availRes.message);
          setPriceQuote(quoteRes);
        }
      } catch (err) {
        if (isSubscribed) {
          setIsAvailable(false);
          setAvailabilityMessage(
            err.response?.data?.detail || "Item not available for chosen dates."
          );
          setPriceQuote(null);
        }
      } finally {
        if (isSubscribed) {
          setCheckingAvailability(false);
          setCalculatingPrice(false);
        }
      }
    }

    const timer = setTimeout(evaluateAvailabilityAndPrice, 300);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [itemId, item, startDate, endDate, quantity, deliveryRequested, couponCode]);

  const handleProceedToRent = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!startDate || !endDate) {
      setFormError("Choose pickup and return dates.");
      setCalendarOpen(true);
      return;
    }

    if (deliveryRequested && !deliveryAddress.trim()) {
      setFormError("Add a delivery address so the host knows where to bring it.");
      return;
    }

    if (!isAvailable) {
      setFormError("This item isn't available for the selected dates.");
      return;
    }

    try {
      setBookingInProgress(true);

      const bookingPayload = {
        rental_item_id: item.id,
        start_date: startDate,
        end_date: endDate,
        quantity: Number(quantity),
        fulfillment_type: deliveryRequested ? "DELIVERY" : "PICKUP",
        delivery_address: deliveryRequested ? deliveryAddress : null,
        special_instructions: specialInstructions || null,
        coupon_code: couponCode.trim() || null,
      };

      const newBooking = await createRentalBooking(bookingPayload);

      initiateRentalRazorpayCheckout({
        rentalBooking: newBooking,
        user,
        onSuccess: () => {
          setBookingInProgress(false);
          setBookingSuccessData(newBooking);
        },
        onError: (errMsg) => {
          setBookingInProgress(false);
          toast.info(
            `Rental #${newBooking.id} reserved — payment pending`,
            `${errMsg} You can complete payment any time from My Rentals.`,
            { duration: 8000 }
          );
          navigate("/my-rentals");
        },
      });
    } catch (err) {
      setBookingInProgress(false);
      setFormError(getErrorMessage(err, "Failed to create rental booking. Please try again."));
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }
    try {
      setSubmittingReview(true);
      const newReview = await createRentalReview(itemId, {
        rating: Number(reviewRating),
        comment: reviewComment,
      });
      setItem((prev) => ({
        ...prev,
        reviews: [newReview, ...(prev.reviews || [])],
        review_count: (prev.review_count || 0) + 1,
      }));
      setReviewComment("");
      toast.success("Review posted", "Thanks for helping other renters.");
    } catch (err) {
      toast.error("Couldn't post review", getErrorMessage(err));
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-24 pb-24 container-page">
        <Skeleton className="h-4 w-56 mb-6" />
        <div className="grid lg:grid-cols-[1fr_400px] gap-10">
          <div className="space-y-4">
            <Skeleton className="aspect-[4/3] rounded-3xl" />
            <div className="flex gap-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="w-20 h-20 rounded-xl" />)}
            </div>
          </div>
          <Skeleton className="h-[560px] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="pt-32 pb-24 container-page">
        <EmptyState
          tone="rental"
          icon={PackageSearch}
          title="We couldn't find this item"
          description={error || "The rental item you requested does not exist or is no longer listed."}
          action={<ButtonLink to="/rentals" variant="rental">Browse rentals</ButtonLink>}
        />
      </div>
    );
  }

  const images = item.images && item.images.length > 0 ? item.images : [{ id: 1, image_url: FALLBACK_RENTAL_IMAGE }];
  const visual = rentalVisual(item.category);
  const CatIcon = visual.icon;
  const title = item.title || item.name;
  const dailyRate = item.daily_rate ?? item.price_per_day ?? 0;
  const deposit = item.security_deposit ?? 0;
  const host = item.provider;
  const step = (d) => setActiveImageIndex((i) => (i + d + images.length) % images.length);

  const specs = [
    ["Condition", item.condition],
    ["Brand", item.brand],
    ["Model", item.model],
    ["In stock", item.quantity != null ? `${item.quantity} unit${item.quantity > 1 ? "s" : ""}` : null],
    ["Minimum rental", item.min_rental_days ? `${item.min_rental_days} day${item.min_rental_days > 1 ? "s" : ""}` : null],
    ["Maximum rental", item.max_rental_days ? `${item.max_rental_days} days` : null],
    ["Location", item.city || item.location],
    ["Delivery fee", item.delivery_available ? formatINR(item.delivery_fee || 0) : "Not offered"],
  ].filter(([, v]) => v);

  return (
    <div className="pt-24 pb-28 lg:pb-24">
      <div className="container-page">
        <Breadcrumbs
          className="mb-6"
          items={[
            { label: "Rentals", to: "/rentals" },
            { label: item.category?.name || "Category", to: item.category?.slug ? `/rentals?category=${item.category.slug}` : "/rentals" },
            { label: title },
          ]}
        />

        <div className="grid gap-10 lg:grid-cols-[1fr_400px] items-start">
          {/* ═══ LEFT ═══ */}
          <div className="min-w-0 space-y-10">
            {/* Gallery */}
            <Reveal y={12}>
              <div className="relative group aspect-[4/3] sm:aspect-[16/10] rounded-3xl overflow-hidden bg-surface-900 border border-white/[0.06]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={activeImageIndex}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: ease.out }}
                  >
                    <SmartImage src={images[activeImageIndex]?.image_url} alt={title} fallbackIcon={CatIcon} tone="rental" className="w-full h-full" />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-x-0 top-0 p-4 flex items-start justify-between pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-surface-950/70 backdrop-blur-md text-xs font-medium text-white ring-1 ring-inset ring-white/10">
                    <CatIcon className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                    {item.category?.name}
                  </span>
                  {images.length > 1 && (
                    <span className="h-8 px-3 rounded-lg bg-surface-950/70 backdrop-blur-md text-xs text-ink-200 inline-flex items-center tabular">
                      {activeImageIndex + 1} / {images.length}
                    </span>
                  )}
                </div>
                {images.length > 1 && (
                  <>
                    <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-950/70 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-950/70 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-none pb-1" role="tablist" aria-label="Photos">
                  {images.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      type="button"
                      role="tab"
                      aria-selected={activeImageIndex === idx}
                      aria-label={`Photo ${idx + 1}`}
                      onClick={() => setActiveImageIndex(idx)}
                      className={cn(
                        "relative w-20 h-20 rounded-xl overflow-hidden shrink-0 transition-all duration-200",
                        activeImageIndex === idx ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-surface-950" : "opacity-60 hover:opacity-100"
                      )}
                    >
                      <SmartImage src={img.image_url} className="w-full h-full" />
                    </button>
                  ))}
                </div>
              )}
            </Reveal>

            {/* Title */}
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Rating value={item.rating} count={item.review_count} size="md" />
                {(item.city || item.location) && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-400">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    {item.city || item.location}
                  </span>
                )}
                {item.condition && <Badge tone="teal">{item.condition}</Badge>}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white leading-tight">{title}</h1>
              {(item.brand || item.model) && <p className="mt-2 text-ink-400">{[item.brand, item.model].filter(Boolean).join(" · ")}</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                {item.delivery_available && <Badge tone="emerald" size="lg" icon={Truck}>Doorstep delivery</Badge>}
                {item.pickup_available && <Badge tone="neutral" size="lg" icon={Store}>Self pickup</Badge>}
                <Badge tone="teal" size="lg" icon={ShieldCheck}>{formatINR(deposit)} refundable deposit</Badge>
              </div>
            </div>

            {/* Description */}
            <section aria-labelledby="desc-h">
              <h2 id="desc-h" className="text-lg font-semibold text-white">About this item</h2>
              <p className="mt-3 text-[15px] text-ink-300 leading-relaxed whitespace-pre-line">{item.description}</p>
            </section>

            {/* Specs */}
            <section aria-labelledby="spec-h">
              <h2 id="spec-h" className="text-lg font-semibold text-white">Specifications</h2>
              <dl className="mt-4 grid sm:grid-cols-2 gap-px rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.06]">
                {specs.map(([k, v]) => (
                  <div key={k} className="bg-surface-900 px-4 py-3.5 flex items-center justify-between gap-4">
                    <dt className="text-sm text-ink-400">{k}</dt>
                    <dd className="text-sm font-medium text-white text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Host */}
            <section aria-labelledby="host-h" className="surface p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar src={host?.profile_image} name={host?.business_name || host?.full_name || "Host"} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-400">Hosted by</p>
                <h2 id="host-h" className="text-base font-semibold text-white flex items-center gap-1.5">
                  {host?.business_name || host?.full_name || "Verified rental host"}
                  <BadgeCheck className="w-4 h-4 text-accent-400" aria-label="Verified host" />
                </h2>
                <p className="text-[13px] text-ink-400 mt-0.5">
                  {item.pickup_address ? `Pickup from ${item.pickup_address}` : host?.location || "Pickup address shared after confirmation"}
                </p>
              </div>
              {host?.rating ? <Rating value={host.rating} count={host.review_count} /> : null}
            </section>

            {/* Policies */}
            <section aria-labelledby="pol-h">
              <h2 id="pol-h" className="text-lg font-semibold text-white">Rental policies</h2>
              <div className="mt-4 grid sm:grid-cols-3 gap-3">
                {[
                  { icon: Wallet, t: "Deposit", d: `${formatINR(deposit)} is held securely and refunded after the host inspects the return.` },
                  { icon: RotateCcw, t: "Returns", d: "Return on or before your return date in the condition you received it." },
                  { icon: ClipboardList, t: "Inspection", d: "Damage is assessed at return; deductions are itemised before any refund." },
                ].map((p) => (
                  <div key={p.t} className="surface-inset p-4">
                    <p.icon className="w-5 h-5 text-emerald-300" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-white">{p.t}</p>
                    <p className="mt-1 text-[13px] text-ink-400 leading-relaxed">{p.d}</p>
                  </div>
                ))}
              </div>
              {item.terms_and_conditions && (
                <div className="mt-4 surface-inset p-4">
                  <p className="text-sm font-semibold text-white">Host's terms</p>
                  <p className="mt-1.5 text-[13px] text-ink-300 leading-relaxed whitespace-pre-line">{item.terms_and_conditions}</p>
                </div>
              )}
            </section>

            {/* Reviews */}
            <section aria-labelledby="rev-h" className="space-y-5">
              <div className="flex items-end justify-between gap-3">
                <h2 id="rev-h" className="text-lg font-semibold text-white">Reviews</h2>
                <Rating value={item.rating} count={item.review_count} size="md" />
              </div>
              {user ? (
                <form onSubmit={handleReviewSubmit} className="surface p-5 space-y-4">
                  <p className="text-sm font-medium text-white">Rented this before? Share how it went.</p>
                  <StarInput value={reviewRating} onChange={setReviewRating} label="Your rating" size={24} />
                  <Textarea
                    rental
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Condition of the gear, accuracy of the listing, handover experience…"
                    required
                    aria-label="Your review"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" variant="rental" size="sm" loading={submittingReview} loadingText="Posting" disabled={!reviewComment.trim()}>
                      Post review
                    </Button>
                  </div>
                </form>
              ) : null}
              {item.reviews && item.reviews.length > 0 ? (
                <ul className="space-y-3">
                  {item.reviews.map((rev) => (
                    <motion.li key={rev.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={rev.user?.full_name || "Renter"} src={rev.user?.profile_image} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{rev.user?.full_name || "Verified renter"}</p>
                            <p className="text-xs text-ink-500">{formatDate(rev.created_at)}</p>
                          </div>
                        </div>
                        <Rating value={rev.rating} />
                      </div>
                      {rev.comment && <p className="mt-3 text-sm text-ink-200 leading-relaxed">{rev.comment}</p>}
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <div className="surface-inset p-6 text-center">
                  <MessageSquare className="w-5 h-5 mx-auto text-ink-400" aria-hidden="true" />
                  <p className="mt-2 text-sm text-ink-300">No written reviews yet — be the first after your rental.</p>
                </div>
              )}
            </section>
          </div>

          {/* ═══ RIGHT: STICKY BOOKING PANEL ═══ */}
          <aside id="booking-panel" className="lg:sticky lg:top-24">
            <AnimatePresence mode="wait">
              {bookingSuccessData ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="surface-raised p-6 text-center border-emerald-400/30"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                    className="w-16 h-16 mx-auto rounded-full bg-emerald-400/15 text-emerald-300 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
                  </motion.div>
                  <h2 className="mt-5 text-xl font-semibold text-white">Rental confirmed</h2>
                  <p className="mt-2 text-sm text-ink-400">
                    Booking <span className="text-white font-medium">#{bookingSuccessData.id}</span>. Your deposit is held securely and refunded after return.
                  </p>
                  <dl className="mt-5 surface-inset text-left divide-y divide-white/[0.05]">
                    <div className="flex justify-between px-4 py-3 text-sm">
                      <dt className="text-ink-400">Dates</dt>
                      <dd className="text-white">{formatDateShort(startDate)} → {formatDateShort(endDate)}</dd>
                    </div>
                    <div className="flex justify-between px-4 py-3 text-sm">
                      <dt className="text-ink-400">Fulfilment</dt>
                      <dd className="text-emerald-300">{deliveryRequested ? "Doorstep delivery" : "Self pickup"}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 space-y-2">
                    <ButtonLink to="/my-rentals" variant="rental" fullWidth iconRight={ArrowRight}>
                      Track in My Rentals
                    </ButtonLink>
                    <Button variant="ghost" fullWidth onClick={() => setBookingSuccessData(null)}>
                      Rent another item
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleProceedToRent} className="surface-raised p-5 sm:p-6 space-y-5" noValidate>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-3xl font-semibold text-white tabular font-heading">
                        {formatINR(dailyRate)}
                        <span className="text-base font-normal text-ink-400"> /day</span>
                      </p>
                      <p className="mt-1 text-[13px] text-teal-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        {formatINR(deposit)} refundable deposit
                      </p>
                    </div>
                    <Badge tone="emerald">{item.quantity} available</Badge>
                  </div>

                  {/* Dates */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setCalendarOpen((v) => !v)}
                      aria-expanded={calendarOpen}
                      className={cn(
                        "w-full grid grid-cols-2 rounded-xl border overflow-hidden text-left transition-colors",
                        calendarOpen ? "border-emerald-400/50" : "border-white/[0.1] hover:border-white/20"
                      )}
                    >
                      <span className="p-3 border-r border-white/[0.08]">
                        <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-400">Pickup</span>
                        <span className={cn("block mt-1 text-sm", startDate ? "text-white" : "text-ink-500")}>{startDate ? formatDate(startDate) : "Add date"}</span>
                      </span>
                      <span className="p-3">
                        <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-400">Return</span>
                        <span className={cn("block mt-1 text-sm", endDate ? "text-white" : "text-ink-500")}>{endDate ? formatDate(endDate) : "Add date"}</span>
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {calendarOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: ease.out }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4">
                            <Calendar
                              mode="range"
                              accent="rental"
                              min={toISODate(new Date())}
                              value={{ start: startDate, end: endDate }}
                              onChange={({ start, end }) => {
                                setStartDate(start);
                                setEndDate(end);
                                if (start && end) setCalendarOpen(false);
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Availability */}
                  <div aria-live="polite">
                    {!startDate || !endDate ? (
                      <p className="text-[13px] text-ink-400 flex items-center gap-2">
                        <CalendarRange className="w-4 h-4" aria-hidden="true" />
                        Select a return date to check availability.
                      </p>
                    ) : checkingAvailability ? (
                      <p className="text-[13px] text-ink-300 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-300" aria-hidden="true" />
                        Checking availability…
                      </p>
                    ) : isAvailable ? (
                      <p className="text-[13px] text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        {availabilityMessage || "Available for your dates"}
                      </p>
                    ) : (
                      <p className="text-[13px] text-rose-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                        {availabilityMessage || "Those dates clash with another booking."}
                      </p>
                    )}
                  </div>

                  {/* Fulfilment */}
                  <div>
                    <p className="label">How do you want it?</p>
                    <div role="radiogroup" aria-label="Fulfilment" className="grid grid-cols-2 gap-2">
                      {item.pickup_available && (
                        <FulfilmentOption
                          active={!deliveryRequested}
                          onClick={() => setDeliveryRequested(false)}
                          icon={Store}
                          title="Self pickup"
                          sub="Free"
                        />
                      )}
                      {item.delivery_available && (
                        <FulfilmentOption
                          active={deliveryRequested}
                          onClick={() => setDeliveryRequested(true)}
                          icon={Truck}
                          title="Delivery"
                          sub={`+${formatINR(item.delivery_fee || 0)}`}
                        />
                      )}
                    </div>
                    <AnimatePresence initial={false} mode="wait">
                      {deliveryRequested ? (
                        <motion.div key="addr" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <Field label="Delivery address" required className="pt-3">
                            <Input
                              rental
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              placeholder="Flat, building, street, PIN code"
                            />
                          </Field>
                        </motion.div>
                      ) : (
                        <motion.p key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-3 text-[13px] text-ink-400 flex items-start gap-2">
                          <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                          {item.pickup_address || "Pickup address is shared once your rental is confirmed."}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Quantity */}
                  {item.quantity > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-ink-200">Quantity</p>
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-850 border border-white/[0.08]">
                        <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-200 hover:bg-white/[0.06] disabled:opacity-30">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-white tabular" aria-live="polite">{quantity}</span>
                        <button type="button" aria-label="Increase quantity" disabled={quantity >= item.quantity} onClick={() => setQuantity(Math.min(item.quantity, quantity + 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-200 hover:bg-white/[0.06] disabled:opacity-30">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <Field label="Notes for the host" hint="Optional — timing, handover or usage details.">
                    <Textarea
                      rental
                      rows={2}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Need it by 9 AM for a shoot"
                      className="min-h-[64px]"
                    />
                  </Field>

                  {/* Coupon */}
                  <Field label="Promo code">
                    <Input
                      rental
                      icon={Tag}
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. RENT10"
                      className="uppercase font-mono tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                    />
                  </Field>

                  {/* Breakdown */}
                  {(priceQuote || calculatingPrice) && (
                    <div className={cn("surface-inset p-4 transition-opacity", calculatingPrice && "opacity-60")} aria-busy={calculatingPrice}>
                      {priceQuote ? (
                        <>
                          <PriceBreakdown>
                            <PriceRow
                              key="rent"
                              label={`${formatINR(dailyRate)} × ${priceQuote.days} day${priceQuote.days > 1 ? "s" : ""}${priceQuote.quantity > 1 ? ` × ${priceQuote.quantity}` : ""}`}
                              value={priceQuote.subtotal}
                            />
                            {priceQuote.delivery_fee > 0 && <PriceRow key="del" label="Delivery fee" value={priceQuote.delivery_fee} />}
                            {priceQuote.discount_amount > 0 && <PriceRow key="disc" label="Promo discount" value={priceQuote.discount_amount} tone="discount" />}
                            <PriceRow key="dep" label="Refundable deposit" hint="Returned after inspection" value={priceQuote.security_deposit_amount} tone="deposit" icon={ShieldCheck} />
                          </PriceBreakdown>
                          <PriceTotal label="Pay now" caption="Includes refundable deposit" value={priceQuote.total_amount_charged} accent="rental" />
                        </>
                      ) : (
                        <div className="space-y-2.5">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      )}
                    </div>
                  )}

                  {formError && <Alert tone="error">{formError}</Alert>}

                  <Button
                    type="submit"
                    variant="rental"
                    size="lg"
                    fullWidth
                    icon={user ? undefined : LogIn}
                    iconRight={user ? ArrowRight : undefined}
                    loading={bookingInProgress}
                    loadingText="Starting secure checkout"
                    disabled={(startDate && endDate && !isAvailable) || calculatingPrice}
                  >
                    {user ? "Proceed to book & pay" : "Sign in to book"}
                  </Button>
                  <p className="text-xs text-ink-500 text-center flex items-center justify-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    Secure checkout by Razorpay. Deposit refunded after return.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </aside>
        </div>
      </div>

      {/* Mobile sticky price bar */}
      {!bookingSuccessData && (
        <div className="lg:hidden fixed inset-x-0 bottom-[63px] md:bottom-0 z-30 border-t border-white/[0.06] bg-surface-950/90 backdrop-blur-xl">
          <div className="container-page py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-white tabular">
                {priceQuote ? formatINR(priceQuote.total_amount_charged) : formatINR(dailyRate)}
                <span className="text-sm font-normal text-ink-400">{priceQuote ? " total" : " /day"}</span>
              </p>
              <p className="text-xs text-ink-400 truncate">
                {startDate && endDate ? `${formatDateShort(startDate)} → ${formatDateShort(endDate)}` : "Add your dates"}
              </p>
            </div>
            <Button
              variant="rental"
              onClick={() => document.getElementById("booking-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Reserve
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FulfilmentOption({ active, onClick, icon: Icon, title, sub }) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "p-3 rounded-xl border text-left transition-colors",
        active ? "bg-emerald-400/[0.08] border-emerald-400/50" : "bg-white/[0.02] border-white/[0.08] hover:border-white/20"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-emerald-300" : "text-ink-400")} aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-white">{title}</p>
      <p className="text-xs text-ink-400">{sub}</p>
    </motion.button>
  );
}

