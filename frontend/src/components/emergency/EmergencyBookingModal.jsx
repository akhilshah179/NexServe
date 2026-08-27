import { useState, useEffect } from "react";
import { fetchEmergencyProvidersApi } from "../../api/emergencyApi";
import { createBooking } from "../../api/bookingsApi";

export default function EmergencyBookingModal({ onClose, onSuccess }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchEmergencyProvidersApi();
        setProviders(data);
        if (data.length > 0) setSelectedItem(data[0]);
      } catch (e) {
        console.error("Failed to load emergency providers", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleBookEmergency = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const provider = selectedItem.provider;
      const serviceId = provider.services?.[0]?.id;

      if (!serviceId) {
        alert("Selected provider has no active emergency service.");
        return;
      }

      const booking = await createBooking({
        service_id: serviceId,
        booking_date: new Date().toISOString(),
        time_slot: "Emergency Urgent (Immediate)",
        is_emergency: true,
        notes: notes.trim() || "⚡ URGENT EMERGENCY DISPATCH",
      });

      alert(`⚡ Emergency booking confirmed! ETA: ${selectedItem.estimated_arrival_minutes} mins.`);
      if (onSuccess) onSuccess(booking);
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to dispatch emergency booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-surface-800 border border-error-500/30 rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-error-500/20 text-error-400 border border-error-500/30 flex items-center justify-center text-xl font-bold animate-pulse">
              🚨
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Emergency Dispatch</h3>
              <p className="text-xs text-error-400 font-semibold">Immediate technician booking</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
            Scanning nearby urgent technicians...
          </div>
        ) : providers.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            No emergency technicians currently on standby. Please try regular booking or refresh.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-300">
              Select an available nearby provider for immediate response:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2.5">
              {providers.map((item) => {
                const p = item.provider;
                const isSelected = selectedItem?.provider?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-error-500/15 border-error-500/50 shadow-md shadow-error-500/10"
                        : "bg-surface-700/40 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-600 flex items-center justify-center font-bold text-white text-sm">
                        {p.full_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{p.full_name}</h4>
                        <p className="text-[11px] text-gray-400">{p.location || "Bengaluru"} • {item.distance_km} km away</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-md bg-error-500/20 text-error-400 text-[10px] font-bold">
                        ⚡ ETA ~{item.estimated_arrival_minutes} mins
                      </span>
                      <p className="text-xs font-bold text-white mt-1">₹{p.hourly_rate} / hr (+20% emergency)</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Issue Description (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Major pipe burst in kitchen, urgent leak"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-700 border border-white/10 text-white text-xs outline-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-error-500/10 border border-error-500/20 text-[11px] text-error-300 flex items-center gap-2">
              <span>⚠️</span>
              <p>Emergency bookings carry a +20% priority surcharge for rapid technician dispatch.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBookEmergency}
                disabled={submitting || !selectedItem}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-error-600 to-error-500 hover:from-error-500 hover:to-error-400 text-white font-bold text-xs shadow-lg shadow-error-500/25 transition-all"
              >
                {submitting ? "Dispatching..." : "⚡ Dispatch Emergency Technician"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
