/**
 * AppRoutes — Centralized routing & Protected Route Guards.
 */

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "../context/AuthContext";
import { NotificationProvider } from "../context/NotificationContext";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Services from "../pages/Services";
import About from "../pages/About";
import Contact from "../pages/Contact";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import ServiceHistory from "../pages/ServiceHistory";
import ProviderDashboard from "../pages/ProviderDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import NotFound from "../pages/NotFound";

import ServiceProviders from "../pages/ServiceProviders";
import ProviderDetail from "../pages/ProviderDetail";
import Rentals from "../pages/Rentals";
import RentalDetail from "../pages/RentalDetail";
import MyRentals from "../pages/MyRentals";

// Scrolls to top whenever the route changes
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function AppRoutes() {
  return (
    <AuthProvider>
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
                    <ProviderDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
