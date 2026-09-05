/**
 * Dashboard.jsx — Personal Consumer Dashboard for Customers.
 *
 * Upgraded Features:
 * - Real-Time Booking Tracking via WebSocket with Live Status Timeline
 * - Refer & Earn Rewards Card (Give ₹100, Get ₹100)
 * - AI-Driven Smart Recommendation Feeds (Modular carousels)
 * - Personalized greeting banner with spending metrics
 * - Recent Bookings ledger with Pay Now, Chat, Reschedule, Cancel, and Review
 * - Address Manager integration
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { getMyBookings, cancelBookingApi, rescheduleBookingApi } from "../api/bookingsApi";
import { getCategories } from "../api/servicesApi";
import { initiateRazorpayCheckout } from "../utils/razorpay";
import AddressManager from "../components/addresses/AddressManager";
import BookingChatModal from "../components/chat/BookingChatModal";
import ReviewModal from "../components/reviews/ReviewModal";
import BookingLiveTracker from "../components/booking/BookingLiveTracker";
import ReferralCard from "../components/referrals/ReferralCard";
import RecommendationSection from "../components/recommendations/RecommendationSection";
import BookingWizardModal from "../components/booking/BookingWizardModal";
import { FiClock, FiCalendar, FiCreditCard, FiMessageSquare, FiStar, FiChevronRight } from "react-icons/fi";

export default function Dashboard() {
  const { user } = useAuth();
  const { lastEvent } = useNotifications();
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Active Modals
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [chatBooking, setChatBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [wizardService, setWizardService] = useState(null);

  // Active spotlight booking tracking modal or view
  const [trackedBooking, setTrackedBooking] = useState(null);

  const loadData = async () => {
    try {
      const [bookingsData, catData] = await Promise.all([
        getMyBookings(),
        getCategories(),
      ]);
      setBookings(bookingsData || []);
      setCategories(catData || []);
    } catch (err) {
      console.warn("Failed to load customer dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // React to real-time status updates pushed via WebSocket
  useEffect(() => {
    if (lastEvent?.booking) {
      setBookings((prev) => {
        const exists = prev.some((b) => b.id === lastEvent.booking.id);
        if (exists) {
          return prev.map((b) => (b.id === lastEvent.booking.id ? { ...b, ...lastEvent.booking } : b));
        } else {
          return [lastEvent.booking, ...prev];
        }
      });
    } else if (lastEvent?.booking_id && lastEvent?.status) {
      setBookings((prev) =>
        prev.map((b) => (b.id === lastEvent.booking_id ? { ...b, status: lastEvent.status, notes: lastEvent.notes || b.notes } : b))
      );
    }
  }, [lastEvent]);

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

  const handleStatusUpdate = (updatedBooking) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b))
    );
  };

  // Metrics calculation
  const totalSpent = bookings
    .filter((b) => b.status === "completed" || b.status === "confirmed")
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const activeBooking = bookings.find((b) =>
    ["pending", "requested", "confirmed", "provider_on_the_way", "in_progress"].includes(b.status)
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto space-y-10">
      {/* ═══ PERSONAL GREETING BANNER ═══ */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {user?.profile_image ? (
              <img
                src={user.profile_image}
                alt={user.full_name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">
                {user?.full_name?.charAt(0) || "U"}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-white">
                  Welcome back, {user?.full_name?.split(" ")[0]}! 👋
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
            </div>
          </div>

          {/* Key Metrics Pills */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-850 border border-slate-700/80 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Bookings</span>
              <span className="text-base font-extrabold text-white">{bookings.length}</span>
            </div>
            <div className="border-l border-slate-700 pl-4">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Spent</span>
              <span className="text-base font-extrabold text-emerald-400">₹{Math.round(totalSpent)}</span>
            </div>
          </div>
        </div>

        {/* Quick Search Service Input */}
        <div className="mt-6 pt-6 border-t border-slate-800">
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
                placeholder="What service do you need today?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 outline-none focus:border-blue-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-500 transition"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* ═══ REAL-TIME SPOTLIGHT ACTIVE BOOKING TRACKER ═══ */}
      {activeBooking && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Active Service Live Tracker</span>
            </h2>
          </div>
          <BookingLiveTracker
            booking={activeBooking}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>
      )}

      {/* ═══ REFER & EARN REWARDS CARD ═══ */}
      <ReferralCard />

      {/* ═══ AI SMART RECOMMENDATIONS ═══ */}
      <RecommendationSection
        onSelectService={(svc) => setWizardService(svc)}
      />

      {/* ═══ EXPLORE CATEGORIES QUICK ACCESS ═══ */}
      {categories.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Book by Category</h2>
              <p className="text-xs text-slate-400">Discover verified home services and instant booking</p>
            </div>
            <Link
              to="/services"
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Explore All Categories →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {categories.slice(0, 10).map((cat) => (
              <Link
                key={cat.id}
                to={`/services?category=${cat.id}`}
                className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-750 transition-all flex flex-col items-center text-center group"
              >
                <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">
                  {cat.icon_url || "✨"}
                </span>
                <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SAVED ADDRESSES ═══ */}
      <AddressManager
        selectedAddressId={selectedAddress?.id}
        onSelectAddress={(addr) => setSelectedAddress(addr)}
      />

      {/* ═══ RECENT BOOKINGS TABLE ═══ */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Recent Service Bookings</h2>
          <Link to="/history" className="text-xs font-bold text-blue-400 hover:underline">
            View Complete Service History →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading your bookings...
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <p className="text-sm font-semibold mb-2">No service bookings placed yet.</p>
            <Link to="/services" className="text-blue-400 font-bold hover:underline">
              Explore Available Services →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="uppercase tracking-wider bg-slate-800 text-slate-400 border-b border-slate-700">
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
              <tbody className="divide-y divide-slate-800">
                {bookings.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-4 font-bold text-white">#{b.id}</td>
                    <td className="px-4 py-4 font-semibold text-white">{b.service?.name || b.service?.title}</td>
                    <td className="px-4 py-4">{b.provider?.full_name}</td>
                    <td className="px-4 py-4">
                      <div>{new Date(b.booking_date).toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-500">{b.time_slot}</div>
                    </td>
                    <td className="px-4 py-4 font-bold text-white">₹{b.total_amount}</td>
                    <td className="px-4 py-4">
                      <span className="capitalize font-semibold text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                        {b.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setTrackedBooking(b)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-semibold"
                        >
                          Track
                        </button>
                        <button
                          onClick={() => setChatBooking(b)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                        >
                          💬 Chat
                        </button>
                        {b.status === "completed" && (
                          <button
                            onClick={() => setReviewBooking(b)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-xs"
                          >
                            ⭐ Review
                          </button>
                        )}
                        {b.status === "pending" && (
                          <button
                            onClick={() => handlePayBooking(b)}
                            disabled={actionLoading === b.id}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow"
                          >
                            Pay ₹{b.total_amount}
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
      {trackedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl">
            <BookingLiveTracker
              booking={trackedBooking}
              onClose={() => setTrackedBooking(null)}
              onStatusUpdate={handleStatusUpdate}
            />
          </div>
        </div>
      )}

      {chatBooking && (
        <BookingChatModal booking={chatBooking} onClose={() => setChatBooking(null)} />
      )}

      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSuccess={() => loadData()}
        />
      )}

      {wizardService && (
        <BookingWizardModal
          service={wizardService}
          onClose={() => setWizardService(null)}
          onSuccess={() => {
            setWizardService(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
