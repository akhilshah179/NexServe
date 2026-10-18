/**
 * AppRoutes — Centralized routing & Protected Route Guards.
 */

import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";
import { ToastProvider } from "../components/ui";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import RouteFallback from "./RouteFallback";
import Home from "../pages/Home";
import Services from "../pages/Services";
import About from "../pages/About";
import Contact from "../pages/Contact";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import ServiceHistory from "../pages/ServiceHistory";
import NotFound from "../pages/NotFound";

import ServiceProviders from "../pages/ServiceProviders";
import ProviderDetail from "../pages/ProviderDetail";
import Rentals from "../pages/Rentals";
import RentalDetail from "../pages/RentalDetail";
import MyRentals from "../pages/MyRentals";

// Role dashboards are large and only needed by providers/admins — load on demand.
const ProviderDashboard = lazy(() => import("../pages/ProviderDashboard"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));

// Scrolls to top whenever the route changes
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Wait for the page to render before jumping to the anchor.
      const id = setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      return () => clearTimeout(id);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);
  return null;
}

export default function AppRoutes() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                {/* Public & Main App Pages */}
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/services/:categoryId" element={<ServiceProviders />} />
                  <Route path="/providers/:providerId" element={<ProviderDetail />} />
                  <Route path="/rentals" element={<Rentals />} />
                  <Route path="/rentals/:itemId" element={<RentalDetail />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected Role-Based Dashboards */}
                  <Route
                    path="/my-rentals"
                    element={
                      <ProtectedRoute allowedRoles={["customer", "admin"]}>
                        <MyRentals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["customer", "admin"]}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute allowedRoles={["customer", "admin"]}>
                        <ServiceHistory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/provider/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["provider", "admin"]}>
                        <Suspense fallback={<RouteFallback />}>
                          <ProviderDashboard />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <Suspense fallback={<RouteFallback />}>
                          <AdminDashboard />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch-all 404 */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
