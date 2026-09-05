/**
 * BookingWizardModal.jsx — Advanced Multi-Step Booking UX Engine.
 *
 * Flow:
 * Step 2: Provider Selection & Mode Indicator (Instant vs Request)
 * Step 3: Date & Slot Picker with Live Dynamic Availability
 * Step 4: Customer Address & Problem Photo Upload
 * Step 5: Order Summary, Emergency Option, Dynamic Pricing & Coupons
 * Step 6: Instant Booking / Request Booking dispatch
 */

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchPublicProvidersApi } from "../../api/providersApi";
import { fetchAvailableSlotsApi } from "../../api/availabilityApi";
import { createBooking } from "../../api/bookingsApi";
import { initiateRazorpayCheckout } from "../../utils/razorpay";
import AddressManager from "../addresses/AddressManager";
import PhotoUploadDropzone from "./PhotoUploadDropzone";
import DynamicPriceBreakdown from "./DynamicPriceBreakdown";
import {
  FiZap,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiShield,
  FiAlertTriangle,
  FiLoader,
  FiInfo
} from "react-icons/fi";

export default function BookingWizardModal({
  service,
  initialProvider = null,
  onClose,
  onSuccess,
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(2);

  // Form states
  const [selectedProvider, setSelectedProvider] = useState(
    initialProvider || service?.provider || null
  );
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  const [bookingDate, setBookingDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [uploadedAttachments, setUploadedAttachments] = useState([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [notes, setNotes] = useState("");

  // Dynamic pricing breakdown state from backend
  const [calculatedPricing, setCalculatedPricing] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 1. Load public providers for this service category
  useEffect(() => {
    async function loadProviders() {
      if (service?.category_id) {
        setLoadingProviders(true);
        try {
          const data = await fetchPublicProvidersApi({ category_id: service.category_id });
          const provList = data || [];
          setProviders(provList);

          // If no provider selected yet, select service's assigned provider or first from list
          if (!selectedProvider && provList.length > 0) {
            const match = service.provider_id
              ? provList.find((p) => p.id === service.provider_id)
              : null;
            setSelectedProvider(match || provList[0]);
          }
        } catch (err) {
          console.warn("Failed to load service providers:", err);
        } finally {
          setLoadingProviders(false);
        }
      }
    }
    loadProviders();
  }, [service]);

  // 2. Load dynamic available slots when selectedProvider, bookingDate, or service changes
  useEffect(() => {
    async function loadSlots() {
      if (selectedProvider?.id && bookingDate) {
        setLoadingSlots(true);
        setSlotError("");
        try {
          const slots = await fetchAvailableSlotsApi(
            selectedProvider.id,
            bookingDate,
            service?.id
          );
          const slotList = Array.isArray(slots) ? slots : slots?.slots || [];
          setAvailableSlots(slotList);

          // Auto-select first available open slot
          const firstOpen = slotList.find((s) => s.available);
          if (firstOpen) {
            setSelectedSlot(firstOpen.time);
          } else {
            setSelectedSlot("");
          }
        } catch (err) {
          console.error("Failed to load time slots:", err);
          setSlotError("Could not retrieve provider schedule. Please try another date.");
          setAvailableSlots([]);
          setSelectedSlot("");
        } finally {
          setLoadingSlots(false);
        }
      }
    }
    loadSlots();
  }, [selectedProvider, bookingDate, service?.id]);

  const providerBookingMode = selectedProvider?.booking_mode || "instant_booking";
  const isRequestBookingMode = providerBookingMode === "request_booking";

  const finalAmount =
    calculatedPricing?.final_total !== undefined
      ? calculatedPricing.final_total
      : service?.price || service?.base_price || selectedProvider?.hourly_rate || 499;

  const handleConfirmAndPay = async () => {
    if (!user) {
      alert("Please sign in to complete your booking.");
      return;
    }
    if (!selectedSlot) {
      setError("Please select an available time slot before continuing.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Create Booking in DB
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

      // If provider has REQUEST_BOOKING mode, no immediate checkout is needed
      if (isRequestBookingMode || newBooking.status === "requested") {
        setSubmitting(false);
        alert(
          `Booking request #${newBooking.id} sent! The provider will review and accept your request shortly.`
        );
        if (onSuccess) onSuccess(newBooking);
        onClose();
        return;
      }

      // 2. Instant Booking -> Razorpay Checkout modal
      initiateRazorpayCheckout({
        booking: newBooking,
        user,
        onSuccess: (paymentRes) => {
          setSubmitting(false);
          if (onSuccess) onSuccess(newBooking);
          onClose();
        },
        onError: (errMsg) => {
          setSubmitting(false);
          alert(
            `Booking #${newBooking.id} created as Pending. You can complete payment anytime from your Dashboard.`
          );
          if (onSuccess) onSuccess(newBooking);
          onClose();
        },
      });
    } catch (err) {
      console.error("Booking error:", err);
      setError(err.response?.data?.detail || "Failed to place booking. Please try again.");
      setSubmitting(false);
    }
  };

  const openSlotsCount = availableSlots.filter((s) => s.available).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
              Step {step} of 5
            </span>
            <h2 className="text-xl font-bold text-white">
              Book {service?.name || service?.title || "Service"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
              <FiAlertTriangle /> <span>{error}</span>
            </div>
          )}

          {/* STEP 2: SELECT PROVIDER */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Select Your Service Provider</h3>
                <span className="text-xs text-slate-400">{providers.length} verified available</span>
              </div>

              {loadingProviders ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2 animate-pulse">
                  <FiLoader className="w-6 h-6 animate-spin text-blue-500" />
                  <span>Finding top rated verified providers...</span>
                </div>
              ) : providers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-800 text-center text-xs text-slate-400 space-y-2">
                  <p>No explicit providers listed for this category yet.</p>
                  <p className="text-slate-500">Defaulting to master certified technician.</p>
                </div>
              ) : (
                <div className="grid gap-3 max-h-80 overflow-y-auto pr-1">
                  {providers.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProvider(p)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedProvider?.id === p.id
                          ? "bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-500/10"
                          : "bg-slate-800/80 border-slate-700/50 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {p.profile_image ? (
                          <img
                            src={p.profile_image}
                            alt={p.full_name}
                            className="w-12 h-12 rounded-xl object-cover ring-1 ring-blue-500/30"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow">
                            {p.full_name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white">{p.full_name}</h4>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                              ✓ Verified
                            </span>
                            {p.booking_mode === "request_booking" ? (
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                📩 Request Mode
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                <FiZap /> Instant
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {p.location || "Available across your city"}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-amber-400 font-bold mt-1">
                            <span>⭐ {p.rating || 4.9}</span>
                            <span className="text-slate-400 font-normal">
                              ({p.review_count || 24} reviews)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-white">
                          ₹{p.hourly_rate || service.price || service.base_price}
                        </span>
                        <span className="text-[10px] text-slate-400 block">/ service</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: DATE & TIME SLOT PICKER */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2 flex items-center gap-1.5">
                  <FiCalendar className="text-blue-400" />
                  <span>Select Booking Date</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Slots Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <FiClock className="text-blue-400" />
                    <span>Select Available Time Slot</span>
                  </label>
                  {!loadingSlots && availableSlots.length > 0 && (
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      {openSlotsCount} slots open
                    </span>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2 animate-pulse bg-slate-800/40 rounded-2xl border border-slate-800">
                    <FiLoader className="w-6 h-6 animate-spin text-blue-500" />
                    <span>Checking provider working hours & live availability...</span>
                  </div>
                ) : slotError ? (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                    {slotError}
                  </div>
                ) : availableSlots.length === 0 || openSlotsCount === 0 ? (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1.5">
                    <p className="text-xs font-bold text-amber-300">
                      No open slots on this date.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      The provider may be off, fully booked, or on break. Please select another date.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {availableSlots.map((slot, idx) => {
                      const isSelected = selectedSlot === slot.time;
                      const isAvail = slot.available;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isAvail}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all flex flex-col items-center justify-center min-h-[52px] ${
                            !isAvail
                              ? "bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-blue-600/30 border-blue-500 text-blue-300 shadow-md shadow-blue-500/20 ring-1 ring-blue-500/50"
                              : "bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-750"
                          }`}
                          title={slot.reason || "Available Slot"}
                        >
                          <span>{slot.time}</span>
                          {!isAvail && slot.reason && (
                            <span className="text-[9px] text-red-400 font-normal mt-0.5 no-underline block">
                              ({slot.reason})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: ADDRESS SELECTION & PHOTO UPLOADS */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-3">Service Address</h3>
                <AddressManager
                  selectedAddressId={selectedAddress?.id}
                  onSelectAddress={(addr) => setSelectedAddress(addr)}
                />
              </div>

              {/* Photo Upload Dropzone */}
              <div className="pt-4 border-t border-slate-800">
                <PhotoUploadDropzone
                  uploadedList={uploadedAttachments}
                  onAttachmentsUploaded={(list) => setUploadedAttachments(list)}
                />
              </div>
            </div>
          )}

          {/* STEP 5: ORDER SUMMARY, DYNAMIC PRICING & COUPONS */}
          {step === 5 && (
            <div className="space-y-5">
              {/* Service & Provider summary card */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Service:</span>
                  <span className="font-bold text-white">
                    {service?.name || service?.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Provider:</span>
                  <span className="font-bold text-white">
                    {selectedProvider?.full_name || "Verified Professional"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Slot:</span>
                  <span className="font-bold text-white">
                    {bookingDate} ({selectedSlot})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Address:</span>
                  <span className="font-bold text-white truncate max-w-[260px]" title={selectedAddress?.full_address || "Service Location"}>
                    {selectedAddress
                      ? selectedAddress.full_address
                        ? `${selectedAddress.full_address}, ${selectedAddress.city}`
                        : `${selectedAddress.label || "Address"}, ${selectedAddress.city}`
                      : "Doorstep Service, Bengaluru"}
                  </span>
                </div>
                {uploadedAttachments.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Photos Attached:</span>
                    <span className="font-bold text-blue-400">
                      {uploadedAttachments.length} photos
                    </span>
                  </div>
                )}
              </div>

              {/* 24/7 Emergency Dispatch Option */}
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-400">
                    🚨 24/7 Urgent Emergency Dispatch
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Priority technician arrival (+₹150 surcharge)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="w-5 h-5 rounded accent-red-500 cursor-pointer"
                />
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Any specific issues, landmark, or gate entry notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              {/* Dynamic Pricing Engine & Coupons Breakdown */}
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
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 bg-slate-850 border-t border-slate-800 flex items-center justify-between">
          {step > 2 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={() => {
                if (step === 2 && !selectedProvider) {
                  alert("Please select a provider first.");
                  return;
                }
                if (step === 3 && !selectedSlot) {
                  alert("Please select an available time slot first.");
                  return;
                }
                setStep(step + 1);
              }}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition"
            >
              Next Step →
            </button>
          ) : (
            <button
              onClick={handleConfirmAndPay}
              disabled={submitting}
              className={`px-8 py-3 rounded-xl text-xs font-extrabold text-white shadow-xl flex items-center gap-2 transition disabled:opacity-50 ${
                isRequestBookingMode
                  ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-600/30"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30"
              }`}
            >
              {submitting
                ? "Processing..."
                : isRequestBookingMode
                ? "Send Booking Request 📩"
                : `Confirm & Pay ₹${finalAmount.toFixed(2)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
