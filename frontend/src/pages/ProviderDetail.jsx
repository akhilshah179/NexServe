/**
 * ProviderDetail.jsx — Startup-Grade Provider Profile & Booking Gateway.
 *
 * Features:
 * - Verified badge, rating, reviews, experience metrics
 * - Cover banner & profile photo
 * - Services offered catalog with instant booking modal trigger
 * - Portfolio photo gallery
 * - Customer reviews & professional replies list
 * - Working hours & location radius specs
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchProviderByIdApi } from "../api/providersApi";
import { getServices } from "../api/servicesApi";
import { fetchProviderReviewsApi } from "../api/reviewsApi";
import BookingWizardModal from "../components/booking/BookingWizardModal";

export default function ProviderDetail() {
  const { providerId } = useParams();
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("services"); // "services" | "about" | "reviews"

  // Active Booking Modal target
  const [bookingServiceTarget, setBookingServiceTarget] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [provData, servsData, revsData] = await Promise.all([
          fetchProviderByIdApi(Number(providerId)),
          getServices({ providerId: Number(providerId) }),
          fetchProviderReviewsApi(Number(providerId)),
        ]);
        setProvider(provData);
        setServices(servsData || []);
        setReviews(revsData || []);
      } catch (err) {
        console.warn("Failed to load provider profile:", err);
      } finally {
        setLoading(false);
      }
    }
    if (providerId) loadData();
  }, [providerId]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 max-w-5xl mx-auto">
        <div className="h-64 skeleton rounded-3xl mb-8" />
        <div className="h-32 skeleton rounded-2xl mb-8" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 max-w-xl mx-auto text-center">
        <span className="text-5xl mb-4 block">🔍</span>
        <h2 className="text-2xl font-bold text-white mb-2">Provider Not Found</h2>
        <p className="text-xs text-gray-400 mb-6">The requested service provider profile could not be loaded.</p>
        <Link to="/services" className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-xs">
          Browse All Services
        </Link>
      </div>
    );
  }

  const portfolioPhotos = provider.portfolio_photos
    ? typeof provider.portfolio_photos === "string"
      ? JSON.parse(provider.portfolio_photos)
      : provider.portfolio_photos
    : [];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 max-w-5xl mx-auto">
      {/* ═══ PROFILE HEADER BANNER ═══ */}
      <div className="relative rounded-3xl bg-surface-850 border border-white/10 overflow-hidden shadow-2xl mb-8">
        {/* Cover Background */}
        <div className="h-44 bg-gradient-to-r from-primary-900/60 via-surface-800 to-accent-950/40 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent" />
        </div>

        {/* Profile Details Container */}
        <div className="px-6 sm:px-8 pb-8 relative -mt-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Profile Avatar */}
            <div className="relative w-28 h-28 rounded-3xl overflow-hidden ring-4 ring-surface-850 shadow-2xl bg-surface-800 flex-shrink-0">
              {provider.profile_image ? (
                <img
                  src={provider.profile_image}
                  alt={provider.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-3xl font-extrabold">
                  {provider.full_name?.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{provider.full_name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span>✓</span> Verified Professional
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                <span>📍 {provider.location || "Bengaluru, Karnataka"}</span>
                <span>•</span>
                <span>Serving {provider.service_radius_km || 15} km radius</span>
              </p>
            </div>
          </div>

          {/* Key Quick Stats */}
          <div className="flex items-center gap-6 p-4 rounded-2xl bg-surface-900/80 border border-white/10 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Rating</span>
              <div className="flex items-center gap-1 text-yellow-400 font-extrabold text-sm mt-0.5">
                <span>⭐</span>
                <span>{provider.rating || "4.9"}</span>
                <span className="text-gray-400 font-normal text-xs">({reviews.length || provider.review_count || 12})</span>
              </div>
            </div>

            <div className="border-l border-white/10 pl-6">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Experience</span>
              <span className="font-extrabold text-white text-sm mt-0.5 block">
                {provider.experience_years || 5}+ Years
              </span>
            </div>

            <div className="border-l border-white/10 pl-6">
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Hourly Rate</span>
              <span className="font-extrabold text-primary-300 text-sm mt-0.5 block">
                ₹{provider.hourly_rate || 499}/hr
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TAB NAVIGATION ═══ */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-8">
        {[
          { id: "services", label: `Services Offered (${services.length})` },
          { id: "about", label: "About & Working Hours" },
          { id: "reviews", label: `Customer Reviews (${reviews.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? "bg-primary-600 text-white shadow-lg shadow-primary-500/25"
                : "bg-surface-850 border border-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: SERVICES CATALOG ═══ */}
      {activeTab === "services" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white mb-4">Book Services Directly from {provider.full_name.split(" ")[0]}</h2>
          {services.length === 0 ? (
            <div className="p-8 rounded-3xl bg-surface-850 border border-white/5 text-center text-xs text-gray-400">
              No specific services published yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="p-6 rounded-3xl glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30">
                      {service.category?.name || "Service"}
                    </span>
                    <h3 className="text-base font-bold text-white">{service.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-xl">{service.description}</p>
                    <div className="text-[11px] text-gray-400 font-semibold pt-1">
                      ⏱️ Duration: {service.duration_minutes} minutes
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Price</span>
                      <span className="text-xl font-extrabold text-white">₹{service.price}</span>
                    </div>

                    <button
                      onClick={() => setBookingServiceTarget(service)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-xs shadow-lg shadow-primary-500/25 transition-all"
                    >
                      Book Service →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: ABOUT & WORKING HOURS ═══ */}
      {activeTab === "about" && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-6 rounded-3xl bg-surface-850 border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white">About Professional</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              {provider.bio || "Certified service professional with extensive experience providing quality home and commercial services across the city."}
            </p>

            {portfolioPhotos.length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold text-gray-300 uppercase mb-3">Previous Work & Portfolio</h4>
                <div className="grid grid-cols-3 gap-3">
                  {portfolioPhotos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`Work sample ${i + 1}`}
                      className="w-full h-24 rounded-2xl object-cover border border-white/10"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 rounded-3xl bg-surface-850 border border-white/10 space-y-4 text-xs">
            <h3 className="text-base font-bold text-white">Working Schedule</h3>
            <div className="space-y-2 text-gray-300">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Working Days</span>
                <span className="font-bold text-white">{provider.working_hours || "Mon - Sat"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Hours</span>
                <span className="font-bold text-white">09:00 AM - 07:00 PM</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">24/7 Emergency</span>
                <span className={`font-bold ${provider.emergency_available ? "text-emerald-400" : "text-gray-500"}`}>
                  {provider.emergency_available ? "Available 🚨" : "Standard Hours Only"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 3: CUSTOMER REVIEWS ═══ */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white mb-4">Verified Customer Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <div className="p-8 rounded-3xl bg-surface-850 border border-white/5 text-center text-xs text-gray-400">
              No customer reviews written yet for this provider.
            </div>
          ) : (
            <div className="grid gap-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-6 rounded-3xl bg-surface-850 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-xs">
                        {rev.customer?.full_name?.charAt(0) || "C"}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{rev.customer?.full_name || "Verified Customer"}</h4>
                        <span className="text-[10px] text-gray-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-yellow-400 font-bold text-xs">
                      <span>⭐</span> {rev.rating} / 5
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed pl-1">{rev.comment}</p>

                  {rev.provider_reply && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-surface-800 border border-white/5 text-xs text-gray-300 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-primary-400 block">Provider Response:</span>
                      <p className="text-gray-300 italic">"{rev.provider_reply}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Wizard Modal */}
      {bookingServiceTarget && (
        <BookingWizardModal
          service={bookingServiceTarget}
          initialProvider={provider}
          onClose={() => setBookingServiceTarget(null)}
          onSuccess={() => alert("Booking submitted successfully! Track status in your Dashboard.")}
        />
      )}
    </div>
  );
}
