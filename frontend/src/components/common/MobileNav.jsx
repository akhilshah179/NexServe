import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function MobileNav() {
  const { user } = useAuth();
  const location = useLocation();

  const dashboardPath =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "provider"
      ? "/provider/dashboard"
      : "/dashboard";

  const navItems = [
    { label: "Home", path: "/", icon: "🏠" },
    { label: "Services", path: "/services", icon: "🛠️" },
    { label: "Bookings", path: user ? dashboardPath : "/login", icon: "📅" },
    { label: "Contact", path: "/contact", icon: "💬" },
    { label: user ? "Profile" : "Sign In", path: user ? dashboardPath : "/login", icon: "👤" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-900/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive ? "text-primary-400 bg-primary-500/10 font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              <span className="text-base mb-0.5">{item.icon}</span>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
