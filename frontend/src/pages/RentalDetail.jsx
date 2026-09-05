/**
 * RentalDetail.jsx — Detailed Rental Item Booking & Verification Page.
 *
 * Features:
 * - High-res interactive photo gallery
 * - Real-time backend overlap date availability checking
 * - Dynamic price quote calculator (subtotal, delivery, coupon, refundable deposit)
 * - Razorpay escrow payment checkout integration
 * - Item specifications, provider identity card, and customer reviews
 */

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { getRentalItemDetail, checkRentalAvailability, calculateRentalPrice, createRentalBooking, createRentalReview } from "../api/rentalsApi";
import { initiateRentalRazorpayCheckout } from "../utils/razorpay";
import { useAuth } from "../context/AuthContext";

export default function RentalDetail() {
  const { itemId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Booking Form State
  const [startDate, setStartDate] = useState(
    searchParams.get("start_date") || new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    searchParams.get("end_date") || new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0]
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

  // New Review Form State
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

  // Check Availability & Price Quote whenever dates, qty, delivery or coupon changes
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
          setAvailabilityMessage(err.response?.data?.detail || "Item not available for chosen dates.");
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

  // Handle Booking & Razorpay Payment
  const handleProceedToRent = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate(`/login?redirect=/rentals/${itemId}`);
      return;
    }

    if (deliveryRequested && !deliveryAddress.trim()) {
      alert("Please provide a delivery address.");
      return;
    }

    if (!isAvailable) {
      alert("Item is not available for the selected dates.");
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

      // Launch Razorpay Checkout
      initiateRentalRazorpayCheckout({
        rentalBooking: newBooking,
        user,
        onSuccess: (paymentRes) => {
          setBookingInProgress(false);
          setBookingSuccessData(newBooking);
        },
        onError: (errMsg) => {
          setBookingInProgress(false);
          alert(`Payment Notice: ${errMsg}\nYour booking #${newBooking.id} is created. You can complete payment anytime in 'My Rentals'.`);
          navigate("/my-rentals");
        },
      });
    } catch (err) {
      setBookingInProgress(false);
      alert(err.response?.data?.detail || "Failed to create rental booking. Please try again.");
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
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
      alert("Review posted successfully! Thank you for your feedback.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-20 px-4 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 skeleton rounded-3xl" />
          <div className="lg:col-span-5 h-96 skeleton rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-4 max-w-xl mx-auto text-center space-y-4">
        <span className="text-6xl block">⚠️</span>
        <h2 className="text-xl font-bold text-white">Item Not Found</h2>
        <p className="text-xs text-gray-400">{error || "The rental item you requested does not exist."}</p>
        <Link
          to="/rentals"
          className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
        >
          ← Back to Rentals Catalog
        </Link>
      </div>
    );
  }

  const images = item.images && item.images.length > 0 ? item.images : [
    { id: 1, image_url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80" }
  ];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link to="/rentals" className="hover:text-emerald-400 transition-colors">
          Rentals
        </Link>
        <span>/</span>
        <Link to={`/rentals?category=${item.category?.slug}`} className="hover:text-emerald-400 transition-colors">
          {item.category?.name}
        </Link>
        <span>/</span>
        <span className="text-gray-200 truncate">{item.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ═══ LEFT COLUMN: GALLERY & DETAILS (7 cols) ═══ */}
        <div className="lg:col-span-7 space-y-8">
          {/* Main Photo & Carousel */}
          <div className="space-y-3">
            <div className="relative h-80 sm:h-[420px] rounded-3xl overflow-hidden bg-surface-900 border border-white/10 shadow-2xl">
              <img
                src={images[activeImageIndex]?.image_url}
                alt={item.title}
                className="w-full h-full object-cover animate-fade-in"
              />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/30">
                  {item.category?.icon_url} {item.category?.name}
                </span>
                {item.brand && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-950/80 backdrop-blur-md text-gray-200 border border-white/10">
                    {item.brand} {item.model}
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                {images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                      activeImageIndex === idx
                        ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-105"
                        : "border-white/10 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title, Rating & Description */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{item.title}</h1>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-800 text-yellow-400 text-xs font-bold border border-white/10">
                <span>⭐</span>
                <span>{item.rating || "4.9"}</span>
                <span className="text-gray-400 font-normal">({item.review_count || 12} reviews)</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {item.description}
            </p>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5">
              <div className="p-3 rounded-2xl bg-surface-800/80 border border-white/5">
                <span className="text-[10px] text-gray-400 block font-medium">Available Quantity</span>
                <span className="text-sm font-bold text-white">{item.quantity} Units</span>
              </div>
              <div className="p-3 rounded-2xl bg-surface-800/80 border border-white/5">
                <span className="text-[10px] text-gray-400 block font-medium">Min Rental Period</span>
                <span className="text-sm font-bold text-white">{item.min_rental_days} Day(s)</span>
              </div>
              <div className="p-3 rounded-2xl bg-surface-800/80 border border-white/5">
                <span className="text-[10px] text-gray-400 block font-medium">Max Rental Period</span>
                <span className="text-sm font-bold text-white">{item.max_rental_days} Days</span>
              </div>
              <div className="p-3 rounded-2xl bg-surface-800/80 border border-white/5">
                <span className="text-[10px] text-gray-400 block font-medium">City / Location</span>
                <span className="text-sm font-bold text-white">{item.city || "Mumbai"}</span>
              </div>
            </div>

            {/* Terms & Guidelines */}
            {item.terms_and_conditions && (
              <div className="pt-3">
                <span className="text-xs font-bold text-emerald-400 block mb-1">📜 Rental Terms & Guidelines:</span>
                <p className="text-[11px] text-gray-400 bg-surface-800/50 p-3 rounded-xl border border-white/5 leading-relaxed">
                  {item.terms_and_conditions}
                </p>
              </div>
            )}
          </div>

          {/* Provider / Item Owner Card */}
          <div className="p-6 rounded-3xl glass-card flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-emerald-500/20">
                {item.provider?.business_name?.[0] || item.provider?.full_name?.[0] || "P"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {item.provider?.business_name || item.provider?.full_name || "Verified Rental Host"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Verified Host
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  {item.pickup_address ? `Pickup: ${item.pickup_address}` : "Available for pickup and doorstep delivery"}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Reviews & Feedback */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Customer Reviews ({item.review_count || 0})</h2>
              <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                <span>⭐ {item.rating || "4.9"}</span>
                <span className="text-gray-400 text-xs font-normal">/ 5.0</span>
              </div>
            </div>

            {/* Review Form */}
            {user && (
              <form onSubmit={handleReviewSubmit} className="p-4 rounded-2xl bg-surface-800/80 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">Rate this rental item:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-lg transition-transform ${
                          star <= reviewRating ? "text-yellow-400 scale-110" : "text-gray-600"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  placeholder="Share your rental experience, condition of item, handover process..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface-900 border border-white/10 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/50"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                  >
                    {submittingReview ? "Submitting..." : "Post Review"}
                  </button>
                </div>
              </form>
            )}

            {/* Review List */}
            <div className="space-y-4">
              {item.reviews && item.reviews.length > 0 ? (
                item.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-surface-850/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center text-xs text-white font-bold">
                          {rev.user?.full_name?.[0] || "U"}
                        </div>
                        <span className="text-xs font-bold text-white">{rev.user?.full_name || "Verified Customer"}</span>
                      </div>
                      <div className="flex items-center text-yellow-400 text-xs">
                        {"★".repeat(rev.rating)}
                        <span className="text-gray-600">{"★".repeat(5 - rev.rating)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] text-gray-500 block">
                      {new Date(rev.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">No reviews yet. Be the first to rent and review!</p>
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: RENTAL BOOKING & PRICING WIDGET (5 cols) ═══ */}
        <div className="lg:col-span-5 sticky top-24 space-y-6">
          {bookingSuccessData ? (
            /* Booking Success State */
            <div className="p-6 sm:p-8 rounded-3xl bg-surface-900 border border-emerald-500/40 shadow-2xl space-y-4 text-center animate-fade-in">
              <span className="text-5xl block">🎉</span>
              <h2 className="text-xl font-extrabold text-white">Rental Reserved Successfully!</h2>
              <p className="text-xs text-gray-300 leading-relaxed">
                Your booking ID is <strong className="text-emerald-400">#{bookingSuccessData.id}</strong>.
                Your security deposit is safely held in escrow and will be refunded upon clean return.
              </p>
              <div className="p-4 rounded-2xl bg-surface-800/80 border border-white/10 text-xs text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Rental Period:</span>
                  <span className="font-bold text-white">{startDate} → {endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fulfillment:</span>
                  <span className="font-bold text-emerald-300">{deliveryRequested ? "Doorstep Delivery" : "Self Pickup"}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/my-rentals"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 text-center"
                >
                  View in My Rentals →
                </Link>
                <button
                  onClick={() => setBookingSuccessData(null)}
                  className="w-full py-2.5 rounded-xl bg-surface-800 text-gray-300 hover:text-white text-xs font-semibold"
                >
                  Rent Another Item
                </button>
              </div>
            </div>
          ) : (
            /* Booking Form Widget */
            <form
              onSubmit={handleProceedToRent}
              className="p-6 sm:p-8 rounded-3xl bg-surface-900/95 border border-white/15 shadow-2xl backdrop-blur-2xl space-y-5"
            >
              {/* Daily Rate & Security Deposit Header */}
              <div className="pb-4 border-b border-white/10 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-white">₹{item.daily_rate}</span>
                    <span className="text-xs text-gray-400">/ day</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1">
                    🛡️ ₹{item.security_deposit} Security Deposit (Refundable)
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-semibold">Stock Status</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.quantity} available
                  </span>
                </div>
              </div>

              {/* Date Pickers */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-300 block">Select Rental Dates</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-surface-800 border border-white/10">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Pick-up Date</label>
                    <input
                      type="date"
                      value={startDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-white text-xs outline-none w-full font-semibold cursor-pointer"
                      required
                    />
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-800 border border-white/10">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Return Date</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || new Date().toISOString().split("T")[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-white text-xs outline-none w-full font-semibold cursor-pointer"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Availability Status Banner */}
              <div className="text-xs">
                {checkingAvailability ? (
                  <div className="p-2.5 rounded-xl bg-surface-800 text-gray-400 flex items-center gap-2">
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Checking live calendar availability...</span>
                  </div>
                ) : isAvailable ? (
                  <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
                    <span>✓</span>
                    <span className="font-semibold">{availabilityMessage || "Available for selected dates"}</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center gap-2">
                    <span>⚠️</span>
                    <span className="font-semibold">{availabilityMessage || "Selected dates conflict with an existing booking."}</span>
                  </div>
                )}
              </div>

              {/* Fulfillment Method Selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300 block">Fulfillment Method</span>
                <div className="grid grid-cols-2 gap-2">
                  {item.pickup_available && (
                    <button
                      type="button"
                      onClick={() => setDeliveryRequested(false)}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        !deliveryRequested
                          ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40"
                          : "bg-surface-800 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      <span>📍 Self Pickup</span>
                      <span className="text-[10px] font-normal">Free</span>
                    </button>
                  )}
                  {item.delivery_available && (
                    <button
                      type="button"
                      onClick={() => setDeliveryRequested(true)}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        deliveryRequested
                          ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40"
                          : "bg-surface-800 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      <span>🚚 Doorstep Delivery</span>
                      <span className="text-[10px] font-normal">+₹{item.delivery_fee}</span>
                    </button>
                  )}
                </div>

                {deliveryRequested ? (
                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-gray-300 block mb-1">
                      Delivery Address & City Landmark <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter flat/building, street name, pincode..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-surface-800 border border-white/10 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/50"
                      required={deliveryRequested}
                    />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-surface-800/80 border border-white/5 text-[11px] text-gray-400">
                    <span>Pickup Location: </span>
                    <strong className="text-white">{item.pickup_address || "Provided after booking confirmation"}</strong>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              {item.quantity > 1 && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-800 border border-white/10 text-xs">
                  <span className="font-bold text-gray-300">Quantity Needed:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 rounded-lg bg-surface-700 text-white font-bold flex items-center justify-center hover:bg-surface-600"
                    >
                      -
                    </button>
                    <span className="font-bold text-white text-sm">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(item.quantity, quantity + 1))}
                      className="w-7 h-7 rounded-lg bg-surface-700 text-white font-bold flex items-center justify-center hover:bg-surface-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Coupon Code Input */}
              <div className="pt-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon code (e.g. WELCOME10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 p-2.5 rounded-xl bg-surface-800 border border-white/10 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/50 uppercase"
                  />
                </div>
              </div>

              {/* Transparent Price Summary */}
              {priceQuote && (
                <div className="p-4 rounded-2xl bg-surface-800/90 border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-300">
                    <span>
                      Daily Rate ({priceQuote.days} days × {priceQuote.quantity} unit{priceQuote.quantity > 1 ? "s" : ""})
                    </span>
                    <span className="font-bold text-white">₹{priceQuote.subtotal}</span>
                  </div>

                  {priceQuote.delivery_fee > 0 && (
                    <div className="flex justify-between text-gray-300">
                      <span>Doorstep Delivery Fee</span>
                      <span className="font-bold text-white">₹{priceQuote.delivery_fee}</span>
                    </div>
                  )}

                  {priceQuote.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Coupon Discount</span>
                      <span>-₹{priceQuote.discount_amount}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-emerald-300 font-semibold pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1">
                      🛡️ Security Deposit (Refundable)
                    </span>
                    <span>₹{priceQuote.security_deposit_amount}</span>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
                    <span className="font-extrabold text-white text-sm">Total Payable Now</span>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-white">₹{priceQuote.total_amount_charged}</span>
                      <span className="text-[10px] text-gray-400 block">incl. all taxes & deposit</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={!isAvailable || bookingInProgress || calculatingPrice}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {bookingInProgress ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Initializing Secure Checkout...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Book & Pay</span>
                    <span>→</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                🔒 Protected by Razorpay Escrow. Your security deposit is 100% safeguarded and refunded automatically on return.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
