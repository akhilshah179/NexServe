/**
 * Navbar Component — Startup-grade Navigation Bar for NexServe.
 *
 * Features:
 * - Brand identity logo with subtle pulse glow
 * - Inline search bar shortcut
 * - Desktop nav links with active indicator
 * - Notification bell center
 * - User profile menu dropdown
 * - Mobile navigation drawer
 */

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationCenter from "../notifications/NotificationCenter";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    navigate("/login");
  };

  const dashboardPath =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "provider"
      ? "/provider/dashboard"
      : "/dashboard";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-surface-950/90 backdrop-blur-xl border-b border-white/10 shadow-xl shadow-black/20"
          : "bg-gradient-to-b from-surface-950/90 via-surface-950/50 to-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-extrabold text-xl tracking-wider">N</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-gray-400 bg-clip-text text-transparent group-hover:from-primary-300 group-hover:to-accent-400 transition-all">
                NexServe
              </span>
              <span className="text-[10px] text-gray-400 tracking-wider font-semibold uppercase -mt-1">
                Service Marketplace
              </span>
            </div>
          </Link>

          {/* Quick Header Search Bar (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden lg:flex items-center w-80 relative"
          >
            <input
              type="text"
              placeholder="Search AC repair, cleaning, salon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-surface-900/90 border border-white/10 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/30 transition-all"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </form>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-7">
            <NavLink to="/" active={location.pathname === "/"}>
              Home
            </NavLink>
            <NavLink to="/services" active={location.pathname.startsWith("/services")}>
              Services
            </NavLink>
            {user && (user.role === "customer" || user.role === "admin") && (
              <NavLink to="/history" active={location.pathname === "/history"}>
                Service History
              </NavLink>
            )}
            <NavLink to="/about" active={location.pathname === "/about"}>
              About
            </NavLink>
            <NavLink to="/contact" active={location.pathname === "/contact"}>
              Contact
            </NavLink>
          </div>

          {/* User & Auth Navigation Actions */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Notification Bell */}
                <NotificationCenter />

                {/* User Dropdown Trigger */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2.5 p-1.5 pl-3 rounded-full bg-surface-850 border border-white/10 hover:border-primary-500/40 transition-all duration-300 group"
                  >
                    {user.profile_image ? (
                      <img
                        src={user.profile_image}
                        alt={user.full_name}
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-primary-500/30"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center text-white text-xs font-bold shadow">
                        {user.full_name?.charAt(0) || "U"}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-gray-200 group-hover:text-white max-w-[100px] truncate">
                      {user.full_name.split(" ")[0]}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-500/20 text-primary-300 border border-primary-500/30">
                      {user.role}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                        isUserMenuOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-surface-850 border border-white/10 rounded-2xl shadow-2xl py-2 animate-fade-in z-50">
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-xs font-bold text-white truncate">{user.full_name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          to={dashboardPath}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-surface-750 transition-colors"
                        >
                          <span>📊</span> Dashboard
                        </Link>

                        {(user.role === "customer" || user.role === "admin") && (
                          <Link
                            to="/history"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-surface-750 transition-colors"
                          >
                            <span>🧾</span> Service History
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-white/5 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-error-400 hover:bg-error-500/10 transition-colors"
                        >
                          <span>🚪</span> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-surface-800 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 animate-fade-in bg-surface-900 rounded-b-2xl">
            <form onSubmit={handleSearchSubmit} className="mb-4 px-4">
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-surface-800 border border-white/10 text-xs text-white placeholder-gray-400"
              />
            </form>

            <div className="flex flex-col gap-1 px-2">
              <MobileNavLink to="/" onClick={() => setIsMobileMenuOpen(false)}>
                Home
              </MobileNavLink>
              <MobileNavLink to="/services" onClick={() => setIsMobileMenuOpen(false)}>
                Services
              </MobileNavLink>
              {user && (user.role === "customer" || user.role === "admin") && (
                <MobileNavLink to="/history" onClick={() => setIsMobileMenuOpen(false)}>
                  Service History
                </MobileNavLink>
              )}
              <MobileNavLink to="/about" onClick={() => setIsMobileMenuOpen(false)}>
                About
              </MobileNavLink>
              <MobileNavLink to="/contact" onClick={() => setIsMobileMenuOpen(false)}>
                Contact
              </MobileNavLink>

              <hr className="border-white/5 my-2" />

              {user ? (
                <>
                  <MobileNavLink to={dashboardPath} onClick={() => setIsMobileMenuOpen(false)}>
                    Dashboard ({user.full_name})
                  </MobileNavLink>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="text-left px-4 py-2.5 text-xs font-semibold text-error-400 hover:bg-surface-800 rounded-xl transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 p-2 pt-0">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-2.5 text-center text-xs font-bold text-white bg-primary-600 rounded-xl"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ to, children, active }) {
  return (
    <Link
      to={to}
      className={`relative text-xs font-semibold tracking-wide transition-colors duration-200 ${
        active ? "text-white" : "text-gray-400 hover:text-white"
      }`}
    >
      {children}
      {active && (
        <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-400 rounded-full" />
      )}
    </Link>
  );
}

function MobileNavLink({ to, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="px-4 py-2.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-surface-800 rounded-xl transition-colors"
    >
      {children}
    </Link>
  );
}
