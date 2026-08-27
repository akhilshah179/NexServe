/**
 * BookingWizardModal.jsx — Step-by-Step Booking UX Engine.
 *
 * Flow:
 * Step 1: Service Summary
 * Step 2: Provider Selection
 * Step 3: Date & Slot Picker
 * Step 4: Customer Address Selection
 * Step 5: Order Summary & Emergency Option
 * Step 6: Razorpay Payment & PostgreSQL Booking Creation
 */

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchPublicProvidersApi } from "../../api/providersApi";
import { fetchAvailableSlotsApi } from "../../api/availabilityApi";
import { createBooking } from "../../api/bookingsApi";
import { initiateRazorpayCheckout } from "../../utils/razorpay";
import AddressManager from "../addresses/AddressManager";

export default function BookingWizardModal({ service, initialProvider = null, onClose, onSuccess }) {
  const { user } = useAuth();
  const [step, setStep] = useState(initialProvider ? 3 : 2);

  // Form states
  const [selectedProvider, setSelectedProvider] = useState(initialProvider);
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  const [bookingDate, setBookingDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load providers for this service category if not passed
  useEffect(() => {
    async function loadProviders() {
      if (!initialProvider && service?.category_id) {
        setLoadingProviders(true);
        try {
          const data = await fetchPublicProvidersApi({ category_id: service.category_id });
          setProviders(data || []);
          if (data && data.length > 0) {
            setSelectedProvider(data[0]);
          }
        } catch (err) {
          console.warn("Failed to load service providers:", err);
        } finally {
          setLoadingProviders(false);
        }
      }
    }
    loadProviders();
  }, [service, initialProvider]);

  // Load available slots when provider or date changes
  useEffect(() => {
    async function loadSlots() {
      if (selectedProvider?.id && bookingDate) {
        setLoadingSlots(true);
        try {
          const slots = await fetchAvailableSlotsApi(selectedProvider.id, bookingDate);
          setAvailableSlots(slots || []);
          const firstAvailable = (slots || []).find((s) => s.available);
          if (firstAvailable) {
            setSelectedSlot(firstAvailable.time);
          } else {
            setSelectedSlot("");
          }
        } catch (err) {
          console.warn("Failed to load time slots:", err);
        } finally {
          setLoadingSlots(false);
        }
      }
    }
    loadSlots();
  }, [selectedProvider, bookingDate]);

  // Price calculations
  const basePrice = service?.price || selectedProvider?.hourly_rate || 499;
  const emergencySurcharge = isEmergency ? roundPrice(basePrice * 0.20) : 0;
  const totalPrice = roundPrice(basePrice + emergencySurcharge);

  function roundPrice(val) {
    return Math.round(val * 100) / 100;
  }

  const handleConfirmAndPay = async () => {
    if (!user) {
      alert("Please sign in to complete your booking.");
      return;
    }
    if (!selectedSlot) {
      setError("Please select an available time slot.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Create Pending Booking in DB
      const bookingPayload = {
        service_id: service.id,
        provider_id: selectedProvider.id,
        address_id: selectedAddress?.id || null,
        booking_date: `${bookingDate}T00:00:00Z`,
        time_slot: selectedSlot,
        notes: notes.trim() || null,
        is_emergency: isEmergency,
      };

      const newBooking = await createBooking(bookingPayload);

      // 2. Initiate Razorpay Checkout modal
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
          // If payment cancelled, booking remains in pending status
          alert(`Booking #${newBooking.id} created as Pending. You can complete payment anytime from your Dashboard.`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-surface-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-surface-850 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-primary-400 tracking-wider">
              Step {step} of 5
            </span>
            <h2 className="text-xl font-bold text-white">Book {service?.title || "Service"}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-750 hover:bg-surface-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="w-full bg-surface-800 h-1">
          <div
            className="bg-gradient-to-r from-primary-500 to-accent-500 h-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/30 text-error-400 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* STEP 2: SELECT PROVIDER */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Select Your Service Provider</h3>
              {loadingProviders ? (
                <div className="py-12 text-center text-xs text-gray-400 animate-pulse">
                  Finding top providers...
                </div>
              ) : providers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-surface-800 text-center text-xs text-gray-400">
                  No explicit providers listed for this category yet. Defaulting to top verified pro.
                </div>
              ) : (
                <div className="grid gap-3">
                  {providers.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProvider(p)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedProvider?.id === p.id
                          ? "bg-primary-500/15 border-primary-500/50 shadow-md shadow-primary-500/10"
                          : "bg-surface-800 border-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {p.profile_image ? (
                          <img src={p.profile_image} alt={p.full_name} className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold">
                            {p.full_name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{p.full_name}</h4>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                              ✓ Verified
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{p.location || "Bengaluru"}</p>
                          <div className="flex items-center gap-2 text-[11px] text-yellow-400 font-bold mt-1">
                            <span>⭐ {p.rating || 4.9}</span>
                            <span className="text-gray-400 font-normal">({p.review_count || 15} reviews)</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-white">₹{p.hourly_rate || service.price}</span>
                        <span className="text-[10px] text-gray-400 block">/ hour</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: DATE & TIME SLOT PICKER */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Select Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-white/10 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">
                  Select Available Slot
                </label>
                {loadingSlots ? (
                  <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
                    Checking provider calendar...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-xs text-center">
                    No open slots on this date. Please pick another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {availableSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                          !slot.available
                            ? "bg-surface-850/50 border-white/5 text-gray-600 cursor-not-allowed line-through"
                            : selectedSlot === slot.time
                            ? "bg-primary-500/25 border-primary-500 text-primary-300 shadow"
                            : "bg-surface-800 border-white/10 text-gray-300 hover:border-white/30"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: ADDRESS SELECTION */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Select Service Address</h3>
              <AddressManager
                selectedAddressId={selectedAddress?.id}
                onSelectAddress={(addr) => setSelectedAddress(addr)}
              />
            </div>
          )}

          {/* STEP 5: ORDER SUMMARY & CONFIRMATION */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-surface-800 border border-white/10 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Service:</span>
                  <span className="font-bold text-white">{service?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Provider:</span>
                  <span className="font-bold text-white">{selectedProvider?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date & Slot:</span>
                  <span className="font-bold text-white">{bookingDate} ({selectedSlot})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Address:</span>
                  <span className="font-bold text-white truncate max-w-[200px]">
                    {selectedAddress ? `${selectedAddress.address_line}, ${selectedAddress.city}` : "At Provider Workshop"}
                  </span>
                </div>
              </div>

              {/* Emergency Option Checkbox */}
              <div className="p-4 rounded-2xl bg-error-500/10 border border-error-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-error-400">🚨 Urgent Emergency Dispatch</h4>
                  <p className="text-[11px] text-gray-400">Adds priority dispatch (+20% surcharge)</p>
                </div>
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="w-5 h-5 rounded accent-error-500 cursor-pointer"
                />
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Any special instructions for the technician..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-surface-800 border border-white/10 text-xs text-white outline-none"
                />
              </div>

              {/* Price Breakdown */}
              <div className="p-4 rounded-2xl bg-surface-850 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Base Price</span>
                  <span>₹{basePrice}</span>
                </div>
                {isEmergency && (
                  <div className="flex justify-between text-error-400 font-semibold">
                    <span>Emergency Surcharge (+20%)</span>
                    <span>+₹{emergencySurcharge}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-extrabold text-white">
                  <span>Total Payable</span>
                  <span className="text-primary-300">₹{totalPrice}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 bg-surface-850 border-t border-white/10 flex items-center justify-between">
          {step > 2 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 rounded-xl bg-surface-750 hover:bg-surface-700 text-xs font-semibold text-gray-300"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={() => {
                if (step === 3 && !selectedSlot) {
                  alert("Please select a time slot first.");
                  return;
                }
                setStep(step + 1);
              }}
              className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-xs font-bold text-white shadow-lg shadow-primary-500/25"
            >
              Next Step →
            </button>
          ) : (
            <button
              onClick={handleConfirmAndPay}
              disabled={submitting}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 hover:from-primary-500 hover:to-accent-400 text-xs font-extrabold text-white shadow-xl shadow-primary-500/30 flex items-center gap-2"
            >
              {submitting ? "Processing..." : `Confirm & Pay ₹${totalPrice}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
