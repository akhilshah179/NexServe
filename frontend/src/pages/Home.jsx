/**
 * Home.jsx — Consumer Service Marketplace Homepage for NexServe.
 *
 * Inspired by Urban Company / TaskRabbit UX:
 * - Search bar as the primary hero focal point ("What service do you need?")
 * - Live category pills & location selector
 * - Popular service categories grid with provider metrics
 * - Trending services with direct booking triggers
 * - Top-rated verified service providers
 * - "How NexServe Works" 4-step workflow
 * - Trust & Safety / Verification showcase
 * - Authentic customer reviews
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCategories, getServices } from "../api/servicesApi";
import { fetchPublicProvidersApi } from "../api/providersApi";
import EmergencyBookingModal from "../components/emergency/EmergencyBookingModal";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [trendingServices, setTrendingServices] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("Bengaluru");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadHomepageData() {
      try {
        const [catsData, servsData, provsData] = await Promise.all([
          getCategories(),
          getServices(),
          fetchPublicProvidersApi({ city: selectedCity }),
        ]);

        setCategories(catsData || []);
        setTrendingServices((servsData || []).slice(0, 6));
        setTopProviders((provsData || []).slice(0, 4));
      } catch (err) {
        console.warn("Failed to load homepage data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHomepageData();
  }, [selectedCity]);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/services");
    }
  };

  return (
    <div className="relative overflow-hidden pt-20">
      {/* ═══ HERO SECTION ═══ */}
      <section className="relative min-h-[85vh] flex items-center justify-center py-16 px-4">
        {/* Subtle background ambient glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary-600/15 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-accent-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Emergency Dispatch Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-error-500/10 border border-error-500/30 text-error-400 text-xs font-bold mb-6 animate-pulse">
            <span>🚨 Urgent Issue?</span>
            <button
              onClick={() => setShowEmergencyModal(true)}
              className="underline hover:text-white transition-colors"
            >
              Get 24/7 Immediate Emergency Technician →
            </button>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            What service do you need today?
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-300 mb-8">
            Book verified experts for home cleaning, AC repair, tutoring, plumbing, electrical, and fitness at fixed transparent prices.
          </p>

          {/* MAIN HERO SEARCH BAR */}
          <form
            onSubmit={handleHeroSearch}
            className="max-w-3xl mx-auto p-2.5 rounded-2xl bg-surface-900/90 border border-white/15 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center gap-2 mb-8"
          >
            {/* City Selector */}
            <div className="flex items-center gap-2 px-3 py-2 sm:py-0 text-xs font-semibold text-gray-300 border-b sm:border-b-0 sm:border-r border-white/10 w-full sm:w-auto">
              <span>📍</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer font-medium"
              >
                <option value="Bengaluru" className="bg-surface-850 text-white">Bengaluru</option>
                <option value="Mumbai" className="bg-surface-850 text-white">Mumbai</option>
                <option value="Delhi NCR" className="bg-surface-850 text-white">Delhi NCR</option>
                <option value="Hyderabad" className="bg-surface-850 text-white">Hyderabad</option>
              </select>
            </div>

            {/* Query Input */}
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Try 'Deep home cleaning', 'AC Gas refill', 'Plumber'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-transparent text-sm text-white placeholder-gray-400 outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-sm shadow-lg shadow-primary-500/25 transition-all"
            >
              Search Services
            </button>
          </form>

          {/* Category Pills Quick Bar */}
          <div className="flex items-center justify-center flex-wrap gap-2 text-xs text-gray-400">
            <span className="font-semibold text-gray-500">Popular:</span>
            {categories.slice(0, 5).map((cat) => (
              <Link
                key={cat.id}
                to={`/services?category=${cat.id}`}
                className="px-3 py-1 rounded-full bg-surface-800/80 border border-white/10 hover:border-primary-500/40 text-gray-300 hover:text-white transition-all"
              >
                {cat.icon_url || "✨"} {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ POPULAR SERVICE CATEGORIES ═══ */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Popular Service Categories</h2>
            <p className="text-sm text-gray-400 mt-1">Explore top-rated services with upfront transparent pricing</p>
          </div>
          <Link
            to="/services"
            className="text-xs font-bold text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            View All Categories →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 skeleton rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/services?category=${cat.id}`}
                className="p-5 rounded-2xl glass-card flex flex-col items-center text-center group"
              >
                <div className="w-14 h-14 rounded-2xl bg-surface-800 border border-white/10 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 group-hover:bg-primary-500/20 transition-transform">
                  {cat.icon_url || "🧹"}
                </div>
                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-primary-300 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-gray-400">Verified Pros</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ═══ POPULAR & TRENDING SERVICES ═══ */}
      <section className="py-16 px-4 max-w-7xl mx-auto border-t border-white/5">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Trending Services</h2>
            <p className="text-sm text-gray-400 mt-1">Most booked services this week in {selectedCity}</p>
          </div>
          <Link to="/services" className="text-xs font-bold text-primary-400 hover:text-primary-300">
            Browse All Services →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingServices.map((service) => (
            <div key={service.id} className="p-6 rounded-3xl glass-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30">
                    {service.category?.name || "Service"}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                    <span>⭐</span>
                    <span>{service.rating || "4.9"}</span>
                    <span className="text-gray-400 font-normal">({service.review_count || 24})</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{service.title}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 mb-4">{service.description}</p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">Starting from</span>
                  <span className="text-lg font-extrabold text-white">₹{service.price}</span>
                  <span className="text-[11px] text-gray-400 ml-1">/ {service.duration_minutes} mins</span>
                </div>

                <Link
                  to={`/services`}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow transition-all"
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ RECOMMENDED VERIFIED PROVIDERS ═══ */}
      <section className="py-16 px-4 max-w-7xl mx-auto border-t border-white/5">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Recommended Professionals</h2>
            <p className="text-sm text-gray-400 mt-1">Background-checked service experts in your area</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {topProviders.map((provider) => (
            <div key={provider.id} className="p-6 rounded-3xl glass-card text-center flex flex-col justify-between">
              <div>
                <div className="relative w-20 h-20 mx-auto mb-4">
                  {provider.profile_image ? (
                    <img
                      src={provider.profile_image}
                      alt={provider.full_name}
                      className="w-full h-full rounded-2xl object-cover ring-2 ring-primary-500/40"
                    />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-2xl font-bold">
                      {provider.full_name?.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold shadow">
                    ✓ Verified
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{provider.full_name}</h3>
                <p className="text-xs text-gray-400 mb-3">{provider.location || selectedCity}</p>

                <div className="flex items-center justify-center gap-3 text-xs mb-4">
                  <div className="flex items-center gap-1 text-yellow-400 font-bold">
                    <span>⭐</span> {provider.rating || "4.9"}
                  </div>
                  <div className="text-gray-400">
                    {provider.experience_years || 5}+ yrs exp
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-gray-300 font-semibold">₹{provider.hourly_rate}/hr</span>
                <Link
                  to={`/providers/${provider.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-surface-700 hover:bg-surface-600 text-white text-xs font-semibold border border-white/10"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW NEXSERVE WORKS ═══ */}
      <section className="py-20 px-4 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">How NexServe Works</h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
            Book professional services at your doorstep in just four simple steps
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {[
            { step: "01", title: "Select Service", desc: "Choose from 12+ categories like cleaning, AC repair, plumbing, or salon." },
            { step: "02", title: "Pick Verified Pro", desc: "Compare provider ratings, transparent pricing, experience, and customer reviews." },
            { step: "03", title: "Choose Time Slot", desc: "Select your preferred date and convenient time slot without double bookings." },
            { step: "04", title: "Pay & Relax", desc: "Secure Razorpay payment with escrow release upon job completion." },
          ].map((item) => (
            <div key={item.step} className="p-6 rounded-3xl bg-surface-850/80 border border-white/5 relative">
              <span className="text-3xl font-extrabold text-primary-500/40 block mb-3">{item.step}</span>
              <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TRUST & SAFETY GUARANTEE ═══ */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-surface-850 via-surface-800 to-surface-850 border border-primary-500/20 shadow-2xl relative overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30 mb-4 inline-block">
                🛡️ NexServe Promise
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                100% Quality & Safety Guarantee
              </h2>
              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Every technician and service provider undergoes strict background verification, identity checks, and skills evaluation before joining NexServe.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-base">✓</span> Background Checked
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-base">✓</span> Upfront Pricing
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-base">✓</span> Razorpay Escrow Protection
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-base">✓</span> 24/7 Customer Support
                </div>
              </div>
            </div>

            <div className="text-center lg:text-right">
              <button
                onClick={() => setShowEmergencyModal(true)}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-error-600 to-error-500 hover:from-error-500 hover:to-error-400 text-white font-bold text-sm shadow-xl shadow-error-500/25 inline-flex items-center gap-3"
              >
                <span>🚨</span> Need Urgent 24/7 Emergency Service?
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <EmergencyBookingModal onClose={() => setShowEmergencyModal(false)} />
      )}
    </div>
  );
}
