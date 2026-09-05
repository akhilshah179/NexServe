import api from "./axios";

export async function createPaymentOrder(bookingId) {
  const res = await api.post("/payments/orders", { booking_id: bookingId });
  return res.data;
}

export async function verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const res = await api.post("/payments/verify", {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });
  return res.data;
}

export async function fetchPaymentsApi() {
  const res = await api.get("/payments");
  return res.data;
}

export async function processRefundApi(paymentId, refundAmountPaise = null, reason = "") {
  const res = await api.post("/payments/refund", {
    payment_id: paymentId,
    refund_amount_paise: refundAmountPaise,
    reason,
  });
  return res.data;
}

export async function createRentalPaymentOrder(rentalBookingId) {
  const res = await api.post("/payments/rentals/orders", { rental_booking_id: rentalBookingId });
  return res.data;
}

export async function verifyRentalPayment(rentalBookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const res = await api.post("/payments/rentals/verify", {
    rental_booking_id: rentalBookingId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });
  return res.data;
}


