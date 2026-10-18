import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createBookingSocket } from "../../utils/websocket";
import { XCircle, AlertCircle, ChevronDown, CalendarDays, Phone, ImageIcon, Wifi, WifiOff, Siren } from "lucide-react";
import { cancelBookingApi } from "../../api/bookingsApi";
import { ProgressStepper, Timeline, Avatar, Button, Modal, Field, Textarea, Alert, StatusBadge, KeyValue, cn } from "../ui";
import { BOOKING_STEPS, humanize } from "../../lib/status";
import { formatINRPrecise, formatWeekday, formatDate, formatTime } from "../../lib/format";

export default function BookingLiveTracker({ booking, onStatusUpdate, onClose }) {
  const [currentBooking, setCurrentBooking] = useState(booking);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [showHistory, setShowHistory] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const socketRef = useRef(null);

  useEffect(() => {
    setCurrentBooking(booking);
  }, [booking]);

  useEffect(() => {
    if (!currentBooking?.id) return;

    const ws = createBookingSocket(
      currentBooking.id,
      (payload) => {
        if (payload?.booking) {
          setCurrentBooking((prev) => ({
            ...prev,
            ...payload.booking,
          }));
          if (onStatusUpdate) {
            onStatusUpdate(payload.booking);
          }
        } else if (payload?.status) {
          setCurrentBooking((prev) => ({
            ...prev,
            status: payload.status,
            cancellation_reason: payload.notes || prev.cancellation_reason,
          }));
          if (onStatusUpdate) {
            onStatusUpdate({ ...currentBooking, status: payload.status });
          }
        }
      },
      (status) => {
        setConnectionStatus(status);
      }
    );

    socketRef.current = ws;

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [currentBooking?.id]);

  const rawStatus = (currentBooking?.status || "pending").toLowerCase();
  const isCancelled = rawStatus === "cancelled";
  const isRejected = rawStatus === "rejected";
  const isCompleted = rawStatus === "completed";

  const getStepIndex = (status) => {
    switch (status) {
      case "pending":
      case "requested":
        return 0;
      case "confirmed":
        return 1;
      case "provider_on_the_way":
        return 2;
      case "in_progress":
        return 3;
      case "completed":
        return 4;
      default:
        return -1;
    }
  };

  const activeIndex = getStepIndex(rawStatus);
  const live = connectionStatus === "connected";
  const provider = currentBooking?.provider;

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      setErrorMsg("Please provide a cancellation reason.");
      return;
    }
    setCancelling(true);
    setErrorMsg("");
    try {
      const res = await cancelBookingApi(currentBooking.id, cancelReason);
      setCurrentBooking(res);
      if (onStatusUpdate) onStatusUpdate(res);
      setShowCancelModal(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="surface-raised overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={rawStatus} live={rawStatus === "in_progress" || rawStatus === "provider_on_the_way"} />
            <span
              className={cn("inline-flex items-center gap-1.5 text-xs", live ? "text-emerald-300" : "text-ink-500")}
              title={live ? "Receiving live updates" : `Live updates ${connectionStatus}`}
            >
              {live ? <Wifi className="w-3.5 h-3.5" aria-hidden="true" /> : <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />}
              {live ? "Live" : connectionStatus === "connecting" ? "Connecting…" : "Offline"}
            </span>
            {currentBooking?.is_emergency && (
              <span className="inline-flex items-center gap-1 text-xs text-rose-300">
                <Siren className="w-3.5 h-3.5" aria-hidden="true" /> Emergency
              </span>
            )}
          </div>
          <h3 className="mt-2 text-lg font-semibold text-white truncate">
            {currentBooking?.service?.name || currentBooking?.service?.title || "Service booking"}
          </h3>
          <p className="text-xs text-ink-500">Booking #{currentBooking?.id}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-400">Total</p>
          <p className="text-xl font-semibold text-white tabular font-heading">{formatINRPrecise(currentBooking?.total_amount ?? 0)}</p>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {isCancelled && (
          <Alert tone="error" icon={XCircle} title="Booking cancelled">
            {currentBooking.cancellation_reason || "This booking was cancelled."}
          </Alert>
        )}
        {isRejected && (
          <Alert tone="warning" icon={AlertCircle} title="Request declined">
            The professional wasn't available for this slot. You haven't been charged.
          </Alert>
        )}

        {!isCancelled && !isRejected && (
          <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
            <ProgressStepper
              className="min-w-[440px]"
              steps={BOOKING_STEPS}
              current={isCompleted ? BOOKING_STEPS.length : Math.max(0, activeIndex)}
            />
          </div>
        )}

        <dl className="grid sm:grid-cols-2 gap-4 surface-inset p-4">
          <KeyValue
            icon={CalendarDays}
            label="Scheduled"
            value={
              currentBooking?.booking_date
                ? `${formatWeekday(currentBooking.booking_date)} · ${currentBooking?.time_slot || ""}`
                : "Not scheduled"
            }
          />
          {provider && (
            <div className="min-w-0">
              <dt className="text-xs text-ink-400">Professional</dt>
              <dd className="mt-1 flex items-center gap-2">
                <Avatar src={provider.profile_image} name={provider.full_name || provider.name || "Pro"} size="xs" />
                <span className="text-sm font-medium text-ink-50 truncate">{provider.full_name || provider.name}</span>
                {(provider.phone || provider.phone_number) && (
                  <a
                    href={`tel:${provider.phone || provider.phone_number}`}
                    className="ml-auto inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium text-primary-200 bg-primary-500/12 hover:bg-primary-500/20 transition-colors"
                  >
                    <Phone className="w-3 h-3" aria-hidden="true" /> Call
                  </a>
                )}
              </dd>
            </div>
          )}
          {currentBooking?.attachments?.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-ink-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                Photos ({currentBooking.attachments.length})
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {currentBooking.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block w-16 h-16 rounded-lg overflow-hidden ring-1 ring-white/10 hover:ring-primary-400/60 transition"
                  >
                    <img src={att.file_url} alt={att.file_name || "Attachment"} className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                  </a>
                ))}
              </dd>
            </div>
          )}
        </dl>

        {currentBooking?.status_history?.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              aria-expanded={showHistory}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-300 hover:text-white transition-colors"
            >
              Activity ({currentBooking.status_history.length})
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", showHistory && "rotate-180")} aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>
              {showHistory && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <Timeline
                    className="pt-4"
                    current={currentBooking.status_history.length}
                    items={currentBooking.status_history.map((h) => ({
                      label: humanize(h.to_status),
                      desc: h.notes || undefined,
                      time: `${formatDate(h.created_at)} · ${formatTime(h.created_at)}`,
                    }))}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {((!isCancelled && !isRejected && !isCompleted) || onClose) && (
        <div className="px-5 sm:px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
          {!isCancelled && !isRejected && !isCompleted ? (
            <Button variant="danger-ghost" size="sm" onClick={() => setShowCancelModal(true)}>
              Cancel booking
            </Button>
          ) : (
            <span />
          )}
          {onClose && (
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      )}

      <Modal
        open={showCancelModal}
        onClose={() => !cancelling && setShowCancelModal(false)}
        size="sm"
        icon={XCircle}
        iconTone="text-rose-300 bg-rose-500/12"
        title="Cancel this booking?"
        description="Your professional will be notified straight away."
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCancelModal(false)} disabled={cancelling}>
              Keep booking
            </Button>
            <Button variant="danger" onClick={handleCancelBooking} loading={cancelling} loadingText="Cancelling">
              Cancel booking
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Reason" required error={errorMsg || undefined}>
            <Textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                setErrorMsg("");
              }}
              placeholder="e.g. Change of plans, booked by mistake"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
