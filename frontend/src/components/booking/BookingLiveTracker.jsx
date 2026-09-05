import React, { useEffect, useState, useRef } from "react";
import { createBookingSocket } from "../../utils/websocket";
import {
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiTool,
  FiCheck,
  FiXCircle,
  FiAlertCircle,
  FiRadio,
  FiChevronDown,
  FiChevronUp,
  FiMapPin,
  FiCalendar,
  FiUser,
  FiPhone,
  FiMessageSquare,
  FiImage
} from "react-icons/fi";
import { cancelBookingApi, rescheduleBookingApi } from "../../api/bookingsApi";

const STEPS = [
  { key: "pending", label: "Requested", icon: FiClock, desc: "Awaiting provider confirmation" },
  { key: "confirmed", label: "Confirmed", icon: FiCheckCircle, desc: "Provider accepted booking" },
  { key: "provider_on_the_way", label: "On The Way", icon: FiTruck, desc: "Provider is en route to you" },
  { key: "in_progress", label: "In Progress", icon: FiTool, desc: "Service is being performed" },
  { key: "completed", label: "Completed", icon: FiCheck, desc: "Service completed successfully" },
];

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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
              Live Booking Tracker
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-0.5 rounded-full text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-slate-300 capitalize text-[11px]">
                {connectionStatus === "connected" ? "Live Updates" : connectionStatus}
              </span>
            </span>
          </div>
          <h3 className="text-xl font-bold mt-1 text-white">
            {currentBooking?.service?.name || "Service Booking"} #{currentBooking?.id}
          </h3>
        </div>

        <div className="text-right">
          <div className="text-sm font-semibold text-slate-400">Total Amount</div>
          <div className="text-2xl font-black text-emerald-400">
            ₹{currentBooking?.total_amount}
          </div>
        </div>
      </div>

      {/* Cancelled or Rejected Banner */}
      {isCancelled && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <FiXCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-400">Booking Cancelled</div>
            <div className="text-sm text-red-200/80 mt-0.5">
              Reason: {currentBooking.cancellation_reason || "Cancelled by user/provider"}
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <FiAlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-400">Booking Request Declined</div>
            <div className="text-sm text-amber-200/80 mt-0.5">
              The provider was unavailable for this time slot. You have not been charged.
            </div>
          </div>
        </div>
      )}

      {/* Stepper Timeline (if active or completed) */}
      {!isCancelled && !isRejected && (
        <div className="my-8 px-2">
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-5 left-5 right-5 h-1 bg-slate-800 rounded-full">
              <div
                className="h-1 bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-700 rounded-full"
                style={{
                  width: `${(Math.max(0, activeIndex) / (STEPS.length - 1)) * 100}%`,
                }}
              />
            </div>

            {/* Steps icons */}
            <div className="relative flex justify-between">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isPassed = idx < activeIndex;
                const isCurrent = idx === activeIndex;

                let circleClass = "bg-slate-800 text-slate-500 border-slate-700";
                if (isCurrent) {
                  circleClass =
                    "bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/30 scale-110";
                } else if (isPassed || isCompleted) {
                  circleClass = "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20";
                }

                return (
                  <div key={step.key} className="flex flex-col items-center text-center max-w-[90px]">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10 ${circleClass}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-xs font-semibold mt-2 ${
                        isCurrent
                          ? "text-blue-400 font-bold"
                          : isPassed || isCompleted
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:block mt-0.5 leading-tight">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 bg-slate-800/40 p-4 rounded-xl border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <FiCalendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Scheduled Date & Time</span>
          </div>
          <div className="font-semibold text-slate-100 text-sm">
            {currentBooking?.booking_date
              ? new Date(currentBooking.booking_date).toLocaleDateString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "N/A"}{" "}
            • {currentBooking?.time_slot}
          </div>
        </div>

        {currentBooking?.provider && (
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <FiUser className="w-3.5 h-3.5 text-blue-400" />
              <span>Assigned Service Provider</span>
            </div>
            <div className="font-semibold text-slate-100 text-sm flex items-center justify-between">
              <span>{currentBooking.provider.full_name || currentBooking.provider.name}</span>
              {currentBooking.provider.phone && (
                <a
                  href={`tel:${currentBooking.provider.phone}`}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <FiPhone className="w-3 h-3" /> Call
                </a>
              )}
            </div>
          </div>
        )}

        {/* Attachments preview if available */}
        {currentBooking?.attachments && currentBooking.attachments.length > 0 && (
          <div className="md:col-span-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
              <FiImage className="w-3.5 h-3.5 text-blue-400" />
              <span>Attached Problem Photos ({currentBooking.attachments.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentBooking.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block w-16 h-16 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition"
                >
                  <img
                    src={att.file_url}
                    alt={att.file_name || "Attachment"}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* History Log Toggle */}
      {currentBooking?.status_history && currentBooking.status_history.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            <span>Audit Trail & Activity Log ({currentBooking.status_history.length})</span>
            {showHistory ? <FiChevronUp /> : <FiChevronDown />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
              {currentBooking.status_history.map((hist) => (
                <div
                  key={hist.id}
                  className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-200 capitalize">
                      {hist.to_status?.replace(/_/g, " ")}
                    </span>
                    {hist.notes && <span className="text-slate-400 ml-2">— {hist.notes}</span>}
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(hist.created_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Footer (Cancel / Close) */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
        {!isCancelled && !isRejected && !isCompleted && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-xs text-red-400 hover:text-red-300 font-semibold hover:underline"
          >
            Cancel Booking
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-white shadow-2xl">
            <h4 className="text-lg font-bold text-red-400 flex items-center gap-2">
              <FiXCircle /> Cancel Booking
            </h4>
            <p className="text-xs text-slate-300 mt-2">
              Are you sure you want to cancel this booking? Please provide a reason below.
            </p>

            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Change of plans, booked by mistake, etc."
              className="w-full mt-3 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />

            {errorMsg && <p className="text-xs text-red-400 mt-2">{errorMsg}</p>}

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-red-600/30 transition disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
