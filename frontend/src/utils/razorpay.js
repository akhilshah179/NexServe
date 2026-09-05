/**
 * Razorpay SDK script loader & checkout launcher utility.
 */

import { createPaymentOrder, verifyPayment, createRentalPaymentOrder, verifyRentalPayment } from "../api/paymentsApi";

/**
 * Dynamically injects the Razorpay Checkout script if not present.
 * @returns {Promise<boolean>}
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Initiate Razorpay checkout flow for a given booking.
 * @param {object} params
 * @param {object} params.booking - Booking object containing id and total_amount
 * @param {object} [params.user] - Authenticated user object
 * @param {function} [params.onSuccess] - Callback when payment signature is verified
 * @param {function} [params.onError] - Callback on payment failure or cancellation
 */
export async function initiateRazorpayCheckout({ booking, user, onSuccess, onError }) {
  try {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      throw new Error("Failed to load Razorpay SDK script. Please check your internet connection.");
    }

    const orderData = await createPaymentOrder(booking.id);

    if (orderData.key_id === "rzp_test_demo_key") {
      try {
        const verifiedPayment = await verifyPayment(
          orderData.razorpay_order_id,
          `pay_demo_${booking.id}`,
          "demo_signature"
        );
        if (onSuccess) onSuccess(verifiedPayment);
      } catch (err) {
        if (onError) onError(err.response?.data?.detail || err.message || "Demo payment failed.");
      }
      return;
    }

    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "NexServe",
      description: `Payment for Booking #${booking.id}`,
      order_id: orderData.razorpay_order_id,
      handler: async function (response) {
        try {
          const verifiedPayment = await verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
          if (onSuccess) onSuccess(verifiedPayment);
        } catch (err) {
          if (onError) onError(err.response?.data?.detail || err.message || "Payment verification failed.");
        }
      },
      prefill: {
        name: user?.full_name || "",
        email: user?.email || "",
      },
      theme: {
        color: "#6366f1",
      },
      modal: {
        ondismiss: function () {
          if (onError) onError("Payment checkout closed without completing payment.");
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      if (onError) onError(response.error?.description || "Payment failed.");
    });
    rzp.open();
  } catch (err) {
    if (onError) onError(err.response?.data?.detail || err.message || "Unable to initiate Razorpay checkout.");
  }
}

/**
 * Initiate Razorpay checkout flow for a given rental booking.
 * @param {object} params
 * @param {object} params.rentalBooking - Rental Booking object containing id and total_amount_charged
 * @param {object} [params.user] - Authenticated user object
 * @param {function} [params.onSuccess] - Callback when payment signature is verified
 * @param {function} [params.onError] - Callback on payment failure or cancellation
 */
export async function initiateRentalRazorpayCheckout({ rentalBooking, user, onSuccess, onError }) {
  try {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      throw new Error("Failed to load Razorpay SDK script. Please check your internet connection.");
    }

    const orderData = await createRentalPaymentOrder(rentalBooking.id);

    if (orderData.key_id === "rzp_test_demo_key") {
      try {
        const verifiedPayment = await verifyRentalPayment(
          rentalBooking.id,
          orderData.razorpay_order_id,
          `pay_demo_rental_${rentalBooking.id}`,
          "demo_signature"
        );
        if (onSuccess) onSuccess(verifiedPayment);
      } catch (err) {
        if (onError) onError(err.response?.data?.detail || err.message || "Demo rental payment failed.");
      }
      return;
    }

    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "NexServe Rentals",
      description: `Rental Booking #${rentalBooking.id} (incl. Security Deposit)`,
      order_id: orderData.razorpay_order_id,
      handler: async function (response) {
        try {
          const verifiedPayment = await verifyRentalPayment(
            rentalBooking.id,
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
          if (onSuccess) onSuccess(verifiedPayment);
        } catch (err) {
          if (onError) onError(err.response?.data?.detail || err.message || "Rental payment verification failed.");
        }
      },
      prefill: {
        name: user?.full_name || "",
        email: user?.email || "",
      },
      theme: {
        color: "#10b981", // Emerald accent for rentals
      },
      modal: {
        ondismiss: function () {
          if (onError) onError("Payment checkout closed without completing payment.");
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      if (onError) onError(response.error?.description || "Rental payment failed.");
    });
    rzp.open();
  } catch (err) {
    if (onError) onError(err.response?.data?.detail || err.message || "Unable to initiate rental Razorpay checkout.");
  }
}

