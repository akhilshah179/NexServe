/**
 * Dashboard.jsx — Personal Consumer Dashboard for Customers.
 *
 * Features:
 * - Personalized greeting banner with Google profile image, email, & spending metrics
 * - Search service shortcut bar
 * - Spotlight Active / Upcoming booking banner with real-time status stepper
 * - Recent Bookings ledger with Pay Now, Chat, Reschedule, Cancel, and Write Review
 * - Customer Address Manager
 * - Direct link to full Service History page (/history)
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyBookings, cancelBookingApi, rescheduleBookingApi } from "../api/bookingsApi";
import { initiateRazorpayCheckout } from "../utils/razorpay";
import AddressManager from "../components/addresses/AddressManager";
import BookingChatModal from "../components/chat/BookingChatModal";
import ReviewModal from "../components/reviews/ReviewModal";

export default function Dashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Active Modals
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [chatBooking, setChatBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);

  // Reschedule State
  const [rescheduleBookingTarget, setRescheduleBookingTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("10:00 AM - 11:00 AM");

  const loadBookings = async () => {
    try {
      const data = await getMyBookings();
      setBookings(data || []);
    } catch (err) {
      console.warn("Failed to load customer bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handlePayBooking = (booking) => {
    setActionLoading(booking.id);
    initiateRazorpayCheckout({
      booking,
      user,
      onSuccess: () => {
        setBookings((prev) =>
          prev.map((b) => (b.id === booking.id ? { ...b, status: "confirmed" } : b))
        );
        setActionLoading(null);
        alert("Payment verified! Booking confirmed.");
      },
      onError: (errMsg) => {
        alert(errMsg || "Payment process cancelled.");
        setActionLoading(null);
      },
    });
  };

  const handleCancelBooking = async (bookingId) => {
    const reason = prompt("Please provide a cancellation reason:");
    if (!reason) return;
    setActionLoading(bookingId);
    try {
      const updated = await cancelBookingApi(bookingId, reason);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to cancel booking.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleBookingTarget || !rescheduleDate) return;
    setActionLoading(rescheduleBookingTarget.id);
    try {
      await rescheduleBookingApi(rescheduleBookingTarget.id, rescheduleDate, rescheduleSlot);
      alert("Booking rescheduled successfully!");
      setRescheduleBookingTarget(null);
      setRescheduleDate("");
      await loadBookings();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reschedule booking.");
    } finally {
      setActionLoading(null);
    }
  };

  // Metrics calculation
  const totalSpent = bookings
    .filter((b) => b.status === "completed" || b.status === "confirmed")
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const activeBooking = bookings.find((b) =>
    ["pending", "confirmed", "in_progress"].includes(b.status)
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto space-y-8">
      {/* ═══ PERSONAL GREETING BANNER ═══ */}
      <div className="p-8 rounded-3xl bg-surface-850 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {user?.profile_image ? (
              <img
                src={user.profile_image}
                alt={user.full_name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary-500/40 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">
                {user?.full_name?.charAt(0) || "U"}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-white">Welcome back, {user?.full_name?.split(" ")[0]}! 👋</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
            </div>
          </div>

          {/* Key Metrics Pills */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-surface-900/80 border border-white/10 text-xs">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Bookings</span>
              <span className="text-base font-extrabold text-white">{bookings.length}</span>
            </div>
            <div className="border-l border-white/10 pl-4">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Spent</span>
              <span className="text-base font-extrabold text-primary-300">₹{Math.round(totalSpent)}</span>
            </div>
          </div>
        </div>

        {/* Quick Search Service Input */}
        <div className="mt-6 pt-6 border-t border-white/5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                navigate(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            className="flex items-center gap-2 max-w-xl"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="What service do you need next?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-900 border border-white/10 text-xs text-white placeholder-gray-400 outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs shadow hover:bg-primary-500"
            >
              Book Service
            </button>
          </form>
        </div>
      </div>

      {/* ═══ SPOTLIGHT ACTIVE BOOKING CARD (IF ANY) ═══ */}
      {activeBooking && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-surface-850 via-surface-800 to-surface-850 border border-primary-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30">
              ⚡ Spotlight Active Booking #{activeBooking.id}
            </span>
            <span className="text-xs font-extrabold text-white capitalize bg-surface-900 px-3 py-1 rounded-full border border-white/10">
              Status: {activeBooking.status}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                {activeBooking.service?.title || `Service #${activeBooking.service_id}`}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Provider: <span className="text-gray-200 font-semibold">{activeBooking.provider?.full_name}</span>
              </p>
              <p className="text-xs text-gray-400">
                Scheduled: <span className="text-gray-200 font-semibold">{new Date(activeBooking.booking_date).toLocaleDateString()}</span> ({activeBooking.time_slot})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setChatBooking(activeBooking)}
                className="px-3.5 py-2 rounded-xl bg-surface-700 hover:bg-surface-600 text-white text-xs font-semibold"
              >
                💬 Chat with Pro
              </button>

              {activeBooking.status === "pending" && (
                <button
                  onClick={() => handlePayBooking(activeBooking)}
                  disabled={actionLoading === activeBooking.id}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-extrabold shadow"
                >
                  💳 Pay ₹{activeBooking.total_amount} Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SAVED ADDRESSES ═══ */}
      <AddressManager
        selectedAddressId={selectedAddress?.id}
        onSelectAddress={(addr) => setSelectedAddress(addr)}
      />

      {/* ═══ RECENT BOOKINGS TABLE ═══ */}
      <div className="p-8 rounded-3xl bg-surface-850 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Recent Service Bookings</h2>
          <Link to="/history" className="text-xs font-bold text-primary-400 hover:underline">
            View Complete Service History →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400 animate-pulse">Loading your bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            <p className="text-sm font-semibold mb-2">No service bookings placed yet.</p>
            <Link to="/services" className="text-primary-400 font-bold hover:underline">
              Explore Available Services →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="uppercase tracking-wider bg-surface-800 text-gray-400 border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Date & Slot</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-4 font-bold text-white">#{b.id}</td>
                    <td className="px-4 py-4 font-semibold text-white">{b.service?.title}</td>
                    <td className="px-4 py-4">{b.provider?.full_name}</td>
                    <td className="px-4 py-4">
                      <div>{new Date(b.booking_date).toLocaleDateString()}</div>
                      <div className="text-[11px] text-gray-500">{b.time_slot}</div>
                    </td>
                    <td className="px-4 py-4 font-bold text-white">₹{b.total_amount}</td>
                    <td className="px-4 py-4 capitalize font-bold">{b.status}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setChatBooking(b)}
                          className="px-2.5 py-1 rounded-lg bg-surface-750 hover:bg-surface-700 text-gray-200 text-xs"
                        >
                          💬 Chat
                        </button>
                        {b.status === "completed" && (
                          <button
                            onClick={() => setReviewBooking(b)}
                            className="px-2.5 py-1 rounded-lg bg-yellow-500/20 text-yellow-300 font-bold border border-yellow-500/30 text-xs"
                          >
                            ⭐ Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {chatBooking && (
        <BookingChatModal booking={chatBooking} onClose={() => setChatBooking(null)} />
      )}

      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSuccess={() => loadBookings()}
        />
      )}
    </div>
  );
}
