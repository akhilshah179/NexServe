/**
 * AdminDashboard.jsx — SaaS-Style Control Suite for NexServe Admins.
 *
 * Features:
 * - High-level KPI Stats Grid: Total Users, Providers, Active Services, Bookings, Platform Revenue
 * - SaaS Tab Navigation:
 *   1. Provider Verification Approvals
 *   2. User & Provider Management (role switching & deactivation)
 *   3. Categories Manager (add new service categories)
 *   4. Bookings Ledger & Status Monitoring
 *   5. Payments & Razorpay Refund Processing
 *   6. Customer Contact Messages
 *   7. System Audit Logs
 */

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getAdminStats,
  getPendingProvidersApi,
  approveProviderApi,
  rejectProviderApi,
  getAllUsers,
  toggleUserActiveApi,
  getAllBookings,
  getAllMessages,
  updateUserRole,
  createCategoryApi,
  fetchAuditLogsApi,
  markMessageRead,
} from "../api/adminApi";
import { fetchPaymentsApi, processRefundApi } from "../api/paymentsApi";
import { getCategories } from "../api/servicesApi";
import { getRentalDamageClaims, reviewRentalDamageClaim } from "../api/rentalsApi";


export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [damageClaims, setDamageClaims] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("approvals");
  const [actionLoading, setActionLoading] = useState(null);

  // Rejection Modal
  const [rejectModalProvider, setRejectModalProvider] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // New Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("⚡");

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        statsData,
        pendingData,
        usersData,
        bookingsData,
        paymentsData,
        messagesData,
        categoriesData,
        auditData,
        damageClaimsData,
      ] = await Promise.all([
        getAdminStats(),
        getPendingProvidersApi(),
        getAllUsers(),
        getAllBookings(),
        fetchPaymentsApi(),
        getAllMessages(),
        getCategories(),
        fetchAuditLogsApi(),
        getRentalDamageClaims().catch(() => []),
      ]);

      setStats(statsData);
      setPendingProviders(pendingData || []);
      setUsers(usersData || []);
      setBookings(bookingsData || []);
      setPayments(paymentsData || []);
      setMessages(messagesData || []);
      setCategories(categoriesData || []);
      setAuditLogs(auditData || []);
      setDamageClaims(damageClaimsData || []);
    } catch (err) {
      console.warn("Failed to load admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleApprove = async (providerId) => {
    setActionLoading(`approve-${providerId}`);
    try {
      await approveProviderApi(providerId);
      alert("Provider has been approved successfully.");
      await loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to approve provider.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModalProvider || !rejectionReason.trim()) return;
    setActionLoading(`reject-${rejectModalProvider.id}`);
    try {
      await rejectProviderApi(rejectModalProvider.id, rejectionReason.trim());
      alert("Provider application rejected.");
      setRejectModalProvider(null);
      setRejectionReason("");
      await loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reject provider.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (userId) => {
    setActionLoading(`user-${userId}`);
    try {
      await toggleUserActiveApi(userId);
      await loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update user status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(`role-${userId}`);
    try {
      await updateUserRole(userId, newRole);
      await loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to change user role.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      await createCategoryApi({
        name: newCatName,
        description: newCatDesc,
        icon_url: newCatIcon,
      });
      alert("New service category created successfully!");
      setShowCategoryModal(false);
      setNewCatName("");
      setNewCatDesc("");
      await loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create category.");
    }
  };

  const handleProcessRefund = async (paymentId) => {
    const reason = prompt("Enter reason for processing payment refund:");
    if (!reason) return;
    setActionLoading(`refund-${paymentId}`);
    try {
      await processRefundApi(paymentId, reason);
      alert("Refund processed successfully.");
      await loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to process refund.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewClaim = async (claimId, status, approvedAmount = 0) => {
    const adminNotes = prompt(`Enter admin notes for claim ${status}:`, status === "APPROVED" ? "Damage verified and deduction approved." : "Claim rejected, deposit refunded.");
    if (adminNotes === null) return;
    setActionLoading(`claim-${claimId}`);
    try {
      await reviewRentalDamageClaim(claimId, {
        status,
        approved_deduction_amount: status === "APPROVED" ? Number(approvedAmount) : 0,
        admin_notes: adminNotes,
      });
      alert(`Claim #${claimId} resolved as ${status}.`);
      await loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to review damage claim.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-surface-850 border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white">NexServe Admin Control Suite</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30">
              🔑 System Admin
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Platform management, verification, audit logs, and analytics.</p>
        </div>

        <button
          onClick={() => setShowCategoryModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold text-xs shadow-lg shadow-primary-500/25"
        >
          + Create Category
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-3xl bg-surface-850 border border-white/10">
          <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Total Users</span>
          <span className="text-xl font-extrabold text-white">{stats?.total_users || users.length}</span>
        </div>

        <div className="p-5 rounded-3xl bg-surface-850 border border-white/10">
          <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Providers</span>
          <span className="text-xl font-extrabold text-primary-300">{stats?.total_providers || 0}</span>
        </div>

        <div className="p-5 rounded-3xl bg-surface-850 border border-white/10">
          <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Active Services</span>
          <span className="text-xl font-extrabold text-accent-400">{stats?.total_services || 0}</span>
        </div>

        <div className="p-5 rounded-3xl bg-surface-850 border border-white/10">
          <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Total Bookings</span>
          <span className="text-xl font-extrabold text-amber-400">{stats?.total_bookings || bookings.length}</span>
        </div>

        <div className="p-5 rounded-3xl bg-surface-850 border border-white/10 col-span-2 lg:col-span-1">
          <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Platform Revenue</span>
          <span className="text-xl font-extrabold text-emerald-400">₹{stats?.total_revenue || 0}</span>
        </div>
      </div>

      {/* SaaS Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        {[
          { id: "approvals", label: `Pending Approvals (${pendingProviders.length})` },
          { id: "claims", label: `⚠️ Rental Damage Claims (${damageClaims.filter((c) => c.status === "PENDING").length})` },
          { id: "users", label: `Users (${users.length})` },
          { id: "categories", label: `Categories (${categories.length})` },
          { id: "bookings", label: `Bookings (${bookings.length})` },
          { id: "payments", label: `Payments (${payments.length})` },
          { id: "messages", label: `Contact Messages (${messages.length})` },
          { id: "audit", label: "Audit Logs" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? tab.id === "claims"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-500/25"
                  : "bg-primary-600 text-white shadow-lg shadow-primary-500/25"
                : "bg-surface-850 border border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PENDING PROVIDERS APPROVALS */}
      {activeTab === "approvals" && (
        <div className="p-6 rounded-3xl bg-surface-850 border border-white/10 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-4">Pending Provider Verification Queue</h2>
          {pendingProviders.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">No pending provider verification requests.</div>
          ) : (
            <div className="grid gap-4">
              {pendingProviders.map((p) => (
                <div key={p.id} className="p-5 rounded-2xl bg-surface-800 border border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{p.full_name}</h3>
                    <p className="text-xs text-gray-400">{p.email} • {p.location}</p>
                    <p className="text-xs text-gray-300 mt-1 italic">"{p.bio}"</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={actionLoading === `approve-${p.id}`}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectModalProvider(p)}
                      className="px-4 py-2 rounded-xl bg-error-500/20 text-error-300 text-xs border border-error-500/30"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1.5: RENTAL DAMAGE CLAIMS & ESCROW ARBITRATION */}
      {activeTab === "claims" && (
        <div className="p-6 rounded-3xl bg-surface-850 border border-white/10 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🛡️</span>
                <span>Rental Damage Claims & Security Deposit Arbitration</span>
              </h2>
              <p className="text-xs text-gray-400">
                Review host damage reports, verify repair estimates, and release or deduct security deposits held in escrow.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {damageClaims.filter((c) => c.status === "PENDING").length} Pending Review
            </span>
          </div>

          {damageClaims.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No damage claims filed. All rentals currently active or completed with 100% clean deposit return.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="uppercase tracking-wider bg-surface-800 text-gray-400 border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3">Claim ID</th>
                    <th className="px-4 py-3">Booking & Item</th>
                    <th className="px-4 py-3">Claim Description</th>
                    <th className="px-4 py-3">Claimed Cost</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Admin Arbitration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {damageClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-surface-800/40 transition">
                      <td className="px-4 py-4 font-bold text-white">#{claim.id}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-white">Booking #{claim.rental_booking_id}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(claim.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <p className="text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/20">
                          {claim.damage_description}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-bold text-rose-400">
                        ₹{claim.estimated_repair_cost}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`font-bold text-[10px] px-2.5 py-1 rounded-full border ${
                            claim.status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : claim.status === "REJECTED"
                              ? "bg-gray-700 text-gray-300 border-white/10"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {claim.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReviewClaim(claim.id, "APPROVED", claim.estimated_repair_cost)}
                              disabled={actionLoading === `claim-${claim.id}`}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                            >
                              Approve Deduction
                            </button>
                            <button
                              onClick={() => handleReviewClaim(claim.id, "REJECTED", 0)}
                              disabled={actionLoading === `claim-${claim.id}`}
                              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold text-xs border border-rose-500/30"
                            >
                              Reject & Refund Deposit
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-500">
                            Arbitrated ({claim.admin_notes || "Resolved"})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="p-6 rounded-3xl bg-surface-850 border border-white/10 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-4">All Registered Platform Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="uppercase tracking-wider bg-surface-800 text-gray-400 border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name & Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-800/50">
                    <td className="px-4 py-4 font-bold text-white">#{u.id}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">{u.full_name}</div>
                      <div className="text-gray-400 text-[11px]">{u.email}</div>
                    </td>
                    <td className="px-4 py-4 capitalize font-bold">{u.role}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-error-500/20 text-error-400"}`}>
                        {u.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-surface-800 text-xs text-white p-1 rounded border border-white/10"
                        >
                          <option value="customer">CUSTOMER</option>
                          <option value="provider">PROVIDER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                        <button
                          onClick={() => handleToggleActive(u.id)}
                          className="px-2.5 py-1 rounded bg-surface-750 text-xs font-bold"
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-850 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Category</h3>
            <form onSubmit={handleCreateCategorySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pest Control"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-surface-800 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Category description..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full p-3 rounded-xl bg-surface-800 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">Icon Emoji / URL</label>
                <input
                  type="text"
                  required
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-full p-3 rounded-xl bg-surface-800 border border-white/10 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-gray-400">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provider Reject Reason Modal */}
      {rejectModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-850 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Reject Provider #{rejectModalProvider.id}</h3>
            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">Rejection Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State reason for rejecting application..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 rounded-xl bg-surface-800 border border-white/10 text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setRejectModalProvider(null)} className="px-4 py-2 text-gray-400">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-error-600 text-white font-bold">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
