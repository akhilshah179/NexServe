/**
 * NotFound (404) Page — shown when a URL doesn't match any route.
 *
 * WHY this matters:
 * - Without a catch-all route, unmatched URLs render a blank page
 * - This gives users a clear message and a way back to safety
 * - Important for both UX and SEO
 */

import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center animate-slide-up">
        <p className="text-8xl font-extrabold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-4">
          404
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 hover:-translate-y-0.5"
          >
            Go Home
          </Link>
          <Link
            to="/services"
            className="px-8 py-3 text-sm font-semibold text-gray-300 bg-surface-700/50 border border-white/10 rounded-xl hover:bg-surface-600/50 hover:text-white transition-all duration-300"
          >
            Browse Services
          </Link>
        </div>
      </div>
    </div>
  );
}
