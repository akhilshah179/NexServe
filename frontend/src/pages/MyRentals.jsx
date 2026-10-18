/**
 * MyRentals.jsx — Customer Rental Order Management & Lifecycle Tracker.
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  getMyRentalBookings,
  updateRentalBookingStatus,
  createRentalReview,
} from "../api/rentalsApi";
import { initiateRentalRazorpayCheckout } from "../utils/razorpay";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import {
  Package,
  CalendarRange,
  ShieldCheck,
  Truck,
  Store,
  Star,
  ArrowRight,
  RotateCcw,
  Wallet,
  PackageOpen,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  PageHeader,
  ButtonLink,
  Button,
  StatCard,
  Tabs,
  StatusBadge,
  LifecycleTrack,
  Modal,
  Field,
  Textarea,
  StarInput,
  EmptyState,
  Skeleton,
  SmartImage,
  useToast,
  cn,
} from "../components/ui";
import { rentalLifecycle, rentalStepIndex, RENTAL_GROUPS } from "../lib/status";
import { rentalImage, rentalVisual } from "../lib/visuals";
import { formatINR, formatDate, formatDateShort, daysBetween, getErrorMessage } from "../lib/format";

export default function MyRentals() {
  const { user } = useAuth();
  const { lastEvent } = useNotifications();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

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

  // Real-time live status updates
  useEffect(() => {
    if (
      lastEvent?.type === "rental_booking_update" ||
      lastEvent?.rental_booking_id ||
      lastEvent?.event === "rental_status_update" ||
      lastEvent?.event === "rental_returned_inspected" ||
      lastEvent?.event === "new_rental_booking"
    ) {
      getMyRentalBookings()
        .then((data) => {
          if (data) setBookings(data);
        })
        .catch(console.warn);
    }
  }, [lastEvent]);

  // Summary Metrics
  const totalBookings = bookings.length;
  const activeCount = bookings.filter(
    (b) => b.status === "RENTED" || b.status === "RETURN_PENDING"
  ).length;
  const completedCount = bookings.filter((b) =>
    ["COMPLETED", "RETURNED", "INSPECTED"].includes(b.status)
  ).length;
  const totalDepositHeld = bookings
    .filter((b) => b.security_deposit?.status === "HELD")
    .reduce((sum, b) => sum + (b.security_deposit_amount || 0), 0);

  // Tab Filtering
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return b.status === "RENTED" || b.status === "RETURN_PENDING";
    if (activeTab === "upcoming")
      return [
        "REQUESTED",
        "CONFIRMED",
        "PAYMENT_COMPLETED",
        "READY_FOR_PICKUP",
        "READY_FOR_DELIVERY",
      ].includes(b.status);
    if (activeTab === "completed")
      return ["COMPLETED", "RETURNED", "INSPECTED"].includes(b.status);
    if (activeTab === "cancelled")
      return ["CANCELLED", "REJECTED", "DAMAGE_REPORTED"].includes(b.status);
    return true;
  });

  const handleCancel = async (bookingId) => {
    const ok = await confirm({
      title: "Cancel this rental?",
      description: "The host will be notified. Any amount already paid is refunded as per the cancellation policy.",
      confirmLabel: "Cancel rental",
      cancelLabel: "Keep rental",
      tone: "danger",
    });
    if (!ok) return;
    try {
      setProcessingAction(true);
      await updateRentalBookingStatus(bookingId, "CANCELLED", "Cancelled by customer");
      await loadRentals();
      toast.success("Rental cancelled");
    } catch (err) {
      toast.error("Couldn't cancel rental", getErrorMessage(err));
    } finally {
      setProcessingAction(false);
    }
  };

  const handlePayNow = (booking) => {
    initiateRentalRazorpayCheckout({
      rentalBooking: booking,
      user,
      onSuccess: async () => {
        toast.success("Payment received", "Your rental is confirmed.");
        await loadRentals();
      },
      onError: (err) => {
        toast.error("Payment not completed", err);
      },
    });
  };

  const handleInitiateReturn = async (e) => {
    e.preventDefault();
    if (!returnBooking) return;
    try {
      setProcessingAction(true);
      await updateRentalBookingStatus(
        returnBooking.id,
        "RETURN_PENDING",
        returnNotes || "Customer initiated item return"
      );
      setReturnBooking(null);
      setReturnNotes("");
      await loadRentals();
      toast.success("Return started", "Hand the item to the host or courier. Your deposit is refunded after inspection.");
    } catch (err) {
      toast.error("Couldn't start return", getErrorMessage(err));
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
      toast.success("Thanks for your review");
    } catch (err) {
      toast.error("Couldn't submit review", getErrorMessage(err));
    } finally {
      setProcessingAction(false);
    }
  };

  const upcomingCount = bookings.filter((b) => RENTAL_GROUPS.upcoming.includes(b.status)).length;
  const cancelledCount = bookings.filter((b) => RENTAL_GROUPS.cancelled.includes(b.status)).length;

  return (
    <div className="pb-24">
      <PageHeader
        accent="rental"
        eyebrow="My rentals"
        title="Your rented gear"
        subtitle="Track handovers, returns and your refundable deposits in one place."
        actions={
          <ButtonLink to="/rentals" variant="rental" iconRight={ArrowRight}>
            Rent something
          </ButtonLink>
        }
      >
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total rentals" value={totalBookings} icon={Package} tone="teal" />
          <StatCard label="Active now" value={activeCount} icon={PackageOpen} tone="emerald" />
          <StatCard label="Deposits held" value={totalDepositHeld} format={(n) => formatINR(n)} icon={Wallet} tone="indigo" hint="Refunded after return" />
          <StatCard label="Completed" value={completedCount} icon={CheckCircle2} tone="blue" />
        </div>
      </PageHeader>

      <div className="container-page">
        <Tabs
          accent="rental"
          ariaLabel="Filter rentals"
          value={activeTab}
          onChange={setActiveTab}
          className="mb-6"
          items={[
            { id: "all", label: "All", count: bookings.length },
            { id: "active", label: "Active", count: activeCount },
            { id: "upcoming", label: "Upcoming", count: upcomingCount },
            { id: "completed", label: "Completed", count: completedCount },
            { id: "cancelled", label: "Cancelled", count: cancelledCount },
          ]}
        />

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            tone="rental"
            icon={Package}
            title={bookings.length === 0 ? "No rentals yet" : "Nothing in this view"}
            description={
              bookings.length === 0
                ? "Cameras, camping kits, party sound and more — rent from verified hosts with a refundable deposit."
                : "Try another filter to see the rest of your rentals."
            }
            action={
              bookings.length === 0 ? (
                <ButtonLink to="/rentals" variant="rental" iconRight={ArrowRight}>Browse rentals</ButtonLink>
              ) : (
                <Button variant="secondary" onClick={() => setActiveTab("all")}>Show all rentals</Button>
              )
            }
          />
        ) : (
          <motion.ul layout className="space-y-4">
            <AnimatePresence initial={false}>
              {filteredBookings.map((b, i) => (
                <motion.li
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 6) * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <RentalOrderCard
                    booking={b}
                    onPayNow={() => handlePayNow(b)}
                    onCancel={() => handleCancel(b.id)}
                    onInitiateReturn={() => setReturnBooking(b)}
                    onReview={() => setReviewBooking(b)}
                    processingAction={processingAction}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      {/* Return */}
      <Modal
        open={!!returnBooking}
        onClose={() => setReturnBooking(null)}
        icon={RotateCcw}
        iconTone="text-emerald-300 bg-emerald-500/12"
        eyebrow={returnBooking ? `Rental #${returnBooking.id}` : undefined}
        title="Start your return"
        description={returnBooking?.rental_item?.title}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="secondary" onClick={() => setReturnBooking(null)}>Not yet</Button>
            <Button type="submit" form="return-form" variant="rental" loading={processingAction} loadingText="Submitting">
              Confirm handover
            </Button>
          </div>
        }
      >
        {returnBooking && (
          <form id="return-form" onSubmit={handleInitiateReturn} className="space-y-5">
            <div className="surface-inset p-4 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-300 shrink-0" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-medium text-white">
                  {formatINR(returnBooking.security_deposit_amount)} deposit
                </p>
                <p className="text-ink-400 mt-0.5 leading-relaxed">
                  The host inspects the item once it's back. Your deposit is released automatically after inspection.
                </p>
              </div>
            </div>
            <Field label="Return notes" hint="Optional — accessories included, courier time, condition notes.">
              <Textarea
                rental
                rows={3}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="e.g. Returned in original box with all accessories; pickup at 2 PM."
              />
            </Field>
          </form>
        )}
      </Modal>

      {/* Review */}
      <Modal
        open={!!reviewBooking}
        onClose={() => setReviewBooking(null)}
        icon={Star}
        iconTone="text-amber-300 bg-amber-500/12"
        title="Rate your rental"
        description={reviewBooking?.rental_item?.title}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="secondary" onClick={() => setReviewBooking(null)}>Cancel</Button>
            <Button type="submit" form="rental-review-form" variant="rental" loading={processingAction} loadingText="Posting" disabled={!reviewComment.trim()}>
              Submit review
            </Button>
          </div>
        }
      >
        <form id="rental-review-form" onSubmit={handleSubmitReview} className="space-y-5">
          <StarInput value={reviewRating} onChange={setReviewRating} label="Rating" />
          <Field label="Your feedback" required>
            <Textarea
              rental
              rows={4}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Condition of the gear, accuracy of the listing, host communication…"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}

