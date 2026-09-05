import api from "./axios";

/**
 * Fetch smart recommendations for the current user/guest
 * @param {Object} params { category_id, limit }
 */
export async function fetchRecommendationsApi(params = {}) {
  const res = await api.get("/recommendations", { params });
  return res.data;
}

/**
 * Track user interaction for recommendation ranking
 * @param {Object} payload { service_id, interaction_type: 'view'|'click'|'search'|'book' }
 */
export async function trackInteractionApi(payload) {
  try {
    const res = await api.post("/recommendations/track", payload);
    return res.data;
  } catch (err) {
    // Non-blocking interaction tracking failure
    console.debug("Failed to track recommendation interaction:", err);
    return null;
  }
}
