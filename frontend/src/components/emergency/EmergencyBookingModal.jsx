import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Siren, MapPin, Timer, Radar, LogIn } from "lucide-react";
import { fetchEmergencyProvidersApi } from "../../api/emergencyApi";
import { createBooking } from "../../api/bookingsApi";
import { useAuth } from "../../context/AuthContext";
import { Modal, Button, Field, Input, Alert, Avatar, Skeleton, useToast, cn } from "../ui";
import { formatINR, getErrorMessage } from "../../lib/format";

/**
 * EmergencyBookingModal — pick an on-call professional for immediate dispatch.
 * Supports both `open` and legacy mount-to-open usage (open defaults to true).
 */
export default function EmergencyBookingModal({ open = true, onClose, onSuccess }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchEmergencyProvidersApi();
      setProviders(data || []);
      if (data && data.length > 0) setSelectedItem(data[0]);
    } catch (e) {
      console.error("Failed to load emergency providers", e);
      setLoadError(getErrorMessage(e, "We couldn't reach on-call technicians."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setError("");
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleBookEmergency = async () => {
    if (!selectedItem) return;
    if (!user) {
      onClose();
      navigate("/login");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const provider = selectedItem.provider;
      const serviceId = provider.services?.[0]?.id;

      if (!serviceId) {
        setError("This technician has no active emergency service right now. Please choose another.");
        return;
      }

      const booking = await createBooking({
        service_id: serviceId,
        booking_date: new Date().toISOString(),
        time_slot: "Emergency Urgent (Immediate)",
        is_emergency: true,
        notes: notes.trim() || "URGENT EMERGENCY DISPATCH",
      });

      toast.success(
        "Emergency booking confirmed",
        `${provider.full_name} is on the way — estimated arrival ${selectedItem.estimated_arrival_minutes} min.`
      );
      onSuccess?.(booking);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't dispatch a technician. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      icon={Siren}
      iconTone="text-rose-300 bg-rose-500/12"
      title="24/7 emergency dispatch"
      description="Choose an on-call technician near you. Emergency visits include a priority surcharge."
      footer={
        !loading &&
        providers.length > 0 && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={user ? Siren : LogIn}
              onClick={handleBookEmergency}
              loading={submitting}
              loadingText="Dispatching"
              disabled={!selectedItem}
            >
              {user ? "Dispatch technician" : "Sign in to dispatch"}
            </Button>
          </div>
        )
      }
    >
      {loading ? (
        <div className="space-y-3" role="status" aria-label="Finding technicians">
          <div className="flex items-center gap-2 text-sm text-ink-400 mb-4">
            <Radar className="w-4 h-4 text-rose-300 animate-pulse" aria-hidden="true" />
            Scanning for on-call technicians nearby…
          </div>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[72px] rounded-2xl" />
          ))}
        </div>
      ) : loadError ? (
        <Alert tone="error" title="Couldn't load technicians" action={<Button size="xs" variant="secondary" onClick={load}>Retry</Button>}>
          {loadError}
        </Alert>
      ) : providers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm font-medium text-white">No technicians are on call right now</p>
          <p className="text-[13px] text-ink-400 mt-1">Try a regular booking, or check back in a few minutes.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div role="radiogroup" aria-label="On-call technicians" className="space-y-2.5 max-h-72 overflow-y-auto -mx-1 px-1 py-1">
            {providers.map((item) => {
              const p = item.provider;
              const selected = selectedItem?.provider?.id === p.id;
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedItem(item)}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "w-full text-left flex items-center gap-3.5 p-3.5 rounded-2xl border transition-colors",
                    selected ? "bg-rose-500/[0.07] border-rose-400/40" : "bg-white/[0.02] border-white/[0.07] hover:border-white/15"
                  )}
                >
                  <Avatar src={p.profile_image} name={p.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.full_name}</p>
                    <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {p.location || "Nearby"} · {item.distance_km} km away
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-rose-500/12 text-rose-300 text-xs font-medium">
                      <Timer className="w-3 h-3" aria-hidden="true" />~{item.estimated_arrival_minutes} min
                    </span>
                    {p.hourly_rate != null && <p className="text-xs text-ink-400 mt-1 tabular">{formatINR(p.hourly_rate)}/hr</p>}
                  </div>
                </motion.button>
              );
            })}
          </div>

          <Field label="What's the emergency?" hint="Optional — helps the technician bring the right tools.">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Kitchen pipe burst, water leaking fast" />
          </Field>

          {error && <Alert tone="error">{error}</Alert>}
        </div>
      )}
    </Modal>
  );
}
