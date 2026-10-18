/**
 * BookingWizardModal — five-step service booking.
 * Service → Professional → Date & time → Address & details → Review & pay.
 *
 * Booking creation, provider/slot loading, dynamic pricing and Razorpay
 * checkout are unchanged; only presentation and feedback are new
 * (inline validation and an in-modal confirmation instead of alerts).
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Star,
  Zap,
  Send,
  Siren,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  UserCheck,
  ClipboardList,
  CreditCard,
  ImageIcon,
  LogIn,
  CheckCircle2,
  Hourglass,
  Sun,
  Sunset,
  Moon,
  Users,
  Pencil,
  RefreshCw,
  Briefcase,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fetchPublicProvidersApi } from "../../api/providersApi";
import { fetchAvailableSlotsApi } from "../../api/availabilityApi";
import { createBooking } from "../../api/bookingsApi";
import { initiateRazorpayCheckout } from "../../utils/razorpay";
import AddressManager from "../addresses/AddressManager";
import PhotoUploadDropzone from "./PhotoUploadDropzone";
import DynamicPriceBreakdown from "./DynamicPriceBreakdown";
import {
  Modal,
  Button,
  ProgressStepper,
  Calendar,
  Avatar,
  Rating,
  VerifiedBadge,
  Alert,
  Skeleton,
  Switch,
  Field,
  Textarea,
  Badge,
  cn,
} from "../ui";
import { serviceVisual } from "../../lib/visuals";
import { formatINR, formatINRPrecise, formatDuration, formatWeekday, toISODate, getErrorMessage } from "../../lib/format";
import { ease } from "../../lib/motion";

const STEPS = [
  { label: "Service", icon: Sparkles },
  { label: "Professional", icon: UserCheck },
  { label: "Date & time", icon: CalendarDays },
  { label: "Details", icon: ClipboardList },
  { label: "Review & pay", icon: CreditCard },
];

const slotPeriod = (slot) => {
  const h = Number((slot.start_time || "").split(":")[0]);
  if (Number.isNaN(h)) return "Available slots";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
};
const PERIOD_ICON = { Morning: Sun, Afternoon: Sunset, Evening: Moon };

export default function BookingWizardModal({ service, initialProvider = null, onClose, onSuccess, onBooked }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Form states
  const [selectedProvider, setSelectedProvider] = useState(initialProvider || service?.provider || null);
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providersError, setProvidersError] = useState("");

  const [bookingDate, setBookingDate] = useState(toISODate(Date.now() + 86400000));
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [slotReload, setSlotReload] = useState(0);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [uploadedAttachments, setUploadedAttachments] = useState([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [notes, setNotes] = useState("");

  const [calculatedPricing, setCalculatedPricing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const bodyRef = useRef(null);

  // Each step (and the confirmation) starts at the top of the scroll area.
  useEffect(() => {
    bodyRef.current?.closest(".overflow-y-auto")?.scrollTo({ top: 0, behavior: "instant" });
  }, [step, result]);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };

  // 1. Load public providers for this service category
  useEffect(() => {
    async function loadProviders() {
      if (service?.category_id) {
        setLoadingProviders(true);
        setProvidersError("");
        try {
          const data = await fetchPublicProvidersApi({ category_id: service.category_id });
          const provList = data || [];
          setProviders(provList);

          if (!selectedProvider && provList.length > 0) {
            const match = service.provider_id ? provList.find((p) => p.id === service.provider_id) : null;
            setSelectedProvider(match || provList[0]);
          }
        } catch (err) {
          console.warn("Failed to load service providers:", err);
          setProvidersError(getErrorMessage(err, "We couldn't load professionals for this service."));
        } finally {
          setLoadingProviders(false);
        }
      }
    }
    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  // 2. Load available slots when provider, date or service changes
  useEffect(() => {
    async function loadSlots() {
      if (selectedProvider?.id && bookingDate) {
        setLoadingSlots(true);
        setSlotError("");
        try {
          const slots = await fetchAvailableSlotsApi(selectedProvider.id, bookingDate, service?.id);
          const slotList = Array.isArray(slots) ? slots : slots?.slots || [];
          setAvailableSlots(slotList);

          const firstOpen = slotList.find((s) => s.available);
          setSelectedSlot(firstOpen ? firstOpen.time : "");
        } catch (err) {
          console.error("Failed to load time slots:", err);
          setSlotError("We couldn't load this professional's schedule. Try another date or retry.");
          setAvailableSlots([]);
          setSelectedSlot("");
        } finally {
          setLoadingSlots(false);
        }
      }
    }
    loadSlots();
  }, [selectedProvider, bookingDate, service?.id, slotReload]);

  const providerBookingMode = selectedProvider?.booking_mode || "instant_booking";
  const isRequestBookingMode = providerBookingMode === "request_booking";
  const basePrice = service?.price || service?.base_price || selectedProvider?.hourly_rate || 499;

  const finalAmount = calculatedPricing?.final_total !== undefined ? calculatedPricing.final_total : basePrice;

  const handleConfirmAndPay = async () => {
    if (!user) {
      setError("Sign in to complete your booking — your selections will be waiting.");
      return;
    }
    if (!selectedSlot) {
      setError("Please select an available time slot before continuing.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const bookingPayload = {
        service_id: service.id,
        provider_id: selectedProvider?.id || service.provider_id,
        address_id: selectedAddress?.id || null,
        booking_date: `${bookingDate}T00:00:00Z`,
        time_slot: selectedSlot,
        notes: notes.trim() || null,
        is_emergency: isEmergency,
        coupon_code: calculatedPricing?.coupon_code || null,
        apply_referral_credits: (calculatedPricing?.referral_discount || 0) > 0,
        attachment_ids: uploadedAttachments.map((a) => a.id),
      };

      const newBooking = await createBooking(bookingPayload);
      onBooked?.(newBooking);

      if (isRequestBookingMode || newBooking.status === "requested") {
        setSubmitting(false);
        setResult({ booking: newBooking, kind: "requested" });
        return;
      }

      // Instant Booking -> Razorpay Checkout modal
      initiateRazorpayCheckout({
        booking: newBooking,
        user,
        onSuccess: () => {
          setSubmitting(false);
          setResult({ booking: newBooking, kind: "paid" });
          onBooked?.(newBooking);
        },
        onError: (errMsg) => {
          setSubmitting(false);
          setResult({ booking: newBooking, kind: "pending", message: errMsg });
        },
      });
    } catch (err) {
      console.error("Booking error:", err);
      setError(getErrorMessage(err, "Failed to place booking. Please try again."));
      setSubmitting(false);
    }
  };

  const goTo = (next) => {
    setError("");
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const handleContinue = () => {
    if (step === 2 && !selectedProvider) {
      setError("Choose a professional to continue.");
      return;
    }
    if (step === 3 && !selectedSlot) {
      setError("Pick an available time slot to continue.");
      return;
    }
    goTo(step + 1);
  };

  const finish = () => {
    onSuccess?.(result?.booking);
    close();
  };

  const visual = serviceVisual(service?.category);
  const title = service?.name || service?.title || "Book service";

  return (
    <Modal
      open={visible}
      onClose={close}
      size="2xl"
      eyebrow={result ? "Booking" : `Step ${step} of ${STEPS.length} · ${STEPS[step - 1].label}`}
      title={result ? (result.kind === "pending" ? "Almost there" : "All set") : title}
      dismissible={!submitting}
      subheader={
        !result && (
          <ProgressStepper steps={STEPS} current={step - 1} onStepClick={(i) => goTo(i + 1)} className="pt-1" />
        )
      }
      bodyClassName="pt-6"
      footer={
        result ? (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Done
            </Button>
            <Button onClick={finish} iconRight={ArrowRight}>
              View my bookings
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {step > 1 ? (
              <Button variant="ghost" icon={ArrowLeft} onClick={() => goTo(step - 1)} disabled={submitting}>
                <span className="hidden sm:inline">Back</span>
              </Button>
            ) : (
              <span />
            )}
            <div className="ml-auto flex items-center gap-4">
              <div className="text-right lg:hidden">
                <p className="text-[11px] text-ink-400">{step === 5 && calculatedPricing ? "Total" : "From"}</p>
                <p className="text-base font-semibold text-white tabular">
                  {step === 5 && calculatedPricing ? formatINRPrecise(finalAmount) : formatINR(basePrice)}
                </p>
              </div>
              {step < 5 ? (
                <Button onClick={handleContinue} iconRight={ArrowRight}>
                  Continue
                </Button>
              ) : !user ? (
                <Button icon={LogIn} onClick={() => navigate("/login", { state: { from: location } })}>
                  Sign in to book
                </Button>
              ) : (
                <Button
                  onClick={handleConfirmAndPay}
                  loading={submitting}
                  loadingText="Processing"
                  icon={isRequestBookingMode ? Send : ShieldCheck}
                  className={isRequestBookingMode ? "!bg-amber-500 hover:!bg-amber-400 !text-surface-950" : ""}
                >
                  {isRequestBookingMode ? "Send request" : `Pay ${formatINRPrecise(finalAmount)}`}
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      <span ref={bodyRef} aria-hidden="true" />
      {result ? (
        <BookingResult result={result} service={service} provider={selectedProvider} date={bookingDate} slot={selectedSlot} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction * 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -28 }}
                transition={{ duration: 0.3, ease: ease.out }}
                className="space-y-6"
              >
                {error && <Alert tone="error">{error}</Alert>}

                {/* STEP 1: SERVICE */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07]">
                      <img src={visual.image} alt="" className="w-full h-40 sm:h-48 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/40 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                        <Badge tone="neutral" className="bg-surface-950/70 backdrop-blur-md">
                          {service?.category?.name || "Doorstep service"}
                        </Badge>
                        <span className="h-6 px-2 rounded-md bg-surface-950/70 backdrop-blur-md inline-flex items-center">
                          <Rating value={service?.rating} count={service?.review_count} />
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{title}</h3>
                      <p className="mt-2 text-sm text-ink-300 leading-relaxed">{service?.description}</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-3">
                      <div className="surface-inset p-4">
                        <dt className="text-xs text-ink-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Duration
                        </dt>
                        <dd className="mt-1 text-base font-semibold text-white">{formatDuration(service?.duration_minutes || 60)}</dd>
                      </div>
                      <div className="surface-inset p-4">
                        <dt className="text-xs text-ink-400">Starting price</dt>
                        <dd className="mt-1 text-base font-semibold text-white tabular">{formatINR(basePrice)}</dd>
                      </div>
                    </dl>
                    <ul className="space-y-2.5 text-sm text-ink-300">
                      {[
                        "Verified, background-checked professional",
                        "30-day re-work protection on the job",
                        "Pay securely — final price shown before you pay",
                      ].map((t) => (
                        <li key={t} className="flex items-start gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* STEP 2: PROFESSIONAL */}
                {step === 2 && (
                  <div>
                    <div className="flex items-end justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Choose your professional</h3>
                        <p className="text-sm text-ink-400 mt-0.5">All professionals are identity-verified.</p>
                      </div>
                      {!loadingProviders && providers.length > 0 && (
                        <span className="text-xs text-ink-400 flex items-center gap-1.5 shrink-0">
                          <Users className="w-3.5 h-3.5" aria-hidden="true" />
                          {providers.length} available
                        </span>
                      )}
                    </div>

                    {loadingProviders ? (
                      <div className="space-y-3">
                        {[0, 1, 2].map((i) => (
                          <Skeleton key={i} className="h-[92px] rounded-2xl" />
                        ))}
                      </div>
                    ) : providersError ? (
                      <Alert tone="error">{providersError}</Alert>
                    ) : providers.length === 0 ? (
                      <div className="surface-inset p-6 text-center">
                        <p className="text-sm font-medium text-white">
                          {selectedProvider ? `${selectedProvider.full_name} will handle this booking` : "No professionals listed yet"}
                        </p>
                        <p className="text-[13px] text-ink-400 mt-1">
                          {selectedProvider ? "This service is offered directly by its provider." : "Please try another service in this category."}
                        </p>
                      </div>
                    ) : (
                      <div role="radiogroup" aria-label="Professionals" className="space-y-2.5 max-h-[420px] overflow-y-auto -mx-1 px-1 py-1">
                        {providers.map((p, i) => {
                          const selected = selectedProvider?.id === p.id;
                          const instant = p.booking_mode !== "request_booking";
                          return (
                            <motion.button
                              key={p.id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setSelectedProvider(p)}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.3, ease: ease.out }}
                              whileTap={{ scale: 0.995 }}
                              className={cn(
                                "w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-colors duration-200",
                                selected
                                  ? "bg-primary-500/[0.08] border-primary-400/50 shadow-[0_0_0_1px_rgb(139_135_248/0.2)]"
                                  : "bg-white/[0.02] border-white/[0.07] hover:border-white/15"
                              )}
                            >
                              <Avatar src={p.profile_image} name={p.full_name} size="lg" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[15px] font-semibold text-white truncate">{p.full_name}</span>
                                  <VerifiedBadge iconOnly />
                                  <Badge size="sm" tone={instant ? "emerald" : "amber"} icon={instant ? Zap : Send}>
                                    {instant ? "Instant" : "On request"}
                                  </Badge>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-400">
                                  <Rating value={p.rating} count={p.review_count} />
                                  {p.experience_years ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
                                      {p.experience_years} yrs
                                    </span>
                                  ) : null}
                                  <span className="inline-flex items-center gap-1 min-w-0">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                    <span className="truncate">{p.location || "Across the city"}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-base font-semibold text-white tabular">
                                  {formatINR(p.hourly_rate || service.price || service.base_price || 499)}
                                </p>
                                <p className="text-[11px] text-ink-500">per service</p>
                              </div>
                              <span
                                className={cn(
                                  "hidden sm:flex w-5 h-5 rounded-full border-2 items-center justify-center shrink-0 transition-colors",
                                  selected ? "border-primary-400 bg-primary-500" : "border-white/20"
                                )}
                                aria-hidden="true"
                              >
                                {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: DATE & TIME */}
                {step === 3 && (
                  <div className="grid gap-6 md:grid-cols-[minmax(0,288px)_1fr]">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-primary-300" aria-hidden="true" />
                        Pick a date
                      </h3>
                      <div className="surface-inset p-3">
                        <Calendar value={bookingDate} onChange={setBookingDate} min={toISODate(new Date())} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary-300" aria-hidden="true" />
                          {formatWeekday(bookingDate)}
                        </h3>
                        {!loadingSlots && !slotError && availableSlots.length > 0 && (
                          <span className="text-xs text-emerald-300">
                            {availableSlots.filter((s) => s.available).length} open
                          </span>
                        )}
                      </div>
                      <SlotPicker
                        loading={loadingSlots}
                        error={slotError}
                        slots={availableSlots}
                        selected={selectedSlot}
                        onSelect={(t) => {
                          setSelectedSlot(t);
                          setError("");
                        }}
                        onRetry={() => setSlotReload((n) => n + 1)}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 4: ADDRESS & REQUIREMENTS */}
                {step === 4 && (
                  <div className="space-y-6">
                    {user ? (
                      <AddressManager
                        embedded
                        selectedAddressId={selectedAddress?.id}
                        onSelectAddress={(addr) => setSelectedAddress(addr)}
                      />
                    ) : (
                      <SignInPrompt onSignIn={() => navigate("/login", { state: { from: location } })} />
                    )}
                    <Field label="Notes for your professional" hint="Gate code, landmark, or details about the problem.">
                      <Textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Second floor, ring the bell twice. Kitchen tap leaks under the sink."
                      />
                    </Field>
                    {user && (
                      <PhotoUploadDropzone uploadedList={uploadedAttachments} onAttachmentsUploaded={(list) => setUploadedAttachments(list)} />
                    )}
                  </div>
                )}

                {/* STEP 5: REVIEW & PAY */}
                {step === 5 && (
                  <div className="space-y-6">
                    <div className="surface-inset divide-y divide-white/[0.05]">
                      <ReviewRow icon={Sparkles} label="Service" value={title} onEdit={() => goTo(1)} />
                      <ReviewRow icon={UserCheck} label="Professional" value={selectedProvider?.full_name || "Verified professional"} onEdit={() => goTo(2)} />
                      <ReviewRow icon={CalendarDays} label="When" value={`${formatWeekday(bookingDate)} · ${selectedSlot}`} onEdit={() => goTo(3)} />
                      <ReviewRow
                        icon={MapPin}
                        label="Where"
                        value={
                          selectedAddress
                            ? selectedAddress.full_address
                              ? `${selectedAddress.full_address}, ${selectedAddress.city}`
                              : `${selectedAddress.label || "Address"}, ${selectedAddress.city}`
                            : "Add an address in the previous step"
                        }
                        onEdit={() => goTo(4)}
                      />
                      {uploadedAttachments.length > 0 && (
                        <ReviewRow icon={ImageIcon} label="Photos" value={`${uploadedAttachments.length} attached`} onEdit={() => goTo(4)} />
                      )}
                    </div>

                    <div
                      className={cn(
                        "p-4 rounded-2xl border transition-colors",
                        isEmergency ? "bg-rose-500/[0.06] border-rose-400/30" : "bg-white/[0.02] border-white/[0.07]"
                      )}
                    >
                      <Switch
                        checked={isEmergency}
                        onChange={setIsEmergency}
                        tone="danger"
                        label={
                          <span className="flex items-center gap-2">
                            <Siren className="w-4 h-4 text-rose-300" aria-hidden="true" />
                            Emergency priority dispatch
                          </span>
                        }
                        description="Priority arrival for urgent jobs. A surcharge is added to the total."
                      />
                    </div>

                    {isRequestBookingMode && (
                      <Alert tone="warning" title="This professional accepts bookings on request">
                        They'll confirm your slot first. You won't be charged until they accept.
                      </Alert>
                    )}

                    <DynamicPriceBreakdown
                      serviceId={service.id}
                      providerId={selectedProvider?.id}
                      bookingDate={bookingDate}
                      timeSlot={selectedSlot}
                      isEmergency={isEmergency}
                      customerLat={selectedAddress?.latitude}
                      customerLng={selectedAddress?.longitude}
                      onPriceCalculated={(breakdown) => setCalculatedPricing(breakdown)}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sticky summary (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-0 space-y-4">
              <div className="surface-raised p-5">
                <p className="text-xs font-medium text-ink-400 uppercase tracking-wider">Booking summary</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", visual.toneClasses.bg)}>
                    <visual.icon className={cn("w-5 h-5", visual.toneClasses.icon)} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{title}</p>
                    <p className="text-xs text-ink-400">{formatDuration(service?.duration_minutes || 60)}</p>
                  </div>
                </div>
                <dl className="mt-5 space-y-3.5 text-sm">
                  <SummaryItem label="Professional" done={!!selectedProvider}>
                    {selectedProvider ? (
                      <span className="flex items-center gap-2">
                        <Avatar src={selectedProvider.profile_image} name={selectedProvider.full_name} size="xs" />
                        <span className="truncate">{selectedProvider.full_name}</span>
                      </span>
                    ) : (
                      "Not selected"
                    )}
                  </SummaryItem>
                  <SummaryItem label="Date & time" done={!!selectedSlot}>
                    {selectedSlot ? (
                      <>
                        {formatWeekday(bookingDate)}
                        <span className="block text-xs text-ink-400">{selectedSlot}</span>
                      </>
                    ) : (
                      "Not selected"
                    )}
                  </SummaryItem>
                  <SummaryItem label="Address" done={!!selectedAddress}>
                    {selectedAddress ? <span className="line-clamp-2">{selectedAddress.full_address || selectedAddress.label}</span> : "Not selected"}
                  </SummaryItem>
                </dl>
                <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-end justify-between">
                  <span className="text-sm text-ink-300">{step === 5 && calculatedPricing ? "Total" : "Starts at"}</span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={step === 5 && calculatedPricing ? finalAmount : basePrice}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="text-xl font-semibold text-white tabular font-heading"
                    >
                      {step === 5 && calculatedPricing ? formatINRPrecise(finalAmount) : formatINR(basePrice)}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
              <p className="text-xs text-ink-500 flex items-start gap-2 px-1">
                <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
                Payments are processed securely by Razorpay. You always see the final price before you pay.
              </p>
            </div>
          </aside>
        </div>
      )}
    </Modal>
  );
}

/* ───────────────────────── Pieces ───────────────────────── */

function SummaryItem({ label, done, children }) {
  return (
    <div className="flex gap-3">
      <span
        className={cn("mt-1 w-2 h-2 rounded-full shrink-0 transition-colors", done ? "bg-emerald-400" : "bg-white/15")}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className={cn("mt-0.5", done ? "text-ink-100" : "text-ink-500")}>{children}</dd>
      </div>
    </div>
  );
}

function ReviewRow({ icon: Icon, label, value, onEdit }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <Icon className="w-4 h-4 text-ink-400 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-sm text-white mt-0.5 break-words">{value}</p>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-300 hover:text-primary-200 shrink-0"
          aria-label={`Edit ${label.toLowerCase()}`}
        >
          <Pencil className="w-3 h-3" aria-hidden="true" />
          Edit
        </button>
      )}
    </div>
  );
}

function SignInPrompt({ onSignIn }) {
  return (
    <div className="surface-inset p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="w-10 h-10 rounded-xl bg-primary-500/12 text-primary-300 flex items-center justify-center shrink-0">
        <LogIn className="w-5 h-5" aria-hidden="true" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">Sign in to add your address</p>
        <p className="text-[13px] text-ink-400 mt-0.5">We'll keep your service, professional and time slot selected.</p>
      </div>
      <Button size="sm" onClick={onSignIn}>
        Sign in
      </Button>
    </div>
  );
}

function SlotPicker({ loading, error, slots, selected, onSelect, onRetry }) {
  const groups = useMemo(() => {
    const g = {};
    slots.forEach((s) => {
      const p = slotPeriod(s);
      (g[p] = g[p] || []).push(s);
    });
    return Object.entries(g);
  }, [slots]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="status" aria-label="Loading time slots">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Alert tone="error" action={<Button size="xs" variant="secondary" icon={RefreshCw} onClick={onRetry}>Retry</Button>}>
        {error}
      </Alert>
    );
  }
  const open = slots.filter((s) => s.available).length;
  if (!slots.length || !open) {
    return (
      <div className="surface-inset p-6 text-center">
        <Hourglass className="w-5 h-5 mx-auto text-amber-300" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-white">No open slots on this day</p>
        <p className="text-[13px] text-ink-400 mt-1">The professional is fully booked or off. Try another date.</p>
      </div>
    );
  }
  return (
    <div className="space-y-5 max-h-[360px] overflow-y-auto pr-1 -mr-1">
      {groups.map(([period, list]) => {
        const PIcon = PERIOD_ICON[period] || Clock;
        return (
          <div key={period}>
            <p className="text-xs font-medium text-ink-400 mb-2 flex items-center gap-1.5">
              <PIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {period}
            </p>
            <div role="radiogroup" aria-label={`${period} slots`} className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
              {list.map((slot, i) => {
                const isSelected = selected === slot.time;
                const avail = slot.available;
                return (
                  <motion.button
                    key={slot.time}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!avail}
                    title={!avail && slot.reason ? slot.reason : undefined}
                    onClick={() => onSelect(slot.time)}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.025, duration: 0.2 }}
                    whileTap={avail ? { scale: 0.95 } : undefined}
                    className={cn(
                      "relative h-11 px-2 rounded-xl border text-[13px] font-medium tabular whitespace-nowrap transition-colors duration-150",
                      !avail
                        ? "border-transparent bg-white/[0.015] text-ink-500/60 line-through cursor-not-allowed"
                        : isSelected
                        ? "border-primary-400 bg-primary-500 text-white shadow-[0_8px_20px_-10px_rgb(97_80_226/0.9)]"
                        : "border-white/[0.08] bg-white/[0.02] text-ink-100 hover:border-white/20 hover:bg-white/[0.05]"
                    )}
                  >
                    {slot.start_time && slot.time.includes(" - ") ? slot.time.split(" - ")[0] : slot.time}
                    {!avail && slot.reason && <span className="sr-only"> — {slot.reason}</span>}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Result ───────────────────────── */

function BookingResult({ result, service, provider, date, slot }) {
  const meta = {
    paid: {
      icon: CheckCircle2,
      tone: "text-emerald-300 bg-emerald-500/12",
      ring: "bg-emerald-400/20",
      title: "Booking confirmed",
      desc: "Payment received. Your professional has been notified and you can track the job live from your dashboard.",
    },
    requested: {
      icon: Send,
      tone: "text-amber-300 bg-amber-500/12",
      ring: "bg-amber-400/20",
      title: "Request sent",
      desc: "The professional will review your request shortly. You'll be notified as soon as they accept.",
    },
    pending: {
      icon: Hourglass,
      tone: "text-amber-300 bg-amber-500/12",
      ring: "bg-amber-400/20",
      title: "Booking saved — payment pending",
      desc: "Your booking was created, but payment wasn't completed. You can pay any time from your dashboard.",
    },
  }[result.kind];
  const Icon = meta.icon;
  return (
    <div className="max-w-lg mx-auto text-center py-4">
      <div className="relative w-20 h-20 mx-auto">
        <motion.span
          className={cn("absolute inset-0 rounded-full", meta.ring)}
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut", repeat: 1 }}
        />
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className={cn("relative w-20 h-20 rounded-full flex items-center justify-center", meta.tone)}
        >
          <Icon className="w-9 h-9" aria-hidden="true" />
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
        <h3 className="mt-6 text-2xl font-semibold text-white">{meta.title}</h3>
        <p className="mt-2 text-sm text-ink-400 leading-relaxed">{meta.desc}</p>
        {result.kind === "pending" && result.message && <p className="mt-2 text-xs text-ink-500">{result.message}</p>}
      </motion.div>
      <motion.dl
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="mt-7 surface-inset text-left divide-y divide-white/[0.05]"
      >
        {[
          ["Booking ID", `#${result.booking.id}`],
          ["Service", service?.title || service?.name],
          ["Professional", provider?.full_name || "Verified professional"],
          ["When", `${formatWeekday(date)} · ${slot}`],
          ["Amount", formatINRPrecise(result.booking.total_amount ?? 0)],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-[13px] text-ink-400">{k}</dt>
            <dd className="text-sm font-medium text-white text-right truncate">{v}</dd>
          </div>
        ))}
      </motion.dl>
      <p className="mt-5 text-xs text-ink-500 flex items-center justify-center gap-1.5">
        <Star className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
        You can rate your professional after the job is completed.
      </p>
    </div>
  );
}
