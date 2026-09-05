import React, { useState, useEffect } from "react";
import { FiTag, FiCheck, FiX, FiInfo, FiPercent, FiGift, FiLoader, FiZap, FiAlertTriangle } from "react-icons/fi";
import { calculatePriceApi } from "../../api/pricingApi";
import { fetchAvailableCouponsApi } from "../../api/couponsApi";

export default function DynamicPriceBreakdown({
  serviceId,
  providerId,
  bookingDate,
  timeSlot,
  isEmergency = false,
  customerLat = null,
  customerLng = null,
  onPriceCalculated,
  initialCouponCode = "",
}) {
  const [couponCode, setCouponCode] = useState(initialCouponCode);
  const [appliedCoupon, setAppliedCoupon] = useState(initialCouponCode);
  const [useReferral, setUseReferral] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [breakdownData, setBreakdownData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Fetch promo coupons for this service
  useEffect(() => {
    if (serviceId) {
      fetchAvailableCouponsApi(serviceId)
        .then((coupons) => {
          setAvailableCoupons(coupons || []);
        })
        .catch((err) => console.debug("Could not load coupons:", err));
    }
  }, [serviceId]);

  // Recalculate dynamic pricing whenever parameters change
  useEffect(() => {
    if (!serviceId) return;

    let isMounted = true;
    setLoading(true);
    setCouponError("");

    const payload = {
      service_id: serviceId,
      provider_id: providerId || null,
      booking_date: bookingDate ? bookingDate : new Date().toISOString().split("T")[0],
      time_slot: timeSlot || "10:00 AM - 11:00 AM",
      is_emergency: isEmergency,
      customer_lat: customerLat,
      customer_lng: customerLng,
      coupon_code: appliedCoupon ? appliedCoupon.trim() : null,
      use_referral_credit: useReferral,
    };

    calculatePriceApi(payload)
      .then((res) => {
        if (isMounted) {
          setBreakdownData(res);
          if (onPriceCalculated) {
            onPriceCalculated(res);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          const msg = err.response?.data?.detail || "Could not calculate dynamic pricing";
          if (appliedCoupon) {
            setCouponError(msg);
            setAppliedCoupon("");
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    serviceId,
    providerId,
    bookingDate,
    timeSlot,
    isEmergency,
    customerLat,
    customerLng,
    appliedCoupon,
    useReferral,
  ]);

  const handleApplyCoupon = (codeToApply) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) return;
    setAppliedCoupon(code);
    setCouponCode(code);
    setCouponError("");
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon("");
    setCouponCode("");
    setCouponError("");
  };

  const finalPayable = breakdownData?.final_total ?? breakdownData?.final_price ?? 0;
  const subtotal = breakdownData?.subtotal ?? 0;
  const emergencySurcharge = breakdownData?.emergency_surcharge ?? (isEmergency ? 150.0 : 0.0);
  const discountAmount = breakdownData?.discount_amount ?? 0;
  const referralDiscount = breakdownData?.referral_discount ?? 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-white space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <FiTag className="text-blue-400" />
          <span>Authoritative Price Breakdown</span>
        </h4>
        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-blue-400">
            <FiLoader className="w-3.5 h-3.5 animate-spin" />
            <span>Calculating...</span>
          </div>
        )}
      </div>

      {/* Coupon Code Input & Promo Chips */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponError("");
              }}
              placeholder="Enter promo coupon (e.g. WELCOME50)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase placeholder:normal-case placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {appliedCoupon && (
              <span className="absolute right-2.5 top-2 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <FiCheck /> Applied
              </span>
            )}
          </div>
          {appliedCoupon ? (
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleApplyCoupon(couponCode)}
              disabled={!couponCode.trim() || loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-50 transition"
            >
              Apply
            </button>
          )}
        </div>

        {couponError && <p className="text-xs text-red-400 font-medium">{couponError}</p>}

        {/* Promo Chips */}
        {availableCoupons.length > 0 && !appliedCoupon && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 self-center mr-1">Available:</span>
            {availableCoupons.slice(0, 4).map((cp) => (
              <button
                key={cp.id}
                type="button"
                onClick={() => handleApplyCoupon(cp.code)}
                className="text-[11px] bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded-lg font-mono font-medium transition flex items-center gap-1"
              >
                <span>{cp.code}</span>
                <span className="text-[10px] text-slate-300">
                  ({cp.discount_type === "percentage" ? `${cp.discount_value}% OFF` : `₹${cp.discount_value} OFF`})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Referral Credits Checkbox */}
      <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
        <label
          htmlFor="use-referral-chk"
          className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300"
        >
          <input
            id="use-referral-chk"
            type="checkbox"
            checked={useReferral}
            onChange={(e) => setUseReferral(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-700 border-slate-600 cursor-pointer"
          />
          <span className="flex items-center gap-1.5">
            <FiGift className="text-emerald-400" />
            <span>Apply Referral Wallet Credits</span>
          </span>
        </label>
        <span className="text-xs font-bold text-emerald-400">Up to 50% OFF</span>
      </div>

      {/* Transparent Pricing Breakdown Table */}
      {breakdownData && (
        <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Service Price</span>
            <span className="font-semibold text-white">₹{breakdownData.base_price?.toFixed(2)}</span>
          </div>

          {breakdownData.peak_surcharge > 0 && (
            <div className="flex justify-between text-amber-400">
              <span className="flex items-center gap-1">
                <span>Peak / Demand Surcharge</span>
                <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded">High Demand</span>
              </span>
              <span>+₹{breakdownData.peak_surcharge?.toFixed(2)}</span>
            </div>
          )}

          {breakdownData.distance_surcharge > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Distance / Travel Allowance</span>
              <span>+₹{breakdownData.distance_surcharge?.toFixed(2)}</span>
            </div>
          )}

          {emergencySurcharge > 0 && (
            <div className="flex justify-between text-red-400 font-semibold">
              <span className="flex items-center gap-1">
                <span>Emergency Charge</span>
                <span className="text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded">24/7 Rapid</span>
              </span>
              <span>+₹{emergencySurcharge?.toFixed(2)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex justify-between text-slate-400 font-medium">
            <span>Subtotal</span>
            <span className="text-white font-bold">₹{subtotal?.toFixed(2)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>Coupon Discount ({breakdownData.coupon_code || appliedCoupon})</span>
              <span>-₹{discountAmount?.toFixed(2)}</span>
            </div>
          )}

          {referralDiscount > 0 && (
            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>Referral Credit</span>
              <span>-₹{referralDiscount?.toFixed(2)}</span>
            </div>
          )}

          {/* Final Payable Amount */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-700/80 text-sm font-bold text-white">
            <span className="uppercase tracking-wider text-xs text-slate-300">Final Payable</span>
            <span className="text-xl font-black text-emerald-400">
              ₹{finalPayable?.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
