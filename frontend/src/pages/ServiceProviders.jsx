/**
 * ServiceProviders.jsx — Category Services & Providers Discovery Page.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getCategoryById, getServices } from "../api/servicesApi";
import { fetchPublicProvidersApi } from "../api/providersApi";
import EmergencyBookingModal from "../components/emergency/EmergencyBookingModal";
import BookingWizardModal from "../components/booking/BookingWizardModal";
import { Siren, Wrench, Users, SearchX, UserX } from "lucide-react";
import ServiceCard from "../components/cards/ServiceCard";
import ProviderCard from "../components/cards/ProviderCard";
import {
  PageHeader,
  Tabs,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  SkeletonGrid,
  Stagger,
  StaggerItem,
  useToast,
  cn,
} from "../components/ui";
import { serviceVisual } from "../lib/visuals";

export default function ServiceProviders() {
  const { categoryId } = useParams();
  const [category, setCategory] = useState(null);
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("services");

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [bookingService, setBookingService] = useState(null);

  const navigate = useNavigate();

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [catData, provData, svcData] = await Promise.all([
        getCategoryById(categoryId),
        fetchPublicProvidersApi({ category_id: categoryId }),
        getServices({ categoryId }),
      ]);
      setCategory(catData);
      setProviders(provData || []);
      setServices(svcData || []);
    } catch (err) {
      console.warn("Failed to load category details:", err);
      setError(err.response?.status === 404 ? "notfound" : "Failed to load category data.");
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const servicesByProvider = {};
  services.forEach((svc) => {
    if (!servicesByProvider[svc.provider_id]) {
      servicesByProvider[svc.provider_id] = [];
    }
    servicesByProvider[svc.provider_id].push(svc);
  });

  const visual = serviceVisual(category);
  const Icon = visual.icon;

  return (
    <div className="pb-24">
      <PageHeader
        breadcrumbs={[{ label: "Services", to: "/services" }, { label: category?.name || "Category" }]}
        eyebrow={
          <span className="inline-flex items-center gap-2 normal-case tracking-normal text-sm">
            <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center", visual.toneClasses.bg)}>
              <Icon className={cn("w-4 h-4", visual.toneClasses.icon)} aria-hidden="true" />
            </span>
            Category
          </span>
        }
        title={category?.name || (loading ? "Loading…" : "Service category")}
        subtitle={category?.description || "Explore doorstep services and background-checked professionals in this category."}
        actions={
          <Button variant="danger-ghost" icon={Siren} onClick={() => setShowEmergencyModal(true)}>
            24/7 emergency help
          </Button>
        }
      >
        {!error && (
          <div className="mt-8">
            <Tabs
              ariaLabel="View"
              value={activeView}
              onChange={setActiveView}
              items={[
                { id: "services", label: "Services", icon: Wrench, count: loading ? undefined : services.length },
                { id: "providers", label: "Professionals", icon: Users, count: loading ? undefined : providers.length },
              ]}
            />
          </div>
        )}
      </PageHeader>

      <div className="container-page">
        {loading ? (
          <SkeletonGrid count={6} media={false} className="xl:grid-cols-3" />
        ) : error ? (
          error === "notfound" ? (
            <EmptyState
              icon={SearchX}
              title="This category doesn't exist"
              description="It may have been renamed or removed."
              action={<ButtonLink to="/services">Browse all services</ButtonLink>}
            />
          ) : (
            <ErrorState onRetry={fetchData} backTo="/services" backLabel="All services" />
          )
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              {activeView === "services" ? (
                services.length === 0 ? (
                  <EmptyState
                    icon={Wrench}
                    title={`No services in ${category?.name} yet`}
                    description="Professionals haven't published services in this category. Try a related one."
                    action={<ButtonLink to="/services" variant="secondary">Browse other categories</ButtonLink>}
                  />
                ) : (
                  <Stagger animateOnMount className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((svc) => (
                      <StaggerItem key={svc.id}>
                        <ServiceCard service={svc} category={category} showCategory={false} onBook={() => setBookingService(svc)} />
                      </StaggerItem>
                    ))}
                  </Stagger>
                )
              ) : providers.length === 0 ? (
                <EmptyState
                  icon={UserX}
                  title="No verified professionals yet"
                  description="We're onboarding professionals for this category. Check back soon or request emergency help."
                  action={<ButtonLink to="/services" variant="secondary">Back to services</ButtonLink>}
                />
              ) : (
                <Stagger animateOnMount className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {providers.map((p) => {
                    const pServices = servicesByProvider[p.id] || [];
                    const minPrice = pServices.length > 0 ? Math.min(...pServices.map((s) => s.price)) : null;
                    return (
                      <StaggerItem key={p.id}>
                        <ProviderCard provider={p} startingPrice={minPrice ?? undefined} to={`/providers/${p.id}?category=${categoryId}`} />
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <EmergencyBookingModal
        open={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        onSuccess={() => toast.info("Track your technician", "Your emergency booking appears in your dashboard.")}
      />

      {bookingService && (
        <BookingWizardModal
          service={bookingService}
          onClose={() => setBookingService(null)}
          onSuccess={() => {
            setBookingService(null);
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
}
