/**
 * MainLayout — wraps all pages with the Navbar and Footer.
 *
 * WHY a layout?
 * - Navbar and Footer appear on every page
 * - Instead of importing them in every page component,
 *   we wrap all routes with this layout
 * - React Router's <Outlet /> renders the current page
 *   inside this layout automatically
 */

import { Outlet, Link } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import MobileNav from "../components/common/MobileNav";

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col pb-14 md:pb-0">
      <Navbar />
      {/* Main content area — Outlet renders the matched child route */}
      <main className="flex-1">
        <Outlet />
      </main>
      {/* Mobile Bottom Navigation Bar for PWA */}
      <MobileNav />

      {/* Footer */}
      <footer className="border-t border-white/5 bg-surface-900">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-sm font-semibold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                NexServe
              </span>
            </Link>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} NexServe. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/about" className="text-sm text-gray-500 hover:text-primary-400 transition-colors">Privacy</Link>
              <Link to="/about" className="text-sm text-gray-500 hover:text-primary-400 transition-colors">Terms</Link>
              <Link to="/contact" className="text-sm text-gray-500 hover:text-primary-400 transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
