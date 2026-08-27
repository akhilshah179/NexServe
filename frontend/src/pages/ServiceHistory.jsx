/**
 * ServiceHistory.jsx — Completed & Past Service Ledger for Customers.
 *
 * Features:
 * - Real-time PostgreSQL booking data display
 * - Filter tabs: All, Completed, Upcoming, Cancelled
 * - Show: Service title, Provider, Date/time, Price, Booking ID, Payment status, Completion status, Review/rating
 * - Actions: View Details, Book Again, Rate Service
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyBookings } from "../api/bookingsApi";
import ReviewModal from "../components/reviews/ReviewModal";

export default function ServiceHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const navigate = useNavigate();

  const loadBookings = async () => {
    try {
      const data = await getMyBookings();
      setBookings(data);
    } catch (err) {
      console.error("Failed to load service history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    if (filter === "completed") return b.status === "completed";
    if (filter === "upcoming") return ["pending", "confirmed", "in_progress"].includes(b.status);
    if (filter === "cancelled") return ["cancelled", "rejected"].includes(b.status);
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "confirmed":
        return "bg-primary-500/20 text-primary-300 border-primary-500/30";
      case "in_progress":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse";
      case "pending":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "cancelled":
      case "rejected":
        return "bg-error-500/20 text-error-300 border-error-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Service History</h1>
          <p className="text-sm text-gray-400 mt-1">
            Track all your past and completed bookings, ratings, and receipts.
          </p>
        </div>
        <Link
          to="/services"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:from-primary-500 hover:to-primary-400 transition-all"
        >
          + Book New Service
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
        {[
          { id: "all", label: "All Bookings" },
          { id: "completed", label: "Completed" },
          { id: "upcoming", label: "Upcoming / Active" },
          { id: "cancelled", label: "Cancelled / Rejected" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === tab.id
                ? "bg-primary-500/20 border border-primary-500/50 text-primary-300"
                : "bg-surface-800 border border-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {tab.label} ({bookings.filter((b) => {
              if (tab.id === "completed") return b.status === "completed";
              if (tab.id === "upcoming") return ["pending", "confirmed", "in_progress"].includes(b.status);
              if (tab.id === "cancelled") return ["cancelled", "rejected"].includes(b.status);
              return true;
            }).length})
          </button>
        ))}
      </div>

      {/* Main List Table */}
      <div className="p-6 rounded-3xl bg-surface-800/70 border border-white/10 shadow-2xl">
        {loading ? (
          <div className="py-16 text-center text-gray-400 animate-pulse">Loading service history...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-lg font-semibold mb-2">No bookings found in this category.</p>
            <p className="text-xs text-gray-500 mb-4">When you book or complete services, they will appear here automatically.</p>
            <Link to="/services" className="text-primary-400 hover:underline text-xs font-semibold">
              Explore Available Services →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="uppercase tracking-wider bg-surface-700/50 text-gray-400 border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Date & Time Slot</th>
                  <th className="px-4 py-3">Total Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-700/30 transition-colors">
                    <td className="px-4 py-4 font-bold text-white">
                      #{b.id}
                      {b.is_emergency && (
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] bg-error-500/20 text-error-400 font-bold border border-error-500/30">
                          🚨 Emergency
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold text-white">
                      {b.service?.title || `Service #${b.service_id}`}
                    </td>
                    <td className="px-4 py-4">
                      {b.provider?.full_name || `Provider #${b.provider_id}`}
                    </td>
                    <td className="px-4 py-4">
                      <div>{new Date(b.booking_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
                      <div className="text-[11px] text-gray-500">{b.time_slot}</div>
                    </td>
                    <td className="px-4 py-4 font-bold text-white">₹{b.total_amount}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase ${getStatusBadge(b.status)}`}>
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="px-3 py-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-200 font-medium text-xs border border-white/5 transition-all"
                        >
                          👁️ Details
                        </button>

                        {/* Rate Service */}
                        {b.status === "completed" && (
                          <button
                            onClick={() => setReviewBooking(b)}
                            className="px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 font-bold text-xs transition-all"
                          >
                            ⭐ {b.review ? `Rated (${b.review.rating}/5)` : "Rate Service"}
                          </button>
                        )}

                        {/* Book Again */}
                        <button
                          onClick={() => {
                            if (b.provider_id) {
                              navigate(`/providers/${b.provider_id}`);
                            } else {
                              navigate("/services");
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary-600/30 hover:bg-primary-600/50 text-primary-300 border border-primary-500/30 font-bold text-xs transition-all"
                        >
                          🔄 Book Again
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-surface-800 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h3 className="text-xl font-bold text-white">Booking #{selectedBooking.id} Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-gray-300">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-surface-700/50">
                <div>
                  <p className="text-gray-400 uppercase text-[10px] font-bold">Service</p>
                  <p className="text-white font-semibold text-sm mt-0.5">{selectedBooking.service?.title}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase text-[10px] font-bold">Provider</p>
                  <p className="text-white font-semibold text-sm mt-0.5">{selectedBooking.provider?.full_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 uppercase text-[10px] font-bold">Scheduled Date</p>
                  <p className="text-white font-semibold mt-0.5">{new Date(selectedBooking.booking_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase text-[10px] font-bold">Time Slot</p>
                  <p className="text-white font-semibold mt-0.5">{selectedBooking.time_slot}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 uppercase text-[10px] font-bold">Total Amount</p>
                  <p className="text-primary-300 font-bold text-sm mt-0.5">₹{selectedBooking.total_amount}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase text-[10px] font-bold">Status</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 border ${getStatusBadge(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>

              {selectedBooking.cancellation_reason && (
                <div className="p-3 rounded-xl bg-error-500/10 border border-error-500/20 text-error-300">
                  <p className="font-bold text-[11px]">Cancellation Reason:</p>
                  <p className="mt-1">{selectedBooking.cancellation_reason}</p>
                </div>
              )}

              {selectedBooking.notes && (
                <div className="p-3 rounded-xl bg-surface-700/50">
                  <p className="font-bold text-[11px] text-gray-400">Customer Notes:</p>
                  <p className="mt-1 text-gray-200">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs hover:bg-primary-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
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
