/**
 * ProviderDashboard.jsx — Advanced Business Management Panel for Service Providers.
 *
 * Features:
 * - Instant Booking vs Request Booking Mode Toggle with Instant Persistence
 * - Full Lifecycle Status Actions:
 *   - Accept / Reject (for REQUESTED/PENDING)
 *   - Provider On The Way (PROVIDER_ON_THE_WAY)
 *   - Start Service (IN_PROGRESS)
 *   - Complete Service (COMPLETED)
 * - Pre-booking Customer Photos Attachment Viewer
 * - Real-Time WebSockets for Live Booking Notifications
 * - Calendar Date Blocking & Profile Setup
 * - Customer Chat & Review Reply Modals
 */

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getServices, createService } from "../api/servicesApi";
import {
  getMyBookings,
  confirmBookingApi,
  rejectBookingApi,
  providerOnTheWayApi,
  startBookingApi,
  completeBookingApi,
} from "../api/bookingsApi";
import { updateProviderProfileApi } from "../api/providersApi";
import { blockDateApi } from "../api/availabilityApi";
import { fetchProviderReviewsApi } from "../api/reviewsApi";
import {
  getProviderRentalBookings,
  getRentalCategories,
  getRentalItems,
  getMyRentalItems,
  createRentalItem,
  updateRentalItem,
  deleteRentalItem,
  updateRentalBookingStatus,
  processRentalReturn,
  submitRentalDamageClaim,
} from "../api/rentalsApi";
import { createUserNotificationSocket } from "../utils/websocket";
import BookingChatModal from "../components/chat/BookingChatModal";
import ProviderReplyModal from "../components/reviews/ProviderReplyModal";
import {
  FiZap,
  FiClock,
  FiTruck,
  FiTool,
  FiCheck,
  FiX,
  FiImage,
  FiCalendar,
  FiDollarSign,
  FiStar,
  FiUserCheck,
  FiToggleLeft,
  FiToggleRight
} from "react-icons/fi";

import { useNotifications } from "../context/NotificationContext";

