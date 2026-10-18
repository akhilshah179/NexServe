import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Pencil, Trash2, Home, Building2, Users, Check } from "lucide-react";
import { fetchAddressesApi, createAddressApi, updateAddressApi, deleteAddressApi } from "../../api/addressesApi";
import { Button, Modal, Field, Input, Textarea, Select, Switch, Skeleton, Alert, useToast, cn } from "../ui";
import { getErrorMessage } from "../../lib/format";

const EMPTY = {
  label: "Home",
  full_address: "",
  city: "Bengaluru",
  postal_code: "560001",
  latitude: 12.9716,
  longitude: 77.5946,
  is_default: false,
};

const labelIcon = (label) => {
  switch (label?.toLowerCase()) {
    case "home":
      return Home;
    case "work":
      return Building2;
    case "parents":
      return Users;
    default:
      return MapPin;
  }
};

/**
 * AddressManager — saved addresses with select / add / edit / delete.
 * `embedded` drops the outer card so it can sit inside the booking wizard.
 */
export default function AddressManager({ onSelectAddress, selectedAddressId, embedded = false }) {
  const { toast, confirm } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadAddresses = async () => {
    setLoadError("");
    try {
      const data = await fetchAddressesApi();
      setAddresses(data);
      if (data.length > 0 && !selectedAddressId && onSelectAddress) {
        const defaultAddr = data.find((a) => a.is_default) || data[0];
        onSelectAddress(defaultAddr);
      }
    } catch (e) {
      console.warn("Failed to load addresses", e);
      setLoadError(getErrorMessage(e, "We couldn't load your saved addresses."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setFormData({ ...EMPTY, is_default: addresses.length === 0 });
    setErrors({});
    setSaveError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr);
    setFormData({
      label: addr.label,
      full_address: addr.full_address,
      city: addr.city,
      postal_code: addr.postal_code,
      latitude: addr.latitude || 12.9716,
      longitude: addr.longitude || 77.5946,
      is_default: addr.is_default,
    });
    setErrors({});
    setSaveError("");
    setIsModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (formData.full_address.trim().length < 8) e.full_address = "Add house number, street and a landmark.";
    if (!formData.city.trim()) e.city = "City is required.";
    if (!/^[0-9A-Za-z -]{4,10}$/.test(formData.postal_code.trim())) e.postal_code = "Enter a valid PIN code.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError("");
    try {
      if (editingAddress) {
        await updateAddressApi(editingAddress.id, formData);
      } else {
        await createAddressApi(formData);
      }
      setIsModalOpen(false);
      toast.success(editingAddress ? "Address updated" : "Address saved");
      await loadAddresses();
    } catch (err) {
      setSaveError(getErrorMessage(err, "Failed to save address."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addr) => {
    const ok = await confirm({
      title: "Delete this address?",
      description: `${addr.label} · ${addr.full_address}`,
      confirmLabel: "Delete address",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(addr.id);
    try {
      await deleteAddressApi(addr.id);
      toast.success("Address deleted");
      await loadAddresses();
    } catch (e) {
      toast.error("Couldn't delete address", getErrorMessage(e));
    } finally {
      setDeletingId(null);
    }
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-semibold text-white">Saved addresses</h3>
          <p className="text-[13px] text-ink-400 mt-0.5">Where professionals should arrive and where rentals are delivered.</p>
        </div>
        <Button size="sm" variant="secondary" icon={Plus} onClick={handleOpenAdd}>
          Add
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <Skeleton className="h-[92px] rounded-2xl" />
          <Skeleton className="h-[92px] rounded-2xl" />
        </div>
      ) : loadError ? (
        <Alert
          tone="error"
          action={
            <Button size="xs" variant="secondary" onClick={() => { setLoading(true); loadAddresses(); }}>
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      ) : addresses.length === 0 ? (
        <button
          type="button"
          onClick={handleOpenAdd}
          className="w-full p-6 rounded-2xl border border-dashed border-white/10 hover:border-primary-400/40 hover:bg-primary-500/[0.03] text-center transition-colors"
        >
          <MapPin className="w-5 h-5 mx-auto text-ink-400" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-white">Add your first address</p>
          <p className="text-[13px] text-ink-400 mt-0.5">You'll only need to do this once.</p>
        </button>
      ) : (
        <div role={onSelectAddress ? "radiogroup" : undefined} aria-label="Saved addresses" className="grid sm:grid-cols-2 gap-3">
          <AnimatePresence initial={false}>
            {addresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id;
              const Icon = labelIcon(addr.label);
              return (
                <motion.div
                  key={addr.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className={cn(
                    "relative rounded-2xl border transition-colors",
                    isSelected ? "bg-primary-500/[0.07] border-primary-400/50" : "bg-white/[0.02] border-white/[0.07] hover:border-white/15"
                  )}
                >
                  <button
                    type="button"
                    role={onSelectAddress ? "radio" : undefined}
                    aria-checked={onSelectAddress ? isSelected : undefined}
                    onClick={() => onSelectAddress && onSelectAddress(addr)}
                    className={cn("w-full text-left p-4 pr-24 rounded-2xl", !onSelectAddress && "cursor-default")}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center",
                          isSelected ? "bg-primary-500 text-white" : "bg-white/[0.06] text-ink-300"
                        )}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Icon className="w-3.5 h-3.5" />}
                      </span>
                      <span className="text-sm font-semibold text-white">{addr.label}</span>
                      {addr.is_default && (
                        <span className="h-5 px-1.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[11px] font-medium inline-flex items-center">
                          Default
                        </span>
                      )}
                    </span>
                    <span className="block mt-2 text-[13px] text-ink-200 line-clamp-2">{addr.full_address}</span>
                    <span className="block mt-0.5 text-xs text-ink-400">
                      {addr.city} · {addr.postal_code}
                    </span>
                  </button>
                  <div className="absolute top-3 right-3 flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(addr)}
                      aria-label={`Edit ${addr.label} address`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(addr)}
                      disabled={deletingId === addr.id}
                      aria-label={`Delete ${addr.label} address`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="md"
        icon={MapPin}
        title={editingAddress ? "Edit address" : "Add a new address"}
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="address-form" loading={saving} loadingText="Saving">
              Save address
            </Button>
          </div>
        }
      >
        <form id="address-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Label">
            <Select value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })}>
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Parents">Parents</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Full address" required error={errors.full_address}>
            <Textarea
              rows={2}
              value={formData.full_address}
              onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
              placeholder="Flat / house no, building, street, landmark"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" required error={errors.city}>
              <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </Field>
            <Field label="PIN code" required error={errors.postal_code}>
              <Input
                inputMode="numeric"
                maxLength={10}
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </Field>
          </div>
          <div className="surface-inset p-3.5">
            <Switch
              checked={formData.is_default}
              onChange={(v) => setFormData({ ...formData, is_default: v })}
              label="Set as default address"
              description="Used automatically for new bookings."
            />
          </div>
          {saveError && <Alert tone="error">{saveError}</Alert>}
        </form>
      </Modal>
    </>
  );

  if (embedded) return <div>{content}</div>;
  return <div className="surface p-5 sm:p-6">{content}</div>;
}
