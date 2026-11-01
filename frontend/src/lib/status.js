/**
 * Status metadata for service bookings and rental bookings.
 * One place for labels, tones, icons and lifecycle ordering so badges,
 * filters and timelines always agree with each other.
 */

import {
  Clock,
  CheckCircle2,
  Truck,
  Wrench,
  BadgeCheck,
  XCircle,
  Ban,
  PackageCheck,
  PackageOpen,
  MapPin,
  CreditCard,
  RotateCcw,
  SearchCheck,
  Wallet,
  AlertTriangle,
  Send,
} from "lucide-react";

/* ───────────────────────── Service bookings ───────────────────────── */

export const BOOKING_STATUS = {
  pending: { label: "Awaiting payment", tone: "amber", icon: CreditCard },
  requested: { label: "Requested", tone: "amber", icon: Send },
  confirmed: { label: "Confirmed", tone: "indigo", icon: CheckCircle2 },
  provider_on_the_way: { label: "On the way", tone: "blue", icon: Truck },
  in_progress: { label: "In progress", tone: "blue", icon: Wrench },
  completed: { label: "Completed", tone: "emerald", icon: BadgeCheck },
  cancelled: { label: "Cancelled", tone: "neutral", icon: Ban },
  rejected: { label: "Declined", tone: "rose", icon: XCircle },
};

export const BOOKING_STEPS = [
  { key: "requested", label: "Requested", desc: "Booking placed", icon: Send },
  { key: "confirmed", label: "Confirmed", desc: "Professional assigned", icon: CheckCircle2 },
  { key: "provider_on_the_way", label: "On the way", desc: "Professional en route", icon: Truck },
  { key: "in_progress", label: "In progress", desc: "Service underway", icon: Wrench },
  { key: "completed", label: "Completed", desc: "Job finished", icon: BadgeCheck },
];

export function bookingStepIndex(status) {
  switch ((status || "").toLowerCase()) {
    case "pending":
    case "requested":
      return 0;
    case "confirmed":
      return 1;
    case "provider_on_the_way":
      return 2;
    case "in_progress":
      return 3;
    case "completed":
      return 4;
    default:
      return -1;
  }
}

export const BOOKING_GROUPS = {
  upcoming: ["pending", "requested", "confirmed", "provider_on_the_way", "in_progress"],
  completed: ["completed"],
  cancelled: ["cancelled", "rejected"],
};

/* ───────────────────────── Rental bookings ───────────────────────── */

export const RENTAL_STATUS = {
  REQUESTED: { label: "Awaiting payment", tone: "amber", icon: Clock },
  CONFIRMED: { label: "Confirmed", tone: "emerald", icon: CheckCircle2 },
  PAYMENT_COMPLETED: { label: "Paid & confirmed", tone: "emerald", icon: CheckCircle2 },
  READY_FOR_PICKUP: { label: "Ready for pickup", tone: "teal", icon: MapPin },
  READY_FOR_DELIVERY: { label: "Out for delivery", tone: "blue", icon: Truck },
  RENTED: { label: "Active rental", tone: "emerald", icon: PackageOpen },
  RETURN_PENDING: { label: "Return in progress", tone: "indigo", icon: RotateCcw },
  RETURNED: { label: "Returned", tone: "violet", icon: PackageCheck },
  INSPECTED: { label: "Inspected", tone: "violet", icon: SearchCheck },
  COMPLETED: { label: "Deposit refunded", tone: "emerald", icon: Wallet },
  DAMAGE_REPORTED: { label: "Damage claim", tone: "rose", icon: AlertTriangle },
  CANCELLED: { label: "Cancelled", tone: "neutral", icon: Ban },
  REJECTED: { label: "Declined", tone: "rose", icon: XCircle },
};

/**
 * Rental lifecycle shown to customers:
 * Booked → Confirmed → Ready → Picked up / Delivered → Active → Returned → Inspected → Deposit refunded
 */
export function rentalLifecycle(fulfillmentType) {
  const delivery = fulfillmentType === "DELIVERY";
  return [
    { key: "booked", label: "Booked", icon: Send },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
    { key: "ready", label: "Ready", icon: delivery ? Truck : MapPin },
    { key: "handover", label: delivery ? "Delivered" : "Picked up", icon: PackageOpen },
    { key: "active", label: "Active", icon: Clock },
    { key: "returned", label: "Returned", icon: RotateCcw },
    { key: "inspected", label: "Inspected", icon: SearchCheck },
    { key: "refunded", label: "Deposit refunded", icon: Wallet },
  ];
}

/** Index of the current lifecycle step for a backend rental status. */
export function rentalStepIndex(status, depositStatus) {
  switch (status) {
    case "REQUESTED":
      return 0;
    case "CONFIRMED":
    case "PAYMENT_COMPLETED":
      return 1;
    case "READY_FOR_PICKUP":
    case "READY_FOR_DELIVERY":
      return 2;
    case "RENTED":
      // Handover is complete once the item is rented — show it as active.
      return 4;
    case "RETURN_PENDING":
      return 5;
    case "RETURNED":
      return 5;
    case "INSPECTED":
      return depositStatus === "REFUNDED" ? 7 : 6;
    case "COMPLETED":
      return 7;
    default:
      return -1;
  }
}

export const RENTAL_GROUPS = {
  active: ["RENTED", "RETURN_PENDING"],
  upcoming: ["REQUESTED", "CONFIRMED", "PAYMENT_COMPLETED", "READY_FOR_PICKUP", "READY_FOR_DELIVERY"],
  completed: ["COMPLETED", "RETURNED", "INSPECTED"],
  cancelled: ["CANCELLED", "REJECTED", "DAMAGE_REPORTED"],
};

export function statusMeta(status, kind = "booking") {
  if (kind === "rental") {
    return RENTAL_STATUS[status] || { label: humanize(status), tone: "neutral", icon: Clock };
  }
  const key = (status || "").toLowerCase();
  return BOOKING_STATUS[key] || { label: humanize(status), tone: "neutral", icon: Clock };
}

export function humanize(value = "") {
  const s = String(value || "").replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
