import { useState, useEffect } from "react";
import { fetchAddressesApi, createAddressApi, updateAddressApi, deleteAddressApi } from "../../api/addressesApi";

export default function AddressManager({ onSelectAddress, selectedAddressId }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    label: "Home",
    full_address: "",
    city: "Bengaluru",
    postal_code: "560001",
    latitude: 12.9716,
    longitude: 77.5946,
    is_default: false,
  });

  const loadAddresses = async () => {
    try {
      const data = await fetchAddressesApi();
      setAddresses(data);
      if (data.length > 0 && !selectedAddressId && onSelectAddress) {
        const defaultAddr = data.find((a) => a.is_default) || data[0];
        onSelectAddress(defaultAddr);
      }
    } catch (e) {
      console.warn("Failed to load addresses", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setFormData({
      label: "Home",
      full_address: "",
      city: "Bengaluru",
      postal_code: "560001",
      latitude: 12.9716,
      longitude: 77.5946,
      is_default: addresses.length === 0,
    });
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
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await updateAddressApi(editingAddress.id, formData);
      } else {
        await createAddressApi(formData);
      }
      setIsModalOpen(false);
      await loadAddresses();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to save address.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      await deleteAddressApi(id);
      await loadAddresses();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-surface-800/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📍</span> Saved Addresses
          </h3>
          <p className="text-xs text-gray-400">Manage your delivery and service addresses</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-xl bg-primary-500/20 text-primary-300 border border-primary-500/30 hover:bg-primary-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
        >
          <span>➕</span> Add New Address
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-gray-400 animate-pulse">Loading addresses...</div>
      ) : addresses.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-white/10 text-center text-xs text-gray-400">
          No addresses saved yet. Click &quot;Add New Address&quot; to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {addresses.map((addr) => {
            const isSelected = selectedAddressId === addr.id;
            return (
              <div
                key={addr.id}
                onClick={() => onSelectAddress && onSelectAddress(addr)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? "bg-primary-500/15 border-primary-500/50 shadow-lg shadow-primary-500/10"
                    : "bg-surface-700/40 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-surface-600 text-gray-200 text-[10px] font-bold uppercase tracking-wider">
                      {addr.label}
                    </span>
                    {addr.is_default && (
                      <span className="px-2 py-0.5 rounded-md bg-accent-500/20 text-accent-300 text-[10px] font-bold">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(addr);
                      }}
                      className="p-1 text-gray-400 hover:text-white text-xs"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(addr.id);
                      }}
                      className="p-1 text-gray-400 hover:text-error-400 text-xs"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-200 font-medium line-clamp-2">{addr.full_address}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {addr.city}, {addr.postal_code}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Address Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-surface-800 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingAddress ? "Edit Address" : "Add New Address"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Address Label</label>
                <select
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-700 border border-white/10 text-white text-sm focus:border-primary-500 outline-none"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Parents">Parents</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Street Address</label>
                <textarea
                  required
                  rows={2}
                  value={formData.full_address}
                  onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
                  placeholder="Flat/House No, Building, Street, Landmark"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-700 border border-white/10 text-white text-sm focus:border-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-700 border border-white/10 text-white text-sm focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-700 border border-white/10 text-white text-sm focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded border-white/20 bg-surface-700 text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="is_default" className="text-xs text-gray-300 cursor-pointer">
                  Set as default address
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl hover:from-primary-500 hover:to-primary-400 shadow-md shadow-primary-500/20"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
