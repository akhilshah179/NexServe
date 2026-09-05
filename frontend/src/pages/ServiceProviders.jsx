/**
 * ServiceProviders.jsx — Category Services & Providers Discovery Page.
 *
 * Flow:
 * Category -> Category Services Page -> Service Details -> Providers -> Availability -> Booking
 */

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getCategoryById, getServices } from "../api/servicesApi";
import { fetchPublicProvidersApi } from "../api/providersApi";
import EmergencyBookingModal from "../components/emergency/EmergencyBookingModal";
import BookingWizardModal from "../components/booking/BookingWizardModal";

export default function ServiceProviders() {
  const { categoryId } = useParams();
  const [category, setCategory] = useState(null);
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("services"); // "services" | "providers"

  // Active Modals
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [bookingService, setBookingService] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [catData, provData, svcData] = await Promise.all([
          getCategoryById(categoryId),
          fetchPublicProvidersApi({ category_id: categoryId }),
          getServices({ categoryId }),
        ]);
        setCategory(catData);
        setProviders(provData || []);
        setServices(svcData || []);
      } catch (err) {
        console.warn("Failed to load category details:", err);
        setError("Failed to load category data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [categoryId]);

  const servicesByProvider = {};
  services.forEach((svc) => {
    if (!servicesByProvider[svc.provider_id]) {
      servicesByProvider[svc.provider_id] = [];
    }
    servicesByProvider[svc.provider_id].push(svc);
  });

  return (
    <div className="pt-24 pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Bar */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium">
              <Link to="/services" className="hover:text-primary-400 transition-colors">
                ← All Categories
              </Link>
              <span>/</span>
              <span className="text-gray-300 font-semibold">{category?.name || "Loading..."}</span>
            </div>

            {/* Emergency Service Button */}
            <button
              onClick={() => setShowEmergencyModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-error-500/15 text-error-400 border border-error-500/30 hover:bg-error-500/25 text-xs font-bold flex items-center gap-1.5 animate-pulse"
            >
              <span>🚨</span> Urgent Emergency Dispatch
            </button>
          </div>
        </div>

        {/* Header Hero Banner */}
        <div className="text-center mb-10">
          <span className="text-5xl mb-3 block animate-slide-up">{category?.icon_url || "✨"}</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 animate-slide-up">
            {category?.name || "Service Category"}
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-sm sm:text-base animate-slide-up leading-relaxed">
            {category?.description ||
              "Explore all available services and background-checked technicians in this category."}
          </p>

          {/* View Mode Toggle: Services vs Providers */}
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-surface-850 border border-white/10 mt-6 shadow-xl">
            <button
              onClick={() => setActiveView("services")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeView === "services"
                  ? "bg-primary-600 text-white shadow-lg shadow-primary-500/25"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>🛠️</span>
              <span>Available Services ({services.length})</span>
            </button>
            <button
              onClick={() => setActiveView("providers")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeView === "providers"
                  ? "bg-primary-600 text-white shadow-lg shadow-primary-500/25"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>👥</span>
              <span>Verified Providers ({providers.length})</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Loading category offerings...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-error-400">⚠️ {error}</div>
        ) : activeView === "services" ? (
          /* ═══ SERVICES VIEW ═══ */
          services.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-surface-850/50 border border-white/5 p-8">
              <span className="text-5xl mb-3 block">🔎</span>
              <p className="text-lg text-gray-300 font-bold mb-2">
                No active services currently listed in {category?.name}.
              </p>
              <Link
                to="/services"
                className="inline-block mt-4 px-5 py-2 text-xs font-bold text-white bg-primary-600 rounded-xl"
              >
                ← Browse Other Categories
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="p-6 rounded-3xl glass-card flex flex-col justify-between group hover:border-primary-500/40 transition-all shadow-xl"
                >
                  <div>
                    {/* Badge & Rating */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30 flex items-center gap-1">
                        <span>{category?.icon_url || "✨"}</span>
                        <span>{category?.name}</span>
                      </span>

                      <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold bg-surface-800 px-2.5 py-1 rounded-full border border-white/5">
                        <span>⭐</span>
                        <span>{svc.rating || "4.8"}</span>
                        <span className="text-gray-400 font-normal">({svc.review_count || 15})</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary-300 transition-colors">
                      {svc.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                      {svc.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">
                        Fixed Price
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-white">₹{svc.price}</span>
                        <span className="text-[11px] text-gray-400">/ {svc.duration_minutes}m</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setBookingService(svc)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-xs shadow-md shadow-primary-500/20 transition-all"
                    >
                      Book Service →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ═══ PROVIDERS VIEW ═══ */
          providers.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-surface-850/50 border border-white/5 p-8">
              <span className="text-5xl mb-3 block">😕</span>
              <p className="text-lg text-gray-300 font-bold mb-2">
                No verified providers found in this category currently.
              </p>
              <Link
                to="/services"
                className="inline-block mt-4 px-5 py-2 text-xs font-bold text-white bg-primary-600 rounded-xl"
              >
                ← Back to Services
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.map((p) => {
                const pServices = servicesByProvider[p.id] || [];
                const minPrice =
                  pServices.length > 0
                    ? Math.min(...pServices.map((s) => s.price))
                    : p.hourly_rate;

                return (
                  <Link
                    key={p.id}
                    to={`/providers/${p.id}?category=${categoryId}`}
                    className="group p-6 rounded-3xl bg-surface-800/60 border border-white/10 hover:border-primary-500/40 hover:bg-surface-750/70 transition-all duration-300 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-4 mb-4">
                        {p.profile_image ? (
                          <img
                            src={p.profile_image}
                            alt={p.full_name}
                            className="w-14 h-14 rounded-2xl object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl shadow">
                            {p.full_name?.charAt(0) || "P"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-bold text-white group-hover:text-primary-300 transition-colors truncate">
                              {p.full_name}
                            </h3>
                            <span className="text-xs text-success-400" title="Verified Provider">
                              ✅
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{p.location || "Bengaluru"}</p>
                          <span className="inline-block px-2 py-0.5 mt-1 rounded-md bg-surface-700 text-[10px] text-gray-300">
                            Service Radius: {p.service_radius_km || 15} km
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3 text-xs">
                        <span className="text-yellow-400 font-bold">{p.rating || "4.8"} ⭐</span>
                        <span className="text-gray-500">({p.review_count || 20} reviews)</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400">{p.experience_years || 5}+ yrs exp</span>
                      </div>

                      {p.bio && (
                        <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">
                          {p.bio}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-semibold">
                          Starting Rate
                        </span>
                        <p className="text-lg font-bold text-white">₹{minPrice}</p>
                      </div>
                      <span className="px-4 py-2 text-xs font-bold text-primary-300 bg-primary-500/10 border border-primary-500/20 rounded-xl group-hover:bg-primary-500/20 transition-all">
                        View Profile & Book →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <EmergencyBookingModal onClose={() => setShowEmergencyModal(false)} />
      )}

      {/* Booking Modal */}
      {bookingService && (
        <BookingWizardModal
          service={bookingService}
          onClose={() => setBookingService(null)}
          onSuccess={() => {
            setBookingService(null);
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
}
