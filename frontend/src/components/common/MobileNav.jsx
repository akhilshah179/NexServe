import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Wrench, Package, CalendarDays, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../ui";

/** Bottom tab bar for phones — thumb-reachable primary destinations. */
export default function MobileNav() {
  const { user } = useAuth();
  const location = useLocation();

  const dashboardPath =
    user?.role === "admin" ? "/admin/dashboard" : user?.role === "provider" ? "/provider/dashboard" : "/dashboard";
  const bookingsPath = !user ? "/login" : user.role === "provider" ? "/provider/dashboard" : "/history";

  const items = [
    { label: "Home", path: "/", icon: Home, match: (p) => p === "/" },
    { label: "Services", path: "/services", icon: Wrench, match: (p) => p.startsWith("/services") || p.startsWith("/providers") },
    { label: "Rentals", path: "/rentals", icon: Package, match: (p) => p.startsWith("/rentals") || p === "/my-rentals" },
    { label: "Bookings", path: bookingsPath, icon: CalendarDays, match: (p) => p === "/history" },
    {
      label: user ? "Account" : "Sign in",
      path: user ? dashboardPath : "/login",
      icon: User,
      match: (p) => p === dashboardPath || p === "/login",
    },
  ];

  return (
    <nav
      aria-label="Mobile primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-surface-950/90 backdrop-blur-xl border-t border-white/[0.06] safe-area-pb"
    >
      <ul className="grid grid-cols-5 px-2 pt-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(location.pathname);
          return (
            <li key={item.label}>
              <Link
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 h-12 rounded-xl text-[11px] font-medium transition-colors",
                  active ? "text-white" : "text-ink-400"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-active"
                    className="absolute top-0 w-8 h-0.5 rounded-full bg-primary-400"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    aria-hidden="true"
                  />
                )}
                <Icon className={cn("w-5 h-5", active && "text-primary-300")} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
