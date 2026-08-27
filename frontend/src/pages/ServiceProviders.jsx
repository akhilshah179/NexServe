import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getCategoryById, getServices } from "../api/servicesApi";
import { fetchPublicProvidersApi } from "../api/providersApi";
import EmergencyBookingModal from "../components/emergency/EmergencyBookingModal";

export default function ServiceProviders() {
  const { categoryId } = useParams();
  const [category, setCategory] = useState(null);
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

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
        setProviders(provData);
        setServices(svcData);
      } catch (err) {
        console.warn("Failed to load providers:", err);
        setError("Failed to load providers.");
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
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link to="/services" className="hover:text-primary-400 transition-colors">Services</Link>
              <span>→</span>
              <span className="text-gray-300">{category?.name || "Loading..."}</span>
            </div>

            {/* Emergency Service Button */}
            <button
              onClick={() => setShowEmergencyModal(true)}
              className="px-4 py-2 rounded-xl bg-error-500/20 text-error-400 border border-error-500/40 hover:bg-error-500/30 text-xs font-bold flex items-center gap-1.5 animate-pulse"
            >
              <span>🚨</span> Urgent Emergency Dispatch
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-5xl mb-4 block animate-slide-up">{category?.icon_url || "📦"}</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 animate-slide-up">
            Verified {category?.name || "Service"}{" "}
            <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              Providers
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg animate-slide-up">
            {category?.description || "Browse approved and background-checked service professionals."}
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Finding verified providers in your location...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-error-400">⚠️ {error}</div>
        ) : providers.length === 0 ? (
          <div className="py-16 text-center">
            <span className="text-5xl mb-4 block">😕</span>
            <p className="text-xl text-gray-400 mb-2">No verified providers available in this category currently.</p>
            <Link to="/services" className="inline-block mt-4 px-6 py-2.5 text-xs font-bold text-white bg-primary-600 rounded-xl">
              ← Back to Services
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((p) => {
              const pServices = servicesByProvider[p.id] || [];
              const minPrice = pServices.length > 0 ? Math.min(...pServices.map((s) => s.price)) : p.hourly_rate;

              return (
                <Link
                  key={p.id}
                  to={`/providers/${p.id}?category=${categoryId}`}
                  className="group p-6 rounded-2xl bg-surface-800/50 border border-white/5 hover:border-primary-500/30 hover:bg-surface-700/50 transition-all duration-300 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      {p.profile_image ? (
                        <img src={p.profile_image} alt={p.full_name} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">
                          {p.full_name?.charAt(0) || "P"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-white group-hover:text-primary-300 transition-colors truncate">
                            {p.full_name}
                          </h3>
                          <span className="text-xs text-success-400" title="Verified Provider">✅</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{p.location || "Bengaluru"}</p>
                        <span className="inline-block px-2 py-0.5 mt-1 rounded-md bg-surface-700 text-[10px] text-gray-300">
                          Radius: {p.service_radius_km} km
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-3 text-xs">
                      <span className="text-yellow-400 font-bold">{p.rating} ⭐</span>
                      <span className="text-gray-500">({p.review_count} reviews)</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">{p.experience_years}+ yrs exp</span>
                    </div>

                    {p.bio && <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">{p.bio}</p>}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">Starting Rate</span>
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
        )}
      </div>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <EmergencyBookingModal onClose={() => setShowEmergencyModal(false)} />
      )}
    </div>
  );
}