function depositInfo(deposit, fallbackAmount) {
  if (!deposit) return null;
  const status = String(deposit.status || "").replace("DepositStatus.", "").toUpperCase();
  const amount = deposit.amount ?? deposit.deposit_amount ?? fallbackAmount ?? 0;
  const deducted = deposit.deduction_amount || deposit.deducted_amount || 0;
  switch (status) {
    case "HELD":
      return { tone: "text-teal-300", icon: ShieldCheck, text: `${formatINR(amount)} deposit held securely`, status };
    case "REFUND_PENDING":
      return { tone: "text-amber-300", icon: Wallet, text: `${formatINR(amount)} refund processing`, status };
    case "REFUNDED":
      return { tone: "text-emerald-300", icon: CheckCircle2, text: `${formatINR(deposit.refund_amount || amount)} deposit refunded`, status };
    case "PARTIALLY_REFUNDED":
      return { tone: "text-amber-300", icon: AlertTriangle, text: `${formatINR(deposit.refund_amount || 0)} refunded · ${formatINR(deducted)} deducted`, status };
    case "FORFEITED":
      return { tone: "text-rose-300", icon: AlertTriangle, text: `Deposit retained for damages`, status };
    default:
      return { tone: "text-ink-400", icon: Wallet, text: `Deposit ${status.toLowerCase().replace(/_/g, " ")}`, status };
  }
}

