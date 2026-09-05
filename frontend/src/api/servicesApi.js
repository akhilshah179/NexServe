/**
 * Services & Categories API Client.
 * Connects React frontend to FastAPI services endpoints.
 */

import api from "./axios";

/**
 * Fetch all service categories, optionally with their child services.
 */
export async function getCategories(options = {}) {
  const includeServices = typeof options === "boolean" ? options : options?.includeServices;
  const params = {};
  if (includeServices) params.include_services = true;
  const res = await api.get("/categories", { params });
  return res.data;
}

/**
 * Fetch a single category by ID.
 */
export async function getCategoryById(categoryId) {
  const res = await api.get(`/categories/${categoryId}`);
  return res.data;
}

/**
 * Fetch all services, optionally filtered.
 */
export async function getServices({ categoryId, providerId, search } = {}) {
  const params = {};
  if (categoryId) params.category_id = categoryId;
  if (providerId) params.provider_id = providerId;
  if (search) params.search = search;
  const res = await api.get("/services", { params });
  return res.data;
}

/**
 * Fetch a single service by ID.
 */
export async function getServiceById(serviceId) {
  const res = await api.get(`/services/${serviceId}`);
  return res.data;
}

/**
 * Fetch all providers who offer services in a specific category.
 */
export async function getProvidersByCategory(categoryId) {
  const res = await api.get(`/categories/${categoryId}/providers`);
  return res.data;
}

/**
 * Fetch booked time slots for a provider on a specific date.
 * @param {number} providerId
 * @param {string} date - YYYY-MM-DD format
 */
export async function getProviderSlots(providerId, date) {
  const res = await api.get(`/bookings/provider/${providerId}/slots`, {
    params: { booking_date: date },
  });
  return res.data;
}

export async function createService(serviceData) {
  const res = await api.post("/services", serviceData);
  return res.data;
}
