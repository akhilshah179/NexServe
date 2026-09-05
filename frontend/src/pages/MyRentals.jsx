/**
 * MyRentals.jsx — Customer Rental Dashboard & Lifecycle Tracker.
 *
 * Features:
 * - Real-time tracking of physical item rentals
 * - Interactive visual timeline (Requested -> Confirmed -> Rented -> Return Pending -> Returned -> Inspected -> Completed)
 * - Pay Now trigger for pending orders via Razorpay
 * - Initiate Return Handover modal
 * - Security deposit refund status tracking
 * - Review submission modal for completed rentals
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyRentalBookings, updateRentalBookingStatus, processRentalReturn, createRentalReview } from "../api/rentalsApi";
import { initiateRentalRazorpayCheckout } from "../utils/razorpay";
import { useAuth } from "../context/AuthContext";

export default function MyRentals() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "active" | "upcoming" | "completed" | "cancelled"

  // Modals
  const [returnBooking, setReturnBooking] = useState(null);
  const [returnNotes, setReturnNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const loadRentals = async () => {
    try {
      setLoading(true);
      const data = await getMyRentalBookings();
      setBookings(data || []);
    } catch (err) {
      console.error("Failed to load user rentals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login?redirect=/my-rentals");
      return;
    }
    loadRentals();
  }, [user]);

  // Tab Filtering
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return b.status === "RENTED" || b.status === "RETURN_PENDING";
    if (activeTab === "upcoming")
      return b.status === "REQUESTED" || b.status === "CONFIRMED" || b.status === "PAYMENT_COMPLETED" || b.status === "READY_FOR_PICKUP" || b.status === "READY_FOR_DELIVERY";
    if (activeTab === "completed") return b.status === "COMPLETED" || b.status === "RETURNED" || b.status === "INSPECTED";
    if (activeTab === "cancelled") return b.status === "CANCELLED" || b.status === "REJECTED" || b.status === "DAMAGE_REPORTED";
    return true;
  });

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this rental booking?")) return;
    try {
      setProcessingAction(true);
      await updateRentalBookingStatus(bookingId, "CANCELLED", "Cancelled by customer");
      await loadRentals();
      alert("Rental booking cancelled successfully.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to cancel booking.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handlePayNow = (booking) => {
    initiateRentalRazorpayCheckout({
      rentalBooking: booking,
      user,
      onSuccess: async () => {
        alert("Payment verified successfully! Your rental is confirmed.");
        await loadRentals();
      },
      onError: (err) => {
        alert(`Payment error: ${err}`);
      },
    });
  };

  const handleInitiateReturn = async (e) => {
    e.preventDefault();
    if (!returnBooking) return;
    try {
      setProcessingAction(true);
      await updateRentalBookingStatus(returnBooking.id, "RETURN_PENDING", returnNotes || "Customer initiated item return");
      setReturnBooking(null);
      setReturnNotes("");
      await loadRentals();
      alert("Return request submitted! Please handover the item to the provider/courier.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to request return.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewBooking) return;
    try {
      setProcessingAction(true);
      await createRentalReview(reviewBooking.rental_item_id, {
        rating: Number(reviewRating),
        comment: reviewComment,
      });
      setReviewBooking(null);
      setReviewComment("");
      alert("Thank you for reviewing your rental!");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to submit review.");
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
            Rental Management Dashboard
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white">My Rented Gear & Orders</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Track real-time delivery, handover status, security deposit escrow, and return inspections.
          </p>
        </div>

        <Link
          to="/rentals"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto flex items-center gap-1.5"
        >
          <span>Explore More Rentals</span>
          <span>→</span>
        </Link>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none border-b border-white/5">
        {[
          { id: "all", label: "All Rentals", count: bookings.length },
          { id: "active", label: "Currently Active / Rented", count: bookings.filter((b) => b.status === "RENTED" || b.status === "RETURN_PENDING").length },
          { id: "upcoming", label: "Upcoming / Confirmed", count: bookings.filter((b) => ["REQUESTED", "CONFIRMED", "PAYMENT_COMPLETED", "READY_FOR_PICKUP", "READY_FOR_DELIVERY"].includes(b.status)).length },
          { id: "completed", label: "Completed", count: bookings.filter((b) => ["COMPLETED", "RETURNED", "INSPECTED"].includes(b.status)).length },
          { id: "cancelled", label: "Cancelled / Disputes", count: bookings.filter((b) => ["CANCELLED", "REJECTED", "DAMAGE_REPORTED"].includes(b.status)).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400"
                : "bg-surface-850 border border-white/10 text-gray-300 hover:text-white hover:bg-surface-800"
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 font-extrabold">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ═══ BOOKINGS LIST ═══ */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-56 skeleton rounded-3xl" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-20 text-center text-gray-400 p-8 rounded-3xl bg-surface-850/50 border border-white/5 space-y-4">
          <span className="text-6xl block">📦</span>
          <h3 className="text-lg font-bold text-white">No rentals found in this section</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Browse our verified catalog of cameras, vehicles, electronics, and camping equipment to make your first rental.
          </p>
          <Link
            to="/rentals"
            className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Browse Rental Marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBookings.map((b) => (
            <RentalOrderCard
              key={b.id}
              booking={b}
              onPayNow={() => handlePayNow(b)}
              onCancel={() => handleCancel(b.id)}
              onInitiateReturn={() => setReturnBooking(b)}
              onReview={() => setReviewBooking(b)}
              processingAction={processingAction}
            />
          ))}
        </div>
      )}

      {/* ═══ RETURN MODAL ═══ */}
      {returnBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form
            onSubmit={handleInitiateReturn}
            className="relative w-full max-w-lg rounded-3xl bg-surface-850 border border-white/15 p-6 sm:p-8 shadow-2xl space-y-5"
          >
            <button
              type="button"
              onClick={() => setReturnBooking(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-700 text-gray-300 hover:text-white flex items-center justify-center text-sm"
            >
              ✕
            </button>

            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Handover / Return Item
              </span>
              <h2 className="text-xl font-extrabold text-white">Initiate Rental Return</h2>
              <p className="text-xs text-gray-300 mt-1">
                Booking #{returnBooking.id} • {returnBooking.rental_item?.title}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-800/80 border border-white/5 text-xs text-gray-300 space-y-2">
              <p>
                🛡️ <strong>Security Deposit: ₹{returnBooking.security_deposit_amount}</strong>
              </p>
              <p className="text-[11px] text-gray-400">
                Once the host receives and inspects the equipment for any damages, your security deposit will be automatically unlocked and credited back to your account.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">
                Return Notes / Tracking Details (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Handed over in original box with all accessories, pickup scheduled for 2 PM..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface-900 border border-white/10 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReturnBooking(null)}
                className="px-4 py-2 rounded-xl bg-surface-700 text-gray-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processingAction}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
              >
                {processingAction ? "Submitting..." : "Confirm Return Handover"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══ REVIEW MODAL ═══ */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form
            onSubmit={handleSubmitReview}
            className="relative w-full max-w-lg rounded-3xl bg-surface-850 border border-white/15 p-6 sm:p-8 shadow-2xl space-y-5"
          >
            <button
              type="button"
              onClick={() => setReviewBooking(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-700 text-gray-300 hover:text-white flex items-center justify-center text-sm"
            >
              ✕
            </button>

            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Rate Experience
              </span>
              <h2 className="text-xl font-extrabold text-white">Review Rental Item</h2>
              <p className="text-xs text-gray-300 mt-1">{reviewBooking.rental_item?.title}</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-800 border border-white/5">
              <span className="text-xs font-bold text-gray-300">Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`text-xl transition-transform ${
                      star <= reviewRating ? "text-yellow-400 scale-110" : "text-gray-600"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">Your Feedback</label>
              <textarea
                rows={3}
                placeholder="How was the equipment condition, accuracy of description, and host communication?"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface-900 border border-white/10 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/50"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                className="px-4 py-2 rounded-xl bg-surface-700 text-gray-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processingAction}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
              >
                {processingAction ? "Posting..." : "Submit Review"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * Detailed Order Card with Progress Tracker
 */
function RentalOrderCard({ booking, onPayNow, onCancel, onInitiateReturn, onReview, processingAction }) {
  const item = booking.rental_item;
  const primaryImage =
    item?.images?.find((img) => img.is_primary)?.image_url ||
    item?.images?.[0]?.image_url ||
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80";

  const getStatusBadge = (status) => {
    switch (status) {
      case "REQUESTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">⏳ Awaiting Confirmation</span>;
      case "CONFIRMED":
      case "PAYMENT_COMPLETED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">✓ Confirmed & Paid</span>;
      case "READY_FOR_PICKUP":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">📍 Ready for Pickup</span>;
      case "READY_FOR_DELIVERY":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">🚚 Out for Delivery</span>;
      case "RENTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">📦 Currently in Use</span>;
      case "RETURN_PENDING":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">🔄 Return in Progress</span>;
      case "RETURNED":
      case "INSPECTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">🔍 Inspecting Return</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600/30 text-emerald-200 border border-emerald-400/30">✨ Completed & Deposit Refunded</span>;
      case "DAMAGE_REPORTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600/20 text-rose-300 border border-rose-500/30">⚠️ Damage Claim Under Review</span>;
      case "CANCELLED":
      case "REJECTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-300 border border-white/10">✕ Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-surface-700 text-gray-300">{status}</span>;
    }
  };

  const getDepositBadge = (deposit) => {
    if (!deposit) return null;
    switch (deposit.status) {
      case "HELD":
        return <span className="text-[11px] text-emerald-400 font-semibold">🛡️ Deposit ₹{deposit.amount} Held in Escrow</span>;
      case "REFUNDED":
        return <span className="text-[11px] text-emerald-300 font-semibold">✓ Deposit ₹{deposit.refund_amount || deposit.amount} 100% Refunded</span>;
      case "DEDUCTED":
        return <span className="text-[11px] text-rose-400 font-semibold">⚠️ Deposit Deducted: ₹{deposit.deduction_amount} (Damage Claim)</span>;
      default:
        return <span className="text-[11px] text-gray-400 font-semibold">Deposit: {deposit.status}</span>;
    }
  };

  return (
    <div className="p-6 rounded-3xl glass-card border border-white/10 shadow-xl space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-white">Booking #{booking.id}</span>
          <span className="text-gray-500">•</span>
          <span className="text-xs text-gray-400">
            {new Date(booking.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        <div>{getStatusBadge(booking.status)}</div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Item Image & Title */}
        <div className="md:col-span-6 flex items-center gap-4">
          <img
            src={primaryImage}
            alt={item?.title}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover bg-surface-900 border border-white/10 flex-shrink-0"
          />
          <div>
            <h3 className="text-base font-bold text-white mb-1">{item?.title || "Rental Equipment"}</h3>
            <p className="text-xs text-gray-400 line-clamp-1 mb-2">
              {item?.brand} {item?.model ? `• ${item.model}` : ""}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span>📅 {booking.start_date} → {booking.end_date}</span>
              <span>•</span>
              <span>Qty: {booking.quantity}</span>
            </div>
          </div>
        </div>

        {/* Pricing & Deposit */}
        <div className="md:col-span-3 space-y-1">
          <div className="text-xs text-gray-400">Total Paid (incl. Deposit)</div>
          <div className="text-xl font-extrabold text-white">₹{booking.total_amount_charged}</div>
          <div>{getDepositBadge(booking.security_deposit)}</div>
        </div>

        {/* Action Buttons */}
        <div className="md:col-span-3 flex flex-col gap-2 items-end justify-center">
          {booking.status === "REQUESTED" && (
            <>
              <button
                onClick={onPayNow}
                disabled={processingAction}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white font-bold text-xs shadow-md transition-all"
              >
                Pay Now (Razorpay)
              </button>
              <button
                onClick={onCancel}
                disabled={processingAction}
                className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-rose-400 text-xs font-semibold"
              >
                Cancel Booking
              </button>
            </>
          )}

          {booking.status === "CONFIRMED" && (
            <button
              onClick={onCancel}
              disabled={processingAction}
              className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-rose-400 text-xs font-semibold"
            >
              Cancel Booking
            </button>
          )}

          {booking.status === "RENTED" && (
            <button
              onClick={onInitiateReturn}
              disabled={processingAction}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <span>Initiate Return Handover</span>
              <span>📦</span>
            </button>
          )}

          {booking.status === "COMPLETED" && (
            <button
              onClick={onReview}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-yellow-400 hover:text-yellow-300 text-xs font-bold border border-yellow-500/20"
            >
              ⭐ Rate & Review Item
            </button>
          )}

          <Link
            to={`/rentals/${booking.rental_item_id}`}
            className="text-[11px] text-gray-400 hover:text-emerald-400 underline"
          >
            View Item Details
          </Link>
        </div>
      </div>

      {/* Fulfillment Information Strip */}
      <div className="p-3 rounded-2xl bg-surface-850 border border-white/5 flex flex-wrap items-center justify-between text-xs text-gray-300 gap-2">
        <div className="flex items-center gap-2">
          <span>{booking.fulfillment_type === "DELIVERY" ? "🚚 Doorstep Delivery to:" : "📍 Self Pickup from:"}</span>
          <span className="font-bold text-white">
            {booking.delivery_address || item?.pickup_address || "Specified Location"}
          </span>
        </div>
        {booking.special_instructions && (
          <div className="text-gray-400 italic text-[11px]">
            Note: "{booking.special_instructions}"
          </div>
        )}
      </div>
    </div>
  );
}
