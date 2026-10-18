import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tag, Check, Gift, Loader2, TicketPercent } from "lucide-react";
import { PriceRow, PriceTotal, PriceBreakdown, Switch, Skeleton, cn } from "../ui";
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
    <div className="space-y-5">
      {/* Coupon */}
      <div>
        <label htmlFor="coupon-input" className="label flex items-center gap-1.5">
          <TicketPercent className="w-4 h-4 text-ink-400" aria-hidden="true" />
          Promo code
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="coupon-input"
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!appliedCoupon) handleApplyCoupon(couponCode);
                }
              }}
              disabled={!!appliedCoupon}
              placeholder="Enter code"
              aria-invalid={couponError ? true : undefined}
              className="input uppercase font-mono tracking-wider placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
            />
            <AnimatePresence>
              {appliedCoupon && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Applied
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {appliedCoupon ? (
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="h-11 px-4 rounded-xl text-sm font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 transition-colors"
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleApplyCoupon(couponCode)}
              disabled={!couponCode.trim() || loading}
              className="h-11 px-4 rounded-xl text-sm font-semibold text-white bg-surface-750 hover:bg-surface-700 border border-white/[0.08] disabled:opacity-40 transition-colors"
            >
              Apply
            </button>
          )}
        </div>
        {couponError && (
          <p role="alert" className="mt-1.5 text-[13px] text-rose-300">
            {couponError}
          </p>
        )}

        {availableCoupons.length > 0 && !appliedCoupon && (
          <div className="flex flex-wrap gap-2 mt-3">
            {availableCoupons.slice(0, 4).map((cp) => (
              <motion.button
                key={cp.id}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => handleApplyCoupon(cp.code)}
                className="inline-flex items-center gap-2 h-8 pl-2.5 pr-3 rounded-lg border border-dashed border-primary-400/30 bg-primary-500/[0.06] hover:bg-primary-500/[0.12] text-xs transition-colors"
              >
                <Tag className="w-3.5 h-3.5 text-primary-300" aria-hidden="true" />
                <span className="font-mono font-semibold text-primary-200">{cp.code}</span>
                <span className="text-ink-400">
                  {cp.discount_type === "percentage" ? `${cp.discount_value}% off` : `₹${cp.discount_value} off`}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Referral credits */}
      <div className="surface-inset p-3.5">
        <Switch
          checked={useReferral}
          onChange={setUseReferral}
          tone="rental"
          label={
            <span className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-300" aria-hidden="true" />
              Use referral credits
            </span>
          }
          description="Apply wallet credits — up to 50% of this booking."
        />
      </div>

      {/* Breakdown */}
      <div className="surface-inset p-4" aria-live="polite" aria-busy={loading}>
        <div className="flex items-center justify-between mb-3.5">
          <p className="text-sm font-semibold text-white">Price details</p>
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-ink-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              Updating
            </span>
          )}
        </div>
        {!breakdownData ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-7 w-1/3 ml-auto mt-4" />
          </div>
        ) : (
          <div className={cn("transition-opacity", loading && "opacity-60")}>
            <PriceBreakdown>
              <PriceRow key="base" label="Service charge" value={breakdownData.base_price || 0} />
              {breakdownData.peak_surcharge > 0 && (
                <PriceRow key="peak" label="Peak-hour demand" hint="High-demand slot" value={breakdownData.peak_surcharge} tone="surcharge" />
              )}
              {breakdownData.distance_surcharge > 0 && (
                <PriceRow key="dist" label="Travel allowance" value={breakdownData.distance_surcharge} tone="surcharge" />
              )}
              {emergencySurcharge > 0 && (
                <PriceRow key="emg" label="Emergency priority" value={emergencySurcharge} tone="danger" sign="+" />
              )}
              <PriceRow key="sub" label="Subtotal" value={subtotal || 0} tone="muted" />
              {discountAmount > 0 && (
                <PriceRow
                  key="coupon"
                  label={`Promo ${breakdownData.coupon_code || appliedCoupon}`}
                  value={discountAmount}
                  tone="discount"
                />
              )}
              {referralDiscount > 0 && <PriceRow key="ref" label="Referral credits" value={referralDiscount} tone="discount" />}
            </PriceBreakdown>
            <PriceTotal label="Total payable" caption="Inclusive of all charges" value={finalPayable || 0} />
          </div>
        )}
      </div>
    </div>
  );
}