function RentalOrderCard({ booking, onPayNow, onCancel, onInitiateReturn, onReview, processingAction }) {
  const item = booking.rental_item;
  const delivery = booking.fulfillment_type === "DELIVERY";
  const dep = depositInfo(booking.security_deposit, booking.security_deposit_amount);
  const stepIdx = rentalStepIndex(booking.status, dep?.status);
  const ended = RENTAL_GROUPS.cancelled.includes(booking.status);
  const days = Math.max(1, daysBetween(booking.start_date, booking.end_date));
  const visual = rentalVisual(item?.category);

  return (
    <article className="surface overflow-hidden">
      <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-5">
        <Link to={`/rentals/${booking.rental_item_id}`} className="shrink-0 group" aria-label={`View ${item?.title || "item"}`}>
          <SmartImage
            src={rentalImage(item)}
            alt=""
            fallbackIcon={visual.icon}
            tone="rental"
            className="w-full md:w-36 h-40 md:h-28 rounded-xl"
            imgClassName="transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-ink-500">
                Rental #{booking.id} · Booked {formatDate(booking.created_at)}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white leading-snug">{item?.title || "Rental equipment"}</h3>
            </div>
            <StatusBadge status={booking.status} kind="rental" live={booking.status === "RENTED"} />
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-300">
            <div className="flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-emerald-300" aria-hidden="true" />
              <dt className="sr-only">Dates</dt>
              <dd>
                {formatDateShort(booking.start_date)} → {formatDateShort(booking.end_date)} · {days} day{days > 1 ? "s" : ""}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              {delivery ? <Truck className="w-4 h-4 text-emerald-300" aria-hidden="true" /> : <Store className="w-4 h-4 text-emerald-300" aria-hidden="true" />}
              <dt className="sr-only">Fulfilment</dt>
              <dd className="truncate max-w-[280px]">
                {delivery ? "Delivery to " : "Pickup from "}
                {booking.delivery_address || item?.pickup_address || "the host"}
              </dd>
            </div>
            {booking.quantity > 1 && (
              <div>
                <dt className="sr-only">Quantity</dt>
                <dd>Qty {booking.quantity}</dd>
              </div>
            )}
          </dl>
          {booking.special_instructions && <p className="mt-2 text-[13px] text-ink-500 italic line-clamp-1">“{booking.special_instructions}”</p>}
        </div>
        <div className="md:w-56 shrink-0 flex md:flex-col md:items-end justify-between gap-3 pt-4 md:pt-0 border-t md:border-0 border-white/[0.06]">
          <div className="md:text-right">
            <p className="text-xs text-ink-400">Total paid incl. deposit</p>
            <p className="text-xl font-semibold text-white tabular font-heading">{formatINR(booking.total_amount_charged)}</p>
            {dep && (
              <p className={cn("mt-1 text-xs flex md:justify-end items-center gap-1", dep.tone)}>
                <dep.icon className="w-3.5 h-3.5" aria-hidden="true" />
                {dep.text}
              </p>
            )}
          </div>
          <div className="flex flex-wrap md:justify-end gap-2">
            {booking.status === "REQUESTED" && (
              <>
                <Button size="sm" variant="rental" icon={CreditCard} onClick={onPayNow} disabled={processingAction}>
                  Pay now
                </Button>
                <Button size="sm" variant="danger-ghost" onClick={onCancel} disabled={processingAction}>
                  Cancel
                </Button>
              </>
            )}
            {booking.status === "CONFIRMED" && (
              <Button size="sm" variant="danger-ghost" onClick={onCancel} disabled={processingAction}>
                Cancel rental
              </Button>
            )}
            {booking.status === "RENTED" && (
              <Button size="sm" variant="rental" icon={RotateCcw} onClick={onInitiateReturn} disabled={processingAction}>
                Start return
              </Button>
            )}
            {booking.status === "COMPLETED" && (
              <Button size="sm" variant="secondary" icon={Star} onClick={onReview}>
                Rate item
              </Button>
            )}
            <ButtonLink to={`/rentals/${booking.rental_item_id}`} size="sm" variant="ghost" icon={ExternalLink}>
              Item
            </ButtonLink>
          </div>
        </div>
      </div>
      {!ended && stepIdx >= 0 && (
        <div className="px-5 sm:px-6 py-4 border-t border-white/[0.05] bg-white/[0.012]">
          <LifecycleTrack steps={rentalLifecycle(booking.fulfillment_type)} current={stepIdx} accent="rental" />
        </div>
      )}
    </article>
  );
}
