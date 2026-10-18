/**
 * ServiceHistory.jsx — Completed & Past Service Ledger for Customers.
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getMyBookings } from "../api/bookingsApi";
import ReviewModal from "../components/reviews/ReviewModal";
import {
  Receipt,
  CheckCircle2,
  CalendarClock,
  Wallet,
  Star,
  Eye,
  Plus,
  RotateCcw,
  Siren,
  SearchX,
  CalendarDays,
  Clock,
  MapPin,
  StickyNote,
  XCircle,
} from "lucide-react";
import {
  PageHeader,
  ButtonLink,
  Button,
  StatCard,
  Tabs,
  StatusBadge,
  SearchBar,
  Drawer,
  Timeline,
  Avatar,
  EmptyState,
  ErrorState,
  Skeleton,
  Alert,
  KeyValue,
  cn,
} from "../components/ui";
import { BOOKING_GROUPS, BOOKING_STEPS, bookingStepIndex, humanize } from "../lib/status";
import { serviceVisual } from "../lib/visuals";
import { formatINR, formatINRPrecise, formatDate, formatTime } from "../lib/format";

export default function ServiceHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();

  const loadBookings = async () => {
    setLoadError(false);
    try {
      const data = await getMyBookings();
      setBookings(data || []);
    } catch (err) {
      console.error("Failed to load service history:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const activeBookings = bookings.filter((b) => BOOKING_GROUPS.upcoming.includes(b.status)).length;
  const totalSpent = bookings
    .filter((b) => b.status === "completed" || b.status === "confirmed")
    .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

  const filteredBookings = bookings.filter((b) => {
    if (filter === "completed") return b.status === "completed";
    if (filter === "upcoming") return BOOKING_GROUPS.upcoming.includes(b.status);
    if (filter === "cancelled") return ["cancelled", "rejected"].includes(b.status);
    return true;
  });

  const cancelledCount = bookings.filter((b) => BOOKING_GROUPS.cancelled.includes(b.status)).length;

  const visibleBookings = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? filteredBookings.filter((b) =>
          [b.service?.title, b.provider?.full_name, `#${b.id}`].some((v) => (v || "").toLowerCase().includes(q))
        )
      : filteredBookings;
    return [...list].sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
  }, [filteredBookings, query]);

  const rebook = (b) => navigate(b.provider_id ? `/providers/${b.provider_id}` : "/services");

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Service history"
        title="Your bookings"
        subtitle="Every appointment, receipt and review in one place."
        actions={
          <ButtonLink to="/services" icon={Plus}>
            Book a service
          </ButtonLink>
        }
      >
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total bookings" value={totalBookings} icon={Receipt} tone="indigo" />
          <StatCard label="Upcoming & active" value={activeBookings} icon={CalendarClock} tone="blue" />
          <StatCard label="Completed" value={completedBookings} icon={CheckCircle2} tone="emerald" />
          <StatCard label="Total spent" value={totalSpent} format={(n) => formatINR(n)} icon={Wallet} tone="amber" />
        </div>
      </PageHeader>

      <div className="container-page">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <Tabs
            ariaLabel="Filter bookings"
            value={filter}
            onChange={setFilter}
            items={[
              { id: "all", label: "All", count: bookings.length },
              { id: "upcoming", label: "Upcoming", count: activeBookings },
              { id: "completed", label: "Completed", count: completedBookings },
              { id: "cancelled", label: "Cancelled", count: cancelledCount },
            ]}
          />
          <SearchBar value={query} onChange={setQuery} placeholder="Search service, pro or booking ID" className="lg:w-80" ariaLabel="Search bookings" />
        </div>

        {loading ? (
          <div className="surface divide-y divide-white/[0.05]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-5 flex items-center gap-4">
                <Skeleton className="w-11 h-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <ErrorState title="Your bookings didn't load" onRetry={() => { setLoading(true); loadBookings(); }} />
        ) : visibleBookings.length === 0 ? (
          <EmptyState
            icon={query ? SearchX : Receipt}
            title={query ? "No bookings match your search" : bookings.length ? "Nothing in this view" : "No bookings yet"}
            description={
              query
                ? "Try a service name, professional or booking number."
                : bookings.length
                ? "Switch filters to see your other bookings."
                : "When you book a service it shows up here with live tracking and receipts."
            }
            action={
              bookings.length ? (
                <Button variant="secondary" onClick={() => { setQuery(""); setFilter("all"); }}>Show all bookings</Button>
              ) : (
                <ButtonLink to="/services">Explore services</ButtonLink>
              )
            }
          />
        ) : (
          <div className="surface overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_110px_150px_auto] gap-4 px-5 py-3 border-b border-white/[0.06] text-xs font-medium text-ink-500">
              <span>Service</span>
              <span>Professional</span>
              <span>Scheduled</span>
              <span className="text-right">Amount</span>
              <span>Status</span>
              <span className="sr-only">Actions</span>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              <AnimatePresence initial={false}>
                {visibleBookings.map((b, i) => {
                  const v = serviceVisual(b.service?.category);
                  const Icon = v.icon;
                  return (
                    <motion.li
                      key={b.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.03 } }}
                      exit={{ opacity: 0 }}
                      className="group md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_110px_150px_auto] md:items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", v.toneClasses.bg)}>
                          <Icon className={cn("w-5 h-5", v.toneClasses.icon)} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{b.service?.title || `Service #${b.service_id}`}</p>
                          <p className="text-xs text-ink-500 flex items-center gap-1.5">
                            #{b.id}
                            {b.is_emergency && (
                              <span className="inline-flex items-center gap-1 text-rose-300">
                                <Siren className="w-3 h-3" aria-hidden="true" /> Emergency
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="md:hidden shrink-0">
                          <StatusBadge status={b.status} size="sm" />
                        </div>
                      </div>
                      <div className="hidden md:flex items-center gap-2 min-w-0">
                        <Avatar src={b.provider?.profile_image} name={b.provider?.full_name || "Pro"} size="xs" />
                        <span className="text-sm text-ink-200 truncate">{b.provider?.full_name || `Provider #${b.provider_id}`}</span>
                      </div>
                      <div className="mt-3 md:mt-0 flex md:block items-center justify-between text-sm">
                        <div>
                          <p className="text-ink-100">{formatDate(b.booking_date)}</p>
                          <p className="text-xs text-ink-500">{b.time_slot}</p>
                        </div>
                        <p className="md:hidden text-base font-semibold text-white tabular">{formatINR(b.total_amount)}</p>
                      </div>
                      <p className="hidden md:block text-sm font-semibold text-white tabular text-right">{formatINR(b.total_amount)}</p>
                      <div className="hidden md:block">
                        <StatusBadge status={b.status} size="sm" />
                      </div>
                      <div className="mt-3 md:mt-0 flex items-center gap-1.5 md:justify-end">
                        <Button size="xs" variant="ghost" icon={Eye} onClick={() => setSelectedBooking(b)} className="flex-1 md:flex-none">
                          Details
                        </Button>
                        {b.status === "completed" && (
                          <Button size="xs" variant="ghost" icon={Star} onClick={() => setReviewBooking(b)} className="flex-1 md:flex-none text-amber-300">
                            {b.review ? `${b.review.rating}/5` : "Rate"}
                          </Button>
                        )}
                        <Button size="xs" variant="secondary" icon={RotateCcw} onClick={() => rebook(b)} className="flex-1 md:flex-none">
                          Rebook
                        </Button>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
        )}
      </div>

      <BookingDetailDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onReview={(b) => {
          setSelectedBooking(null);
          setReviewBooking(b);
        }}
        onRebook={rebook}
      />

      {reviewBooking && <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} onSuccess={() => loadBookings()} />}
    </div>
  );
}

function BookingDetailDrawer({ booking, onClose, onReview, onRebook }) {
  const b = booking;
  const isCancelled = b && ["cancelled", "rejected"].includes(b.status);
  const current = b ? bookingStepIndex(b.status) : -1;
  const history = Array.isArray(b?.status_history) ? b.status_history : [];
  const items = history.length
    ? history.map((h) => ({
        label: humanize(h.to_status),
        desc: h.notes || undefined,
        time: `${formatDate(h.created_at)} · ${formatTime(h.created_at)}`,
      }))
    : BOOKING_STEPS.map((s) => ({ label: s.label, desc: s.desc, icon: s.icon }));
  const timelineCurrent = history.length ? (b?.status === "completed" ? items.length : items.length - 1) : b?.status === "completed" ? 5 : current;

  return (
    <Drawer
      open={!!b}
      onClose={onClose}
      title={b ? `Booking #${b.id}` : ""}
      width="max-w-md"
      footer={
        b && (
          <div className="flex gap-2">
            {b.status === "completed" && (
              <Button variant="secondary" icon={Star} onClick={() => onReview(b)} className="flex-1">
                Rate
              </Button>
            )}
            <Button icon={RotateCcw} onClick={() => onRebook(b)} className="flex-1">
              Book again
            </Button>
          </div>
        )
      }
    >
      {b && (
        <div className="p-5 space-y-6">
          <div>
            <StatusBadge status={b.status} size="lg" />
            <h3 className="mt-3 text-xl font-semibold text-white">{b.service?.title || `Service #${b.service_id}`}</h3>
            <div className="mt-3 flex items-center gap-3">
              <Avatar src={b.provider?.profile_image} name={b.provider?.full_name || "Pro"} size="sm" />
              <div>
                <p className="text-sm text-white">{b.provider?.full_name || "Assigned professional"}</p>
                <p className="text-xs text-ink-500">Professional</p>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 surface-inset p-4">
            <KeyValue icon={CalendarDays} label="Date" value={formatDate(b.booking_date)} />
            <KeyValue icon={Clock} label="Time" value={b.time_slot} />
            <KeyValue icon={Wallet} label="Amount" value={formatINRPrecise(b.total_amount)} />
            {b.address?.full_address && <KeyValue icon={MapPin} label="Address" value={b.address.full_address} className="col-span-2" />}
          </dl>

          {b.cancellation_reason && (
            <Alert tone="error" icon={XCircle} title={b.status === "rejected" ? "Declined" : "Cancelled"}>
              {b.cancellation_reason}
            </Alert>
          )}

          {b.notes && (
            <div className="surface-inset p-4">
              <p className="text-xs text-ink-400 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" aria-hidden="true" /> Your notes
              </p>
              <p className="mt-1 text-sm text-ink-100">{b.notes}</p>
            </div>
          )}

          {!isCancelled && (
            <div>
              <p className="text-sm font-semibold text-white mb-4">{history.length ? "Activity" : "Progress"}</p>
              <Timeline items={items} current={timelineCurrent} />
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
