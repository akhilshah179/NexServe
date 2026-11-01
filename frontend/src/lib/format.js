/**
 * Formatting helpers — currency, dates and API error messages.
 */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inrPrecise = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,299 — whole rupees for listings and summaries. */
export function formatINR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "₹0";
  return `₹${inr.format(Math.round(n))}`;
}

/** ₹1,299.00 — for payable totals and price breakdown rows. */
export function formatINRPrecise(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "₹0.00";
  return `₹${inrPrecise.format(n)}`;
}

export function formatDate(value, opts = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", opts);
}

export function formatDateShort(value) {
  return formatDate(value, { day: "numeric", month: "short" });
}

export function formatWeekday(value) {
  return formatDate(value, { weekday: "short", day: "numeric", month: "short" });
}

export function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(minutes) {
  const m = Number(minutes) || 0;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

/** YYYY-MM-DD in the user's local timezone (not UTC). */
export function toISODate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(start, end) {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "N"
  );
}

/**
 * Safely extract an array from any data response (handles direct array, { items: [] }, { data: [] }, { results: [] }, or custom key).
 * Returns an empty array if data is null, undefined, error object, or invalid.
 */
export function toArray(data, key = null) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (key && Array.isArray(data[key])) return data[key];
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.services)) return data.services;
    if (Array.isArray(data.providers)) return data.providers;
    if (Array.isArray(data.bookings)) return data.bookings;
    if (Array.isArray(data.reviews)) return data.reviews;
  }
  return [];
}

/**
 * Turn an axios/FastAPI error into a sentence a person can act on.
 * FastAPI returns `detail` as a string or a list of validation errors.
 */
export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : null;
    return field ? `${String(field).replace(/_/g, " ")}: ${first.msg}` : first.msg || fallback;
  }
  if (err.code === "ECONNABORTED") return "The request timed out. Check your connection and try again.";
  if (err.message === "Network Error") return "We couldn't reach NexServe. Check your connection and try again.";
  return err.message && !/status code/i.test(err.message) ? err.message : fallback;
}
