import api from "./axios";

export async function createBooking(bookingData) {
  const res = await api.post("/bookings", bookingData);
  return res.data;
}

export async function getMyBookings(statusFilter = null) {
  const params = statusFilter ? { status_filter: statusFilter } : {};
  const res = await api.get("/bookings/my", { params });
  return res.data;
}

export async function getBookingByIdApi(bookingId) {
  const res = await api.get(`/bookings/${bookingId}`);
  return res.data;
}

export async function confirmBookingApi(bookingId) {
  const res = await api.post(`/bookings/${bookingId}/confirm`);
  return res.data;
}

export async function rejectBookingApi(bookingId) {
  const res = await api.post(`/bookings/${bookingId}/reject`);
  return res.data;
}

export async function cancelBookingApi(bookingId, cancellationReason) {
  const res = await api.post(`/bookings/${bookingId}/cancel`, { cancellation_reason: cancellationReason });
  return res.data;
}

export async function providerOnTheWayApi(bookingId) {
  const res = await api.post(`/bookings/${bookingId}/on-the-way`);
  return res.data;
}

export async function startBookingApi(bookingId) {
  const res = await api.post(`/bookings/${bookingId}/start`);
  return res.data;
}

export async function completeBookingApi(bookingId) {
  const res = await api.post(`/bookings/${bookingId}/complete`);
  return res.data;
}

export async function rescheduleBookingApi(bookingId, newBookingDate, newTimeSlot) {
  const res = await api.post(`/bookings/${bookingId}/reschedule`, {
    new_booking_date: newBookingDate,
    new_time_slot: newTimeSlot,
  });
  return res.data;
}

export async function updateBookingStatus(bookingId, status, cancellationReason = null) {
  const res = await api.patch(`/bookings/${bookingId}/status`, {
    status,
    cancellation_reason: cancellationReason,
  });
  return res.data;
}

export async function fetchBookedSlotsApi(providerId, bookingDate) {
  const res = await api.get(`/bookings/provider/${providerId}/slots`, {
    params: { booking_date: bookingDate },
  });
  return res.data;
}
