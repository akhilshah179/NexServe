/**
 * Dashboard.jsx — Personal Consumer Dashboard for Customers.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { getMyBookings } from "../api/bookingsApi";
import { getCategories } from "../api/servicesApi";
import { initiateRazorpayCheckout } from "../utils/razorpay";
import AddressManager from "../components/addresses/AddressManager";
import BookingChatModal from "../components/chat/BookingChatModal";
import ReviewModal from "../components/reviews/ReviewModal";
import BookingLiveTracker from "../components/booking/BookingLiveTracker";
import ReferralCard from "../components/referrals/ReferralCard";
import RecommendationSection from "../components/recommendations/RecommendationSection";
import BookingWizardModal from "../components/booking/BookingWizardModal";
import { applyToBecomeProviderApi } from "../api/providersApi";
import {
  CalendarClock,
  MessageSquare,
  Star,
  Receipt,
  Wallet,
  Package,
  ArrowRight,
  Activity,
  CreditCard,
  Plus,
  Radio,
  Wrench,
  ShieldCheck,
} from "lucide-react";
import CategoryCard from "../components/cards/CategoryCard";
import {
  Avatar,
  Button,
  ButtonLink,
  StatCard,
  StatusBadge,
  SearchBar,
  Modal,
  EmptyState,
  ErrorState,
  Skeleton,
  Reveal,
  Stagger,
  StaggerItem,
  useToast,
  cn,
} from "../components/ui";
import { BOOKING_GROUPS } from "../lib/status";
import { serviceVisual } from "../lib/visuals";
import { formatINR, formatDate } from "../lib/format";

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const { lastEvent } = useNotifications();
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadError, setLoadError] = useState(false);

  // Active Modals
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [chatBooking, setChatBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [wizardService, setWizardService] = useState(null);
  const [trackedBooking, setTrackedBooking] = useState(null);

  // Dual-role Provider Application State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyForm, setApplyForm] = useState({
    business_name: "",
    category_id: 1,
    hourly_rate: 499,
    bio: "",
  });

  const isProviderAccount = user?.is_provider || user?.role === "provider";

  const loadData = async () => {
    try {
      const [bookingsData, catData] = await Promise.all([
        getMyBookings(),
        getCategories(),
      ]);
      setBookings(bookingsData || []);
      setCategories(catData || []);
      setLoadError(false);
    } catch (err) {
      console.warn("Failed to load customer dashboard data:", err);
      setLoadError(true);
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
          return prev.map((b) =>
            b.id === lastEvent.booking.id ? { ...b, ...lastEvent.booking } : b
          );
        } else {
          return [lastEvent.booking, ...prev];
        }
      });
    } else if (lastEvent?.booking_id && lastEvent?.status) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === lastEvent.booking_id
            ? { ...b, status: lastEvent.status, notes: lastEvent.notes || b.notes }
            : b
        )
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
        toast.success("Payment received", "Your booking is confirmed.");
      },
      onError: (errMsg) => {
        toast.error("Payment not completed", errMsg || "Payment process cancelled.");
        setActionLoading(null);
      },
    });
  };

  const handleStatusUpdate = (updatedBooking) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b))
    );
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyForm.business_name.trim()) {
      toast.error("Please enter your business or professional name.");
      return;
    }
    setApplying(true);
    try {
      await applyToBecomeProviderApi({
        business_name: applyForm.business_name.trim(),
        category_id: Number(applyForm.category_id) || 1,
        hourly_rate: Number(applyForm.hourly_rate) || 499,
        bio: applyForm.bio.trim() || "Experienced professional ready to serve NexServe customers.",
      });
      toast.success("Application Submitted!", "Your provider profile is now pending admin review. You can continue using customer features.");
      updateUser({
        ...user,
        is_provider: true,
        verification_status: "pending",
        business_name: applyForm.business_name.trim(),
      });
      setShowApplyModal(false);
    } catch (err) {
      toast.error("Application Failed", err.message || "Failed to submit provider application.");
    } finally {
      setApplying(false);
    }
  };

  const totalSpent = bookings
    .filter((b) => b.status === "completed" || b.status === "confirmed")
    .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

  const activeBooking = bookings.find((b) =>
    ["pending", "requested", "confirmed", "provider_on_the_way", "in_progress"].includes(b.status)
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name?.split(" ")[0] || "there";
  const activeCount = bookings.filter((b) => BOOKING_GROUPS.upcoming.includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const recent = bookings.slice(0, 5);

  return (
    <div className="pb-24">
      {/* Greeting */}
      <header className="relative pt-28 sm:pt-32 pb-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 -z-10 bg-[radial-gradient(60%_100%_at_30%_0%,rgb(116_104_240/0.14),transparent)]" aria-hidden="true" />
        <div className="container-page">
          <Reveal y={12} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar src={user?.profile_image} name={user?.full_name || "You"} size="xl" />
              <div className="min-w-0">
                <p className="text-sm text-ink-400">{greeting}</p>
                <h1 className="text-3xl sm:text-4xl font-semibold text-white truncate">{firstName}</h1>
                <p className="text-sm text-ink-500 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <ButtonLink to="/services" icon={Plus}>
                Book a service
              </ButtonLink>
              <ButtonLink to="/rentals" variant="secondary" icon={Package}>
                Rent gear
              </ButtonLink>
            </div>
          </Reveal>

          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total bookings" value={loading ? "—" : bookings.length} icon={Receipt} tone="indigo" />
            <StatCard label="Upcoming & active" value={loading ? "—" : activeCount} icon={CalendarClock} tone="blue" />
            <StatCard label="Completed" value={loading ? "—" : completedCount} icon={Star} tone="emerald" />
            <StatCard label="Total spent" value={loading ? "—" : totalSpent} format={(n) => formatINR(n)} icon={Wallet} tone="amber" />
          </div>

          <SearchBar
            className="mt-6 max-w-2xl"
            value={searchQuery}
            onChange={setSearchQuery}
            submitLabel="Search"
            placeholder="What do you need done today?"
            ariaLabel="Search services"
            onSubmit={(q) => q.trim() && navigate(`/services?search=${encodeURIComponent(q.trim())}`)}
          />
        </div>
      </header>

      <div className="container-page space-y-12">
        {loadError && (
          <ErrorState title="Your dashboard didn't fully load" onRetry={() => { setLoading(true); loadData(); }} />
        )}

        {/* Dual-role Provider Status or Invitation */}
        {isProviderAccount ? (
          <div className="surface p-5 sm:p-6 border border-white/[0.08] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-accent-500/10 text-accent-400 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">Provider Capability Active</h3>
                  <StatusBadge status={user?.verification_status || "pending"} size="xs" />
                </div>
                <p className="text-xs text-ink-400 mt-0.5">
                  {user?.verification_status === "approved"
                    ? "Your provider profile is verified and active. You can fulfill service jobs or list rental items."
                    : user?.verification_status === "suspended"
                    ? "Your provider capabilities are currently suspended. Your customer account and bookings remain unaffected."
                    : "Your provider application is awaiting administrator verification. In the meantime, you can continue booking services as a customer."}
                </p>
              </div>
            </div>
            {user?.verification_status === "approved" ? (
              <ButtonLink to="/provider" variant="secondary" size="sm" iconRight={ArrowRight}>
                Open Provider Workspace
              </ButtonLink>
            ) : null}
          </div>
        ) : (
          <div className="surface p-5 sm:p-6 border border-accent-500/20 bg-gradient-to-r from-accent-500/[0.06] to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 text-accent-400 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Earn with NexServe</h3>
                <p className="text-xs text-ink-400 mt-0.5">
                  Provide services or rent out gear using this account. No duplicate logins or lost booking history.
                </p>
              </div>
            </div>
            <Button size="sm" icon={ShieldCheck} onClick={() => setShowApplyModal(true)}>
              Apply to Become a Provider
            </Button>
          </div>
        )}

        {/* Live tracker */}
        {activeBooking && (
          <section aria-labelledby="live-h">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-emerald-300" aria-hidden="true" />
              <h2 id="live-h" className="text-lg font-semibold text-white">Happening now</h2>
            </div>
            <BookingLiveTracker booking={activeBooking} onStatusUpdate={handleStatusUpdate} />
          </section>
        )}

        {/* Recent bookings */}
        <section aria-labelledby="recent-h">
          <div className="flex items-end justify-between gap-3 mb-4">
            <h2 id="recent-h" className="text-lg font-semibold text-white">Recent bookings</h2>
            <ButtonLink to="/history" variant="ghost" size="sm" iconRight={ArrowRight}>
              All history
            </ButtonLink>
          </div>
          {loading ? (
            <div className="surface divide-y divide-white/[0.05]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="p-5 flex items-center gap-4">
                  <Skeleton className="w-11 h-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarClock}
              title="No bookings yet"
              description="Book your first service — it'll appear here with live tracking and chat."
              action={<ButtonLink to="/services">Explore services</ButtonLink>}
            />
          ) : (
            <Stagger animateOnMount className="surface divide-y divide-white/[0.05] overflow-hidden" as="ul">
              {recent.map((b) => {
                const v = serviceVisual(b.service?.category);
                const Icon = v.icon;
                return (
                  <StaggerItem as="li" key={b.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-white/[0.015] transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", v.toneClasses.bg)}>
                        <Icon className={cn("w-5 h-5", v.toneClasses.icon)} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{b.service?.name || b.service?.title}</p>
                        <p className="text-xs text-ink-400 truncate">
                          {b.provider?.full_name || "Professional"} · {formatDate(b.booking_date)} · {b.time_slot}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <StatusBadge status={b.status} size="sm" />
                      <span className="text-sm font-semibold text-white tabular w-20 text-right">{formatINR(b.total_amount)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:justify-end">
                      {b.status === "pending" && (
                        <Button size="xs" icon={CreditCard} onClick={() => handlePayBooking(b)} loading={actionLoading === b.id} loadingText="Opening">
                          Pay
                        </Button>
                      )}
                      <Button size="xs" variant="secondary" icon={Activity} onClick={() => setTrackedBooking(b)}>
                        Track
                      </Button>
                      <Button size="xs" variant="ghost" icon={MessageSquare} onClick={() => setChatBooking(b)} aria-label={`Chat about booking ${b.id}`}>
                        <span className="hidden sm:inline">Chat</span>
                      </Button>
                      {b.status === "completed" && (
                        <Button size="xs" variant="ghost" icon={Star} className="text-amber-300" onClick={() => setReviewBooking(b)}>
                          Review
                        </Button>
                      )}
                    </div>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-start">
          <AddressManager selectedAddressId={selectedAddress?.id} onSelectAddress={(addr) => setSelectedAddress(addr)} />
          <div className="surface p-5 sm:p-6">
            <h2 className="text-base font-semibold text-white">Your rentals</h2>
            <p className="text-[13px] text-ink-400 mt-0.5">Track handovers, returns and deposits.</p>
            <div className="mt-5 grid gap-2">
              <ButtonLink to="/my-rentals" variant="secondary" iconRight={ArrowRight} className="justify-between">
                Open My Rentals
              </ButtonLink>
              <ButtonLink to="/rentals" variant="ghost" className="justify-between" iconRight={ArrowRight}>
                Browse the catalogue
              </ButtonLink>
            </div>
          </div>
        </div>

        <ReferralCard />

        <RecommendationSection onSelectService={(svc) => setWizardService(svc)} />

        {categories.length > 0 && (
          <section aria-labelledby="cat-h">
            <div className="flex items-end justify-between gap-3 mb-4">
              <h2 id="cat-h" className="text-lg font-semibold text-white">Book by category</h2>
              <ButtonLink to="/services" variant="ghost" size="sm" iconRight={ArrowRight}>
                All services
              </ButtonLink>
            </div>
            <div className="grid gap-3 grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4">
              {categories.slice(0, 8).map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Tracker modal */}
      <Modal open={!!trackedBooking} onClose={() => setTrackedBooking(null)} size="lg" hideClose bodyClassName="!p-0">
        {trackedBooking && (
          <BookingLiveTracker booking={trackedBooking} onClose={() => setTrackedBooking(null)} onStatusUpdate={handleStatusUpdate} />
        )}
      </Modal>

      {chatBooking && <BookingChatModal booking={chatBooking} onClose={() => setChatBooking(null)} />}

      {reviewBooking && <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} onSuccess={() => loadData()} />}

      {wizardService && (
        <BookingWizardModal
          service={wizardService}
          onClose={() => setWizardService(null)}
          onBooked={() => loadData()}
          onSuccess={() => {
            setWizardService(null);
            loadData();
          }}
        />
      )}

      {/* Become Provider Modal */}
      <Modal
        open={showApplyModal}
        onClose={() => !applying && setShowApplyModal(false)}
        title="Become a NexServe Provider"
        size="md"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4">
          <p className="text-xs text-ink-400">
            Expand your account to provide services or list rentals. Your existing customer profile, reviews, and bookings will be fully preserved.
          </p>

          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1">Business or Professional Name</label>
            <input
              type="text"
              required
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-accent-500"
              placeholder="e.g. Apex Home Repairs / John Doe"
              value={applyForm.business_name}
              onChange={(e) => setApplyForm({ ...applyForm, business_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-300 mb-1">Primary Category</label>
              <select
                className="w-full bg-slate-900 border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500"
                value={applyForm.category_id}
                onChange={(e) => setApplyForm({ ...applyForm, category_id: e.target.value })}
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name}
                    </option>
                  ))
                ) : (
                  <option value={1} className="bg-slate-900 text-white">General Services</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-300 mb-1">Starting Hourly Rate (₹)</label>
              <input
                type="number"
                min="99"
                max="10000"
                required
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-accent-500"
                value={applyForm.hourly_rate}
                onChange={(e) => setApplyForm({ ...applyForm, hourly_rate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-300 mb-1">Bio / Experience Summary</label>
            <textarea
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-accent-500 resize-none"
              placeholder="Describe your skills, years of experience, or equipment available..."
              value={applyForm.bio}
              onChange={(e) => setApplyForm({ ...applyForm, bio: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowApplyModal(false)} disabled={applying}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={applying} loadingText="Submitting...">
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