export default function ProviderDashboard() {
  const { user, updateUser } = useAuth();
  const { lastEvent } = useNotifications();
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [rentalBookings, setRentalBookings] = useState([]);
  const [rentalItems, setRentalItems] = useState([]);
  const [rentalCategories, setRentalCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const [activeTab, setActiveTab] = useState("bookings"); // "bookings" | "rentals" | "calendar" | "services" | "earnings" | "reviews" | "profile"

  // Provider Mode: "instant_booking" | "request_booking"
  const [bookingMode, setBookingMode] = useState(user?.booking_mode || "instant_booking");
  const [updatingMode, setUpdatingMode] = useState(false);

  // Modals
  const [chatBooking, setChatBooking] = useState(null);
  const [replyReview, setReplyReview] = useState(null);
  const [previewAttachmentsBooking, setPreviewAttachmentsBooking] = useState(null);

  // New Service Modal State
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newServiceTitle, setNewServiceTitle] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState(60);
  const [newServiceCatId, setNewServiceCatId] = useState(1);
  const [creatingService, setCreatingService] = useState(false);

  // Rental Item Modal & Damage Reporting State
  const [showAddRentalModal, setShowAddRentalModal] = useState(false);
  const [creatingRentalItem, setCreatingRentalItem] = useState(false);
  const [rentalForm, setRentalForm] = useState({
    title: "",
    description: "",
    category_id: 1,
    brand: "",
    model: "",
    daily_rate: "",
    security_deposit: "",
    quantity: 1,
    min_rental_days: 1,
    max_rental_days: 30,
    delivery_available: true,
    delivery_fee: 100,
    pickup_available: true,
    pickup_address: "",
    city: "Mumbai",
    image_url: "",
    terms_and_conditions: "Government ID required at handover. Handle equipment with care.",
  });

  const [damageModalBooking, setDamageModalBooking] = useState(null);
  const [damageDescription, setDamageDescription] = useState("");
  const [estimatedRepairCost, setEstimatedRepairCost] = useState("");
  const [reportingDamage, setReportingDamage] = useState(false);

  // Calendar Date Blocking State
  const [blockDate, setBlockDate] = useState("");
  const [blockingDate, setBlockingDate] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    phone_number: user?.phone_number || "",
    bio: user?.bio || "",
    location: user?.location || "",
    service_radius_km: user?.service_radius_km || 15.0,
    working_hours: user?.working_hours || "Mon-Sat: 09:00 AM - 07:00 PM",
    emergency_available: user?.emergency_available || false,
    hourly_rate: user?.hourly_rate || 499,
    experience_years: user?.experience_years || 5,
    booking_mode: user?.booking_mode || "instant_booking",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const loadData = async () => {
    try {
      const [servData, bookData, revData, rentBookData, rentCats, myRentItemsData] = await Promise.all([
        getServices({ providerId: user?.id }),
        getMyBookings(),
        user?.id ? fetchProviderReviewsApi(user.id) : [],
        getProviderRentalBookings().catch(() => []),
        getRentalCategories().catch(() => []),
        getMyRentalItems().catch(() => []),
      ]);
      setServices(servData || []);
      setBookings(bookData || []);
      setReviews(revData || []);
      setRentalBookings(rentBookData || []);
      setRentalCategories(rentCats || []);
      if (rentCats && rentCats.length > 0 && !rentalForm.category_id) {
        setRentalForm((prev) => ({ ...prev, category_id: rentCats[0].id }));
      }
      setRentalItems(myRentItemsData || []);
    } catch (err) {
      console.warn("Failed to fetch provider dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  // React to incoming real-time notifications & booking updates
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

  const handleToggleBookingMode = async () => {
    const nextMode = bookingMode === "instant_booking" ? "request_booking" : "instant_booking";
    setUpdatingMode(true);
    try {
      await updateProviderProfileApi({ booking_mode: nextMode });
      setBookingMode(nextMode);
      if (updateUser) {
        updateUser({ ...user, booking_mode: nextMode });
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update booking mode.");
    } finally {
      setUpdatingMode(false);
    }
  };

  const handleConfirm = async (id) => {
    setActionLoading(`confirm-${id}`);
    try {
      const updated = await confirmBookingApi(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to accept booking.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(`reject-${id}`);
    try {
      const updated = await rejectBookingApi(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reject booking.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOnTheWay = async (id) => {
    setActionLoading(`ontheway-${id}`);
    try {
      const updated = await providerOnTheWayApi(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = async (id) => {
    setActionLoading(`start-${id}`);
    try {
      const updated = await startBookingApi(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to start service.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id) => {
    setActionLoading(`complete-${id}`);
    try {
      const updated = await completeBookingApi(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      alert("Booking marked as COMPLETED! Referral rewards and payouts updated.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to complete booking.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddServiceSubmit = async (e) => {
    e.preventDefault();
    setCreatingService(true);
    try {
      await createService({
        name: newServiceTitle,
        title: newServiceTitle,
        description: newServiceDesc,
        price: Number(newServicePrice),
        base_price: Number(newServicePrice),
        duration_minutes: Number(newServiceDuration),
        category_id: Number(newServiceCatId),
      });
      alert("New service created successfully!");
      setShowAddServiceModal(false);
      setNewServiceTitle("");
      setNewServiceDesc("");
      setNewServicePrice("");
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create service.");
    } finally {
      setCreatingService(false);
    }
  };

  const handleBlockDateSubmit = async (e) => {
    e.preventDefault();
    if (!blockDate) return;
    setBlockingDate(true);
    try {
      await blockDateApi(blockDate);
      alert(`Date ${blockDate} has been blocked on your calendar.`);
      setBlockDate("");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to block date.");
    } finally {
      setBlockingDate(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProviderProfileApi(profileForm);
      alert("Provider business profile updated!");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Rental Handlers ────────────────────────
  const handleCreateRentalItemSubmit = async (e) => {
    e.preventDefault();
    setCreatingRentalItem(true);
    try {
      const payload = {
        title: rentalForm.title,
        description: rentalForm.description,
        category_id: Number(rentalForm.category_id),
        brand: rentalForm.brand || null,
        model: rentalForm.model || null,
        daily_rate: Number(rentalForm.daily_rate),
        security_deposit: Number(rentalForm.security_deposit),
        quantity: Number(rentalForm.quantity),
        min_rental_days: Number(rentalForm.min_rental_days),
        max_rental_days: Number(rentalForm.max_rental_days),
        delivery_available: rentalForm.delivery_available,
        delivery_fee: Number(rentalForm.delivery_fee),
        pickup_available: rentalForm.pickup_available,
        pickup_address: rentalForm.pickup_address || null,
        city: rentalForm.city || "Mumbai",
        terms_and_conditions: rentalForm.terms_and_conditions,
        images: rentalForm.image_url ? [{ image_url: rentalForm.image_url, is_primary: true }] : [],
      };

      await createRentalItem(payload);
      alert("Rental item listed successfully!");
      setShowAddRentalModal(false);
      setRentalForm({
        title: "",
        description: "",
        category_id: rentalCategories[0]?.id || 1,
        brand: "",
        model: "",
        daily_rate: "",
        security_deposit: "",
        quantity: 1,
        min_rental_days: 1,
        max_rental_days: 30,
        delivery_available: true,
        delivery_fee: 100,
        pickup_available: true,
        pickup_address: "",
        city: "Mumbai",
        image_url: "",
        terms_and_conditions: "Government ID required at handover. Handle equipment with care.",
      });
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to list rental item.");
    } finally {
      setCreatingRentalItem(false);
    }
  };

  const handleRentalStatusChange = async (bookingId, newStatus, notes = "") => {
    setActionLoading(`rental-${bookingId}-${newStatus}`);
    try {
      await updateRentalBookingStatus(bookingId, newStatus, notes);
      await loadData();
      alert(`Rental booking #${bookingId} status updated to ${newStatus}.`);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update rental status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanReturnSubmit = async (bookingId) => {
    if (!window.confirm("Confirm clean return inspection? Full security deposit will be automatically unlocked and refunded to customer.")) return;
    setActionLoading(`rental-return-${bookingId}`);
    try {
      await processRentalReturn(bookingId, {
        item_condition: "EXCELLENT",
        is_damaged: false,
        damage_deduction_paise: 0,
        inspection_notes: "Item returned in pristine condition with all original accessories.",
      });
      await loadData();
      alert("Return verified! Security deposit refunded to customer.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to process return.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportDamageSubmit = async (e) => {
    e.preventDefault();
    if (!damageModalBooking) return;
    setReportingDamage(true);
    try {
      await submitRentalDamageClaim(damageModalBooking.id, {
        damage_description: damageDescription,
        estimated_repair_cost: Number(estimatedRepairCost),
      });
      setDamageModalBooking(null);
      setDamageDescription("");
      setEstimatedRepairCost("");
      await loadData();
      alert("Damage claim submitted to admin for escrow arbitration.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to report damage claim.");
    } finally {
      setReportingDamage(false);
    }
  };

  const handleDeleteRental = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this rental listing?")) return;
    try {
      await deleteRentalItem(itemId);
      await loadData();
      alert("Rental listing deleted.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete item.");
    }
  };


  // KPI calculations
  const totalEarnings = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const pendingCount = bookings.filter((b) => ["pending", "requested"].includes(b.status)).length;
  const inTransitCount = bookings.filter((b) => ["confirmed", "provider_on_the_way", "in_progress"].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto space-y-8">
      {/* ═══ HEADER BANNER WITH INSTANT VS REQUEST MODE TOGGLE ═══ */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-white">Provider Business Suite</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <FiUserCheck /> Verified Partner
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage incoming requests, track live jobs, update availability, and view earnings.
          </p>
        </div>

        {/* Action Controls: Mode Switch & Add Service */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Instant vs Request Booking Mode Switch */}
          <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-2xl">
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-slate-400">Booking Mode</div>
              <div className="text-xs font-extrabold text-white flex items-center gap-1">
                {bookingMode === "instant_booking" ? (
                  <span className="text-blue-400 flex items-center gap-1">
                    <FiZap /> Instant Auto-Confirm
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <FiClock /> Manual Request Mode
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleBookingMode}
              disabled={updatingMode}
              className={`p-1.5 rounded-xl transition ${
                bookingMode === "instant_booking"
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "bg-amber-600 text-white hover:bg-amber-500"
              }`}
              title="Click to toggle Instant vs Request booking mode"
            >
              {bookingMode === "instant_booking" ? (
                <FiToggleRight className="w-6 h-6" />
              ) : (
                <FiToggleLeft className="w-6 h-6" />
              )}
            </button>
          </div>

          <button
            onClick={() => setShowAddServiceModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition"
          >
            + Add Service
          </button>

          <button
            onClick={() => setShowAddRentalModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 transition flex items-center gap-1.5"
          >
            <span>📦</span>
            <span>+ List Rental Item</span>
          </button>
        </div>
      </div>

      {/* ═══ KPI OVERVIEW CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Total Revenue</span>
          <span className="text-2xl font-extrabold text-emerald-400">₹{totalEarnings}</span>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Pending Service Requests</span>
          <span className="text-2xl font-extrabold text-amber-400">{pendingCount}</span>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Active Rentals</span>
          <span className="text-2xl font-extrabold text-emerald-300">
            {rentalBookings.filter((b) => ["RENTED", "RETURN_PENDING", "CONFIRMED"].includes(b.status)).length}
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-lg">
          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Jobs & Rentals Done</span>
          <span className="text-2xl font-extrabold text-indigo-300">
            {completedCount + rentalBookings.filter((b) => b.status === "COMPLETED").length}
          </span>
        </div>
      </div>

      {/* ═══ TABS NAVIGATION ═══ */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4 overflow-x-auto">
        {[
          { id: "bookings", label: `Service Requests & Jobs (${pendingCount + inTransitCount})` },
          { id: "rentals", label: `📦 Rentals Business Suite (${rentalBookings.length} orders)` },
          { id: "calendar", label: "Calendar & Availability" },
          { id: "services", label: `My Services (${services.length})` },
          { id: "earnings", label: `Completed Ledger (${completedCount})` },
          { id: "reviews", label: `Customer Reviews (${reviews.length})` },
          { id: "profile", label: "Business Profile" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? tab.id === "rentals"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                  : "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: BOOKING REQUESTS & ACTIONS ═══ */}
      {activeTab === "bookings" && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Live Booking Management</h2>
            <span className="text-xs text-slate-400">Real-time status updates enabled</span>
          </div>

          {bookings.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No booking requests received yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="uppercase tracking-wider bg-slate-800 text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Photos</th>
                    <th className="px-4 py-3">Date & Slot</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-4 py-4 font-bold text-white">#{b.id}</td>
                      <td className="px-4 py-4 font-semibold text-white">
                        <div>{b.customer?.full_name || "Customer"}</div>
                        <div className="text-[11px] text-slate-400">{b.customer?.phone_number || b.customer?.email}</div>
                        {b.address && (
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <span>📍</span>
                            <span className="truncate max-w-[160px]">
                              {b.address.street || b.address.address_line1 || b.address.city || "Customer Address"}
                            </span>
                          </div>
                        )}
                        {b.notes && (
                          <div className="text-[10px] text-amber-400/80 italic mt-0.5 max-w-[180px] truncate" title={b.notes}>
                            Note: &quot;{b.notes}&quot;
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 font-medium text-white">
                        <div>{b.service?.name || b.service?.title}</div>
                      </td>

                      {/* Photo Attachments Button */}
                      <td className="px-4 py-4">
                        {b.attachments && b.attachments.length > 0 ? (
                          <button
                            onClick={() => setPreviewAttachmentsBooking(b)}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
                          >
                            <FiImage className="w-3.5 h-3.5" />
                            <span>{b.attachments.length} Photos</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-600">No photos</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div>{new Date(b.booking_date).toLocaleDateString()}</div>
                        <div className="text-[11px] text-slate-500">{b.time_slot}</div>
                      </td>
                      <td className="px-4 py-4 font-bold text-emerald-400">₹{b.total_amount}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`capitalize font-bold text-[11px] px-2.5 py-1 rounded-full border ${
                            b.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : b.status === "in_progress"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                              : b.status === "provider_on_the_way"
                              ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                              : b.status === "confirmed"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              : b.status === "cancelled" || b.status === "rejected"
                              ? "bg-red-500/20 text-red-300 border-red-500/30"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {b.status?.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setChatBooking(b)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
                          >
                            💬 Chat
                          </button>

                          {/* REQUESTED or PENDING: Accept / Reject */}
                          {(b.status === "pending" || b.status === "requested") && (
                            <>
                              <button
                                onClick={() => handleConfirm(b.id)}
                                disabled={actionLoading === `confirm-${b.id}`}
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleReject(b.id)}
                                disabled={actionLoading === `reject-${b.id}`}
                                className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs border border-red-500/30 transition"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* CONFIRMED: Provider On The Way */}
                          {b.status === "confirmed" && (
                            <button
                              onClick={() => handleOnTheWay(b.id)}
                              disabled={actionLoading === `ontheway-${b.id}`}
                              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                            >
                              <FiTruck /> On The Way
                            </button>
                          )}

                          {/* PROVIDER_ON_THE_WAY: Start Service */}
                          {b.status === "provider_on_the_way" && (
                            <button
                              onClick={() => handleStart(b.id)}
                              disabled={actionLoading === `start-${b.id}`}
                              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                            >
                              <FiTool /> Start Service
                            </button>
                          )}

                          {/* IN_PROGRESS: Complete Service */}
                          {b.status === "in_progress" && (
                            <button
                              onClick={() => handleComplete(b.id)}
                              disabled={actionLoading === `complete-${b.id}`}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs animate-pulse flex items-center gap-1.5 transition"
                            >
                              <FiCheck /> Complete Job
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
      )}

      {/* ═══ TAB 1.5: RENTALS BUSINESS SUITE (ORDERS & INVENTORY) ═══ */}
      {activeTab === "rentals" && (
        <div className="space-y-8 animate-fade-in">
          {/* Active / Incoming Rental Orders Table */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📦</span>
                  <span>Rental Orders & Escrow Lifecycle</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Manage handover, delivery readiness, return inspections, and security deposit escrow.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 self-start sm:self-auto">
                {rentalBookings.length} Total Bookings
              </span>
            </div>

            {rentalBookings.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No rental bookings received yet. List physical items below to start renting out equipment!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="uppercase tracking-wider bg-slate-800 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Rental Item</th>
                      <th className="px-4 py-3">Dates & Qty</th>
                      <th className="px-4 py-3">Pricing & Deposit</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Lifecycle Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rentalBookings.map((rb) => (
                      <tr key={rb.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-4 font-bold text-white">#{rb.id}</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">{rb.customer?.full_name || "Customer"}</div>
                          <div className="text-[11px] text-slate-400">{rb.customer?.phone_number || rb.customer?.email}</div>
                          <div className="text-[10px] text-emerald-400/80 mt-0.5">
                            {rb.fulfillment_type === "DELIVERY" ? "🚚 Delivery" : "📍 Pickup"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">{rb.rental_item?.title}</div>
                          <div className="text-[11px] text-slate-400">{rb.rental_item?.category?.name}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div>{rb.start_date} → {rb.end_date}</div>
                          <div className="text-[11px] text-slate-400">{rb.quantity} unit(s)</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-emerald-400">₹{rb.total_amount_charged}</div>
                          <div className="text-[10px] text-slate-400">
                            (incl. ₹{rb.security_deposit_amount} deposit)
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`font-bold text-[10px] px-2.5 py-1 rounded-full border ${
                              rb.status === "COMPLETED"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : rb.status === "RENTED"
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse"
                                : rb.status === "RETURN_PENDING"
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                : rb.status === "READY_FOR_PICKUP" || rb.status === "READY_FOR_DELIVERY"
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                : rb.status === "CONFIRMED"
                                ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                                : rb.status === "DAMAGE_REPORTED"
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {rb.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* REQUESTED: Accept / Reject */}
                            {rb.status === "REQUESTED" && (
                              <>
                                <button
                                  onClick={() => handleRentalStatusChange(rb.id, "CONFIRMED", "Provider confirmed booking")}
                                  disabled={actionLoading === `rental-${rb.id}-CONFIRMED`}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleRentalStatusChange(rb.id, "REJECTED", "Item unavailable for requested dates")}
                                  disabled={actionLoading === `rental-${rb.id}-REJECTED`}
                                  className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs border border-red-500/30"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* CONFIRMED or PAYMENT_COMPLETED: Mark Ready */}
                            {(rb.status === "CONFIRMED" || rb.status === "PAYMENT_COMPLETED") && (
                              <button
                                onClick={() =>
                                  handleRentalStatusChange(
                                    rb.id,
                                    rb.fulfillment_type === "DELIVERY" ? "READY_FOR_DELIVERY" : "READY_FOR_PICKUP",
                                    "Item packed and ready"
                                  )
                                }
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                              >
                                {rb.fulfillment_type === "DELIVERY" ? "🚚 Ready For Delivery" : "📍 Ready For Pickup"}
                              </button>
                            )}

                            {/* READY: Mark Handed Over (RENTED) */}
                            {(rb.status === "READY_FOR_PICKUP" || rb.status === "READY_FOR_DELIVERY") && (
                              <button
                                onClick={() => handleRentalStatusChange(rb.id, "RENTED", "Handover completed to customer")}
                                className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                              >
                                🤝 Confirm Handover (Rented)
                              </button>
                            )}

                            {/* RENTED or RETURN_PENDING: Return Inspection & Deposit Refund */}
                            {(rb.status === "RENTED" || rb.status === "RETURN_PENDING" || rb.status === "RETURNED") && (
                              <>
                                <button
                                  onClick={() => handleCleanReturnSubmit(rb.id)}
                                  disabled={actionLoading === `rental-return-${rb.id}`}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow"
                                >
                                  <span>✓ Clean Return</span>
                                  <span className="text-[10px] font-normal">(Refund Deposit)</span>
                                </button>
                                <button
                                  onClick={() => setDamageModalBooking(rb)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold text-xs border border-rose-500/30"
                                >
                                  ⚠️ Report Damage
                                </button>
                              </>
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

          {/* Rental Items Inventory Section */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">My Rental Inventory ({rentalItems.length})</h2>
                <p className="text-xs text-slate-400">Physical gear and items currently listed under your host profile.</p>
              </div>

              <button
                onClick={() => setShowAddRentalModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
              >
                + Add Item Listing
              </button>
            </div>

            {rentalItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                You have not listed any rental items yet. Click "+ Add Item Listing" above to publish your gear!
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rentalItems.map((item) => (
                  <div key={item.id} className="p-5 rounded-3xl bg-slate-800/80 border border-slate-700/60 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                          {item.category?.name || "Equipment"}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          Qty: {item.quantity}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mb-1">{item.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-700 space-y-2">
                      <div className="flex justify-between text-xs font-extrabold text-white">
                        <span className="text-emerald-400">₹{item.daily_rate} / day</span>
                        <span className="text-slate-400">Deposit: ₹{item.security_deposit}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleDeleteRental(item.id)}
                          className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs border border-red-500/30 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB 2: CALENDAR & BLOCK DATES ═══ */}
      {activeTab === "calendar" && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 max-w-xl space-y-4">
          <h2 className="text-lg font-bold text-white">Block Vacation / Unavailable Date</h2>
          <form onSubmit={handleBlockDateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Select Date to Block
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={blockingDate}
              className="px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow hover:bg-red-500 transition"
            >
              {blockingDate ? "Blocking..." : "Block Calendar Date"}
            </button>
          </form>
        </div>
      )}

      {/* ═══ TAB 3: MY SERVICES ═══ */}
      {activeTab === "services" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => (
            <div key={s.id} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                {s.category?.name || "Home Service"}
              </span>
              <h3 className="text-base font-bold text-white">{s.name || s.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{s.description}</p>
              <div className="pt-2 flex justify-between text-xs font-extrabold text-white border-t border-slate-800">
                <span className="text-emerald-400">₹{s.base_price || s.price}</span>
                <span>{s.duration_minutes || 60} mins</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TAB 4: COMPLETED LEDGER & EARNINGS ═══ */}
      {activeTab === "earnings" && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white">Completed Service Ledger</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="uppercase bg-slate-800 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Payout Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {bookings
                  .filter((b) => b.status === "completed")
                  .map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-4 font-bold text-white">#{b.id}</td>
                      <td className="px-4 py-4">{b.customer?.full_name}</td>
                      <td className="px-4 py-4">{b.service?.name || b.service?.title}</td>
                      <td className="px-4 py-4">{new Date(b.booking_date).toLocaleDateString()}</td>
                      <td className="px-4 py-4 font-bold text-emerald-400 text-right">₹{b.total_amount}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB 5: REVIEWS & REPLIES ═══ */}
      {activeTab === "reviews" && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white">Customer Reviews & Ratings</h2>
          {reviews.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No customer reviews yet.</div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{rev.customer?.full_name || "Customer"}</span>
                      <span className="text-amber-400 text-xs font-bold">⭐ {rev.rating}/5</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{rev.comment}</p>
                  {rev.provider_reply ? (
                    <div className="mt-2 pl-3 border-l-2 border-blue-500 text-[11px] text-blue-300">
                      <span className="font-semibold block">Your Reply:</span>
                      {rev.provider_reply}
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyReview(rev)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      Reply to Review →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 6: BUSINESS PROFILE SETUP ═══ */}
      {activeTab === "profile" && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 max-w-2xl space-y-4">
          <h2 className="text-lg font-bold text-white">Provider Business Profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profileForm.phone_number}
                  onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase mb-1">Bio / Expertise</label>
              <textarea
                rows={3}
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">City / Location</label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Service Radius (km)</label>
                <input
                  type="number"
                  value={profileForm.service_radius_km}
                  onChange={(e) => setProfileForm({ ...profileForm, service_radius_km: Number(e.target.value) })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition"
            >
              {savingProfile ? "Saving..." : "Save Profile Settings"}
            </button>
          </form>
        </div>
      )}

      {/* ═══ MODAL: PREVIEW CUSTOMER ATTACHMENTS ═══ */}
      {previewAttachmentsBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FiImage className="text-blue-400" />
                <span>Problem Photos for Booking #{previewAttachmentsBooking.id}</span>
              </h3>
              <button
                onClick={() => setPreviewAttachmentsBooking(null)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {previewAttachmentsBooking.attachments?.map((att) => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-xl overflow-hidden border border-slate-700 aspect-video bg-slate-800 block"
                >
                  <img
                    src={att.file_url}
                    alt={att.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300 truncate">
                    {att.file_name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: ADD NEW SERVICE ═══ */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add New Service Offering</h3>
            <form onSubmit={handleAddServiceSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Category</label>
                <select
                  value={newServiceCatId}
                  onChange={(e) => setNewServiceCatId(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                >
                  <option value={1}>Home Cleaning</option>
                  <option value={2}>AC Repair</option>
                  <option value={3}>Salon & Beauty</option>
                  <option value={4}>Plumbing</option>
                  <option value={5}>Electrical</option>
                  <option value={6}>Car Services</option>
                  <option value={7}>Tutoring</option>
                  <option value={8}>Fitness</option>
                  <option value={9}>Pest Control</option>
                  <option value={10}>Laundry</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep AC Cleaning & Gas Check"
                  value={newServiceTitle}
                  onChange={(e) => setNewServiceTitle(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="What is included in this service..."
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="499"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-4 py-2 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingService}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition"
                >
                  {creatingService ? "Publishing..." : "Publish Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: ADD NEW RENTAL ITEM ═══ */}
      {showAddRentalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📦</span>
                  <span>List New Physical Item for Rent</span>
                </h3>
                <p className="text-xs text-slate-400">Add specifications, daily price, security deposit and fulfillment terms.</p>
              </div>
              <button
                onClick={() => setShowAddRentalModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRentalItemSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Rental Category</label>
                  <select
                    value={rentalForm.category_id}
                    onChange={(e) => setRentalForm({ ...rentalForm, category_id: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                  >
                    {rentalCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon_url} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Item Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sony FX3 Cinema Line Full-Frame Camera"
                    value={rentalForm.title}
                    onChange={(e) => setRentalForm({ ...rentalForm, title: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Description & Included Items</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe condition, accessories (batteries, charger, case, cables)..."
                  value={rentalForm.description}
                  onChange={(e) => setRentalForm({ ...rentalForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Daily Rate (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="1200"
                    value={rentalForm.daily_rate}
                    onChange={(e) => setRentalForm({ ...rentalForm, daily_rate: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Deposit (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="5000"
                    value={rentalForm.security_deposit}
                    onChange={(e) => setRentalForm({ ...rentalForm, security_deposit: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Quantity Stock</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={rentalForm.quantity}
                    onChange={(e) => setRentalForm({ ...rentalForm, quantity: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={rentalForm.city}
                    onChange={(e) => setRentalForm({ ...rentalForm, city: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Brand (Optional)</label>
                  <input
                    type="text"
                    placeholder="Sony, Canon, Decathlon, Royal Enfield..."
                    value={rentalForm.brand}
                    onChange={(e) => setRentalForm({ ...rentalForm, brand: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Primary Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={rentalForm.image_url}
                    onChange={(e) => setRentalForm({ ...rentalForm, image_url: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <span className="font-bold text-slate-300 uppercase block">Fulfillment Options</span>
                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-white">
                    <input
                      type="checkbox"
                      checked={rentalForm.pickup_available}
                      onChange={(e) => setRentalForm({ ...rentalForm, pickup_available: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    <span>Self Pickup Available</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-white">
                    <input
                      type="checkbox"
                      checked={rentalForm.delivery_available}
                      onChange={(e) => setRentalForm({ ...rentalForm, delivery_available: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    <span>Doorstep Delivery Available</span>
                  </label>
                </div>

                {rentalForm.pickup_available && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Pickup Address</label>
                    <input
                      type="text"
                      placeholder="Shop/Studio address for customer pickup..."
                      value={rentalForm.pickup_address}
                      onChange={(e) => setRentalForm({ ...rentalForm, pickup_address: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRentalModal(false)}
                  className="px-4 py-2 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRentalItem}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  {creatingRentalItem ? "Listing..." : "Publish Rental Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: REPORT DAMAGE CLAIM ═══ */}
      {damageModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-rose-400">⚠️</span>
                  <span>Report Equipment Damage</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Claim security deposit deduction for Booking #{damageModalBooking.id}
                </p>
              </div>
              <button
                onClick={() => setDamageModalBooking(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReportDamageSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300">
                <p>
                  Security Deposit Available: <strong className="text-emerald-400">₹{damageModalBooking.security_deposit_amount}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Damage Description & Inspection Findings</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the damage observed on the returned item (e.g. cracked lens element, broken kickstand, burnt PCB)..."
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Estimated Repair / Replacement Cost (₹)</label>
                <input
                  type="number"
                  required
                  max={damageModalBooking.security_deposit_amount}
                  placeholder={`Max ₹${damageModalBooking.security_deposit_amount}`}
                  value={estimatedRepairCost}
                  onChange={(e) => setEstimatedRepairCost(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDamageModalBooking(null)}
                  className="px-4 py-2 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportingDamage}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg shadow-rose-500/20"
                >
                  {reportingDamage ? "Submitting..." : "Submit Claim for Admin Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      {chatBooking && (
        <BookingChatModal booking={chatBooking} onClose={() => setChatBooking(null)} />
      )}
      {replyReview && (
        <ProviderReplyModal
          review={replyReview}
          onClose={() => setReplyReview(null)}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}

