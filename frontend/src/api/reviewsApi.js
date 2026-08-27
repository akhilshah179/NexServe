import api from "./axios";

export async function submitReviewApi(reviewData) {
  const res = await api.post("/reviews", reviewData);
  return res.data;
}

export async function replyToReviewApi(reviewId, replyData) {
  const res = await api.post(`/reviews/${reviewId}/reply`, replyData);
  return res.data;
}

export async function fetchProviderReviewsApi(providerId) {
  const res = await api.get(`/reviews/provider/${providerId}`);
  return res.data;
}
