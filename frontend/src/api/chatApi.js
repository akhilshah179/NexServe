import api from "./axios";

export async function fetchBookingMessagesApi(bookingId) {
  const res = await api.get(`/chat/bookings/${bookingId}`);
  return res.data;
}

export async function sendChatMessageApi(bookingId, messageData) {
  const res = await api.post(`/chat/bookings/${bookingId}`, messageData);
  return res.data;
}
