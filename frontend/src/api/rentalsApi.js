import api from "./axios";

// ── Categories ──────────────────────────────
export async function getRentalCategories() {
  const res = await api.get("/rentals/categories");
  return res.data;
}

// ── Rental Items (Catalog & Provider CRUD) ──
export async function getRentalItems(params = {}) {
  const res = await api.get("/rentals/items", { params });
  return res.data;
}

export async function getMyRentalItems() {
  const res = await api.get("/rentals/items/my");
  return res.data;
}

export async function getRentalItemDetail(itemId) {
  const res = await api.get(`/rentals/items/${itemId}`);
  return res.data;
}

export async function createRentalItem(itemData) {
  const res = await api.post("/rentals/items", itemData);
  return res.data;
}

export async function updateRentalItem(itemId, itemData) {
  const res = await api.put(`/rentals/items/${itemId}`, itemData);
  return res.data;
}

export async function deleteRentalItem(itemId) {
  const res = await api.delete(`/rentals/items/${itemId}`);
  return res.data;
}

// ── Availability & Pricing ───────────────────
export async function checkRentalAvailability(itemId, { start_date, end_date, quantity = 1 }) {
  const res = await api.post(`/rentals/items/${itemId}/availability`, {
    start_date,
    end_date,
    quantity,
  });
  return res.data;
}

export async function calculateRentalPrice(itemId, { start_date, end_date, quantity = 1, delivery_requested = false, coupon_code = null }) {
  const res = await api.post(`/rentals/items/${itemId}/calculate-price`, {
    start_date,
    end_date,
    quantity,
    delivery_requested,
    coupon_code,
  });
  return res.data;
}

// ── Rental Bookings ──────────────────────────
export async function createRentalBooking(payload) {
  const res = await api.post("/rentals/bookings", payload);
  return res.data;
}

export async function getMyRentalBookings() {
  const res = await api.get("/rentals/bookings/me");
  return res.data;
}

export async function getProviderRentalBookings() {
  const res = await api.get("/rentals/bookings/provider");
  return res.data;
}

export async function getRentalBookingDetail(bookingId) {
  const res = await api.get(`/rentals/bookings/${bookingId}`);
  return res.data;
}

export async function updateRentalBookingStatus(bookingId, status, notes = "") {
  const res = await api.patch(`/rentals/bookings/${bookingId}/status`, {
    status,
    notes,
  });
  return res.data;
}

// ── Return & Damage Claims ───────────────────
export async function processRentalReturn(bookingId, payload) {
  const res = await api.post(`/rentals/bookings/${bookingId}/return`, payload);
  return res.data;
}

export async function submitRentalDamageClaim(bookingId, payload) {
  const res = await api.post(`/rentals/bookings/${bookingId}/damage-claim`, payload);
  return res.data;
}

export async function getRentalDamageClaims(params = {}) {
  const res = await api.get("/rentals/damage-claims", { params });
  return res.data;
}

export async function reviewRentalDamageClaim(claimId, payload) {
  const res = await api.patch(`/rentals/damage-claims/${claimId}`, payload);
  return res.data;
}

// ── Reviews ──────────────────────────────────
export async function createRentalReview(itemId, payload) {
  const res = await api.post(`/rentals/items/${itemId}/reviews`, payload);
  return res.data;
}
