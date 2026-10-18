/**
 * Navbar — global navigation, search, notifications and account menu.
 */

import { useState, useEffect, useRef } from "react";
import { Link, NavLink as RouterNavLink, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Menu,
  ChevronDown,
  LayoutDashboard,
  Package,
  Receipt,
  LogOut,
  Wrench,
  Info,
  Mail,
  Home as HomeIcon,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NotificationCenter from "../notifications/NotificationCenter";
import Logo from "./Logo";
import { Avatar, Button, ButtonLink, Drawer, IconButton, Modal, cn } from "../ui";
import { ease } from "../../lib/motion";

const NAV = [
  { to: "/services", label: "Services", match: ["/services", "/providers"] },
  { to: "/rentals", label: "Rentals", match: ["/rentals"] },
  { to: "/about", label: "About", match: ["/about"] },
  { to: "/contact", label: "Contact", match: ["/contact"] },
];

const QUICK_SEARCHES = ["Deep cleaning", "AC repair", "Plumber", "Electrician", "Haircut at home", "Yoga trainer"];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    setDrawerOpen(false);
    await logout();
    navigate("/login");
  };

  const isCustomer = user && (user.role === "customer" || user.role === "admin");
  const dashboardPath =
    user?.role === "admin" ? "/admin/dashboard" : user?.role === "provider" ? "/provider/dashboard" : "/dashboard";

  const isActive = (item) => item.match.some((m) => location.pathname.startsWith(m));

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300",
          scrolled
            ? "bg-surface-950/80 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_8px_32px_-16px_rgb(0_0_0/0.6)]"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-white focus:text-surface-950 focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <div className="container-page h-16 flex items-center gap-4">
          <Logo />

          {/* Desktop navigation */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1 ml-6">
            {NAV.map((item) => {
              const active = isActive(item);
              return (
                <RouterNavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative h-9 px-3.5 inline-flex items-center rounded-lg text-sm font-medium transition-colors duration-200",
                    active ? "text-white" : "text-ink-300 hover:text-white"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-white/[0.07]"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative">{item.label}</span>
                  {item.to === "/rentals" && (
                    <span className="relative ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  )}
                </RouterNavLink>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Search trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden md:inline-flex items-center gap-2.5 h-9 pl-3 pr-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-sm text-ink-400 hover:text-ink-200 transition-colors w-56 xl:w-64"
              aria-label="Search services and rentals"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              <span className="flex-1 text-left">Search NexServe</span>
              <kbd className="hidden xl:inline-flex items-center h-5 px-1.5 rounded-md bg-white/[0.06] text-[11px] font-medium text-ink-400 font-sans">
                ⌘K
              </kbd>
            </button>
            <IconButton icon={Search} label="Search" className="md:hidden" onClick={() => setSearchOpen(true)} />

            {user ? (
              <>
                <NotificationCenter />
                <div className="relative hidden lg:block" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-xl hover:bg-white/[0.06] transition-colors"
                  >
                    <Avatar src={user.profile_image} name={user.full_name} size="sm" />
                    <span className="text-sm font-medium text-ink-100 max-w-[110px] truncate">
                      {user.full_name?.split(" ")[0]}
                    </span>
                    <ChevronDown
                      className={cn("w-4 h-4 text-ink-400 transition-transform duration-200", menuOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        role="menu"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: ease.out }}
                        className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-surface-850/95 backdrop-blur-xl border border-white/[0.08] shadow-[var(--shadow-pop)] p-1.5"
                      >
                        <div className="px-3 py-3 flex items-center gap-3">
                          <Avatar src={user.profile_image} name={user.full_name} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                            <p className="text-xs text-ink-400 truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="h-px bg-white/[0.06] my-1" />
                        <MenuLink to={dashboardPath} icon={LayoutDashboard}>
                          Dashboard
                        </MenuLink>
                        {isCustomer && (
                          <>
                            <MenuLink to="/history" icon={Receipt}>
                              Service history
                            </MenuLink>
                            <MenuLink to="/my-rentals" icon={Package}>
                              My rentals
                            </MenuLink>
                          </>
                        )}
                        <div className="h-px bg-white/[0.06] my-1" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 h-10 px-3 rounded-xl text-sm text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" />
                          Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5">
                <ButtonLink to="/login" variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/login" variant="white" size="sm">
                  Get started
                </ButtonLink>
              </div>
            )}

            <IconButton
              icon={Menu}
              label="Open menu"
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
            />
          </div>
        </div>
      </header>

      {/* Mobile / tablet drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={<Logo />}
        footer={
          user ? (
            <Button variant="secondary" fullWidth icon={LogOut} onClick={handleLogout}>
              Sign out
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink to="/login" variant="secondary">
                Sign in
              </ButtonLink>
              <ButtonLink to="/login" variant="primary">
                Get started
              </ButtonLink>
            </div>
          )
        }
      >
        <div className="p-4 space-y-6">
          {user && (
            <Link
              to={dashboardPath}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
            >
              <Avatar src={user.profile_image} name={user.full_name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                <p className="text-xs text-ink-400 capitalize">{user.role} account</p>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-400" aria-hidden="true" />
            </Link>
          )}
          <nav aria-label="Mobile" className="space-y-1">
            <DrawerLink to="/" icon={HomeIcon} active={location.pathname === "/"}>
              Home
            </DrawerLink>
            <DrawerLink to="/services" icon={Wrench} active={location.pathname.startsWith("/services")}>
              Services
            </DrawerLink>
            <DrawerLink to="/rentals" icon={Package} active={location.pathname.startsWith("/rentals")}>
              Rentals
            </DrawerLink>
            {isCustomer && (
              <>
                <DrawerLink to="/history" icon={Receipt} active={location.pathname === "/history"}>
                  Service history
                </DrawerLink>
                <DrawerLink to="/my-rentals" icon={Package} active={location.pathname === "/my-rentals"}>
                  My rentals
                </DrawerLink>
              </>
            )}
            {user && (
              <DrawerLink to={dashboardPath} icon={LayoutDashboard} active={location.pathname === dashboardPath}>
                Dashboard
              </DrawerLink>
            )}
            <DrawerLink to="/about" icon={Info} active={location.pathname === "/about"}>
              About
            </DrawerLink>
            <DrawerLink to="/contact" icon={Mail} active={location.pathname === "/contact"}>
              Contact
            </DrawerLink>
          </nav>
        </div>
      </Drawer>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MenuLink({ to, icon: Icon, children }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-2.5 h-10 px-3 rounded-xl text-sm text-ink-200 hover:text-white hover:bg-white/[0.06] transition-colors"
    >
      <Icon className="w-4 h-4 text-ink-400" aria-hidden="true" />
      {children}
    </Link>
  );
}

function DrawerLink({ to, icon: Icon, active, children }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 h-12 px-3 rounded-xl text-[15px] font-medium transition-colors",
        active ? "bg-white/[0.07] text-white" : "text-ink-200 hover:bg-white/[0.04] hover:text-white"
      )}
    >
      <Icon className={cn("w-[18px] h-[18px]", active ? "text-primary-300" : "text-ink-400")} aria-hidden="true" />
      {children}
    </Link>
  );
}

/** Global search: query services or rentals, with popular shortcuts. */
function SearchDialog({ open, onClose }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const go = (path) => {
    onClose();
    setQ("");
    navigate(path);
  };
  const query = q.trim();

  return (
    <Modal open={open} onClose={onClose} size="md" hideClose className="sm:mt-[-12vh]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(query ? `/services?search=${encodeURIComponent(query)}` : "/services");
        }}
        className="pt-5 sm:pt-0"
      >
        <div className="relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" aria-hidden="true" />
          <input
            data-autofocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What do you need help with?"
            aria-label="Search services and rentals"
            className="w-full h-14 pl-8 pr-2 bg-transparent text-lg text-white placeholder:text-ink-500 outline-none border-b border-white/[0.08] focus:border-primary-400/60 transition-colors"
          />
        </div>
      </form>

      {query ? (
        <div className="pt-4 space-y-1">
          <SearchRow onClick={() => go(`/services?search=${encodeURIComponent(query)}`)} icon={Wrench}>
            Search services for <span className="text-white font-medium">“{query}”</span>
          </SearchRow>
          <SearchRow onClick={() => go(`/rentals?search=${encodeURIComponent(query)}`)} icon={Package} rental>
            Search rentals for <span className="text-white font-medium">“{query}”</span>
          </SearchRow>
        </div>
      ) : (
        <div className="pt-5">
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wider mb-3">Popular right now</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_SEARCHES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => go(`/services?search=${encodeURIComponent(s)}`)}
                className="h-8 px-3 rounded-full text-[13px] text-ink-200 bg-white/[0.04] border border-white/[0.07] hover:border-white/20 hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <SearchRow onClick={() => go("/services")} icon={Wrench}>
              Browse all services
            </SearchRow>
            <SearchRow onClick={() => go("/rentals")} icon={Package} rental>
              Browse rentals
            </SearchRow>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SearchRow({ icon: Icon, children, onClick, rental }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-3 h-12 px-3 rounded-xl text-left text-sm text-ink-300 hover:bg-white/[0.05] transition-colors"
    >
      <span
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          rental ? "bg-emerald-500/10 text-emerald-300" : "bg-primary-500/12 text-primary-300"
        )}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <span className="flex-1 min-w-0 truncate">{children}</span>
      <CornerDownLeft className="w-4 h-4 text-ink-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
    </button>
  );
}
