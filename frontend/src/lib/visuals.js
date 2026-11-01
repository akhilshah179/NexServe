/**
 * Visual identity for categories.
 *
 * The API stores an emoji in `icon_url`; the UI maps category names to a
 * Lucide icon, an accent tone and a cover photograph so cards stay
 * consistent and never fall back to emoji. Matching is keyword-based so
 * new admin-created categories still get a sensible default.
 */

import {
  Sparkles,
  Snowflake,
  Scissors,
  GraduationCap,
  Dumbbell,
  Car,
  Wrench,
  Zap,
  Paintbrush,
  Bug,
  Truck,
  Shirt,
  Camera,
  Tent,
  Gamepad2,
  Armchair,
  Hammer,
  PartyPopper,
  BookOpen,
  Laptop,
  Bike,
  Package,
  Droplets,
} from "lucide-react";

const img = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/** Tone → Tailwind classes. Kept literal so Tailwind can see them. */
export const tones = {
  indigo: { icon: "text-primary-300", bg: "bg-primary-500/12", ring: "ring-primary-400/25", dot: "bg-primary-400" },
  blue: { icon: "text-accent-300", bg: "bg-accent-500/12", ring: "ring-accent-400/25", dot: "bg-accent-400" },
  emerald: { icon: "text-emerald-300", bg: "bg-emerald-500/12", ring: "ring-emerald-400/25", dot: "bg-emerald-400" },
  amber: { icon: "text-amber-300", bg: "bg-amber-500/12", ring: "ring-amber-400/25", dot: "bg-amber-400" },
  rose: { icon: "text-rose-300", bg: "bg-rose-500/12", ring: "ring-rose-400/25", dot: "bg-rose-400" },
  violet: { icon: "text-violet-300", bg: "bg-violet-500/12", ring: "ring-violet-400/25", dot: "bg-violet-400" },
  teal: { icon: "text-teal-300", bg: "bg-teal-500/12", ring: "ring-teal-400/25", dot: "bg-teal-400" },
  sky: { icon: "text-sky-300", bg: "bg-sky-500/12", ring: "ring-sky-400/25", dot: "bg-sky-400" },
};

const SERVICE_VISUALS = [
  { match: ["clean"], icon: Sparkles, tone: "sky", image: img("1581578731548-c64695cc6952") },
  { match: ["ac ", "ac&", "air", "cool", "ac repair"], icon: Snowflake, tone: "blue", image: img("1718203862467-c33159fdc504") },
  { match: ["salon", "beauty", "groom", "hair"], icon: Scissors, tone: "rose", image: img("1560066984-138dadb4c035") },
  { match: ["tutor", "teach", "education", "class"], icon: GraduationCap, tone: "violet", image: img("1503676260728-1c00da094a0b") },
  { match: ["fitness", "yoga", "gym", "trainer"], icon: Dumbbell, tone: "amber", image: img("1571019614242-c5c5dee9f50b") },
  { match: ["car", "vehicle", "auto"], icon: Car, tone: "indigo", image: img("1607860108855-64acf2078ed9") },
  { match: ["plumb", "pipe", "leak"], icon: Droplets, tone: "sky", image: img("1585704032915-c3400ca199e7") },
  { match: ["electric", "wiring"], icon: Zap, tone: "amber", image: img("1621905252507-b35492cc74b4") },
  { match: ["paint"], icon: Paintbrush, tone: "rose", image: img("1562259949-e8e7689d7828") },
  { match: ["pest", "termite"], icon: Bug, tone: "emerald", image: img("1563453392212-326f5e854473") },
  { match: ["pack", "mover", "shift", "reloc"], icon: Truck, tone: "indigo", image: img("1600518464441-9154a4dea21b") },
  { match: ["laundry", "dry clean", "iron"], icon: Shirt, tone: "teal", image: img("1545173168-9f1947eebb7f") },
  { match: ["photo"], icon: Camera, tone: "violet", image: img("1516035069371-29a1b244cc32") },
  { match: ["repair", "appliance", "handy"], icon: Wrench, tone: "blue", image: img("1621905251189-08b45d6a269e") },
];

const RENTAL_VISUALS = [
  { match: ["camera", "photo"], icon: Camera, tone: "violet" },
  { match: ["camp", "outdoor", "trek"], icon: Tent, tone: "emerald" },
  { match: ["gaming", "game", "vr"], icon: Gamepad2, tone: "indigo" },
  { match: ["furniture"], icon: Armchair, tone: "amber" },
  { match: ["tool"], icon: Hammer, tone: "sky" },
  { match: ["party", "event", "dj", "audio"], icon: PartyPopper, tone: "rose" },
  { match: ["book", "study"], icon: BookOpen, tone: "teal" },
  { match: ["electronic", "laptop"], icon: Laptop, tone: "blue" },
  { match: ["vehicle", "bike", "car"], icon: Bike, tone: "emerald" },
  { match: ["dress", "costume", "cloth"], icon: Shirt, tone: "rose" },
];

const findVisual = (list, name = "", fallback) => {
  const key = ` ${String(name).toLowerCase()} `;
  return list.find((v) => v.match.some((m) => key.includes(m))) || fallback;
};

export function serviceVisual(categoryOrName) {
  const name = typeof categoryOrName === "string" ? categoryOrName : categoryOrName?.name;
  const v = findVisual(SERVICE_VISUALS, name, {
    icon: Sparkles,
    tone: "indigo",
    image: img("1556761175-5973dc0f32e7"),
  });
  return { ...v, toneClasses: tones[v.tone] };
}

export function rentalVisual(categoryOrName) {
  const name =
    typeof categoryOrName === "string"
      ? categoryOrName
      : `${categoryOrName?.name || ""} ${categoryOrName?.slug || ""}`;
  const v = findVisual(RENTAL_VISUALS, name, { icon: Package, tone: "emerald" });
  return { ...v, toneClasses: tones[v.tone] };
}

export const FALLBACK_RENTAL_IMAGE = img("1516035069371-29a1b244cc32");

export function rentalImage(item) {
  return (
    item?.images?.find((i) => i.is_primary)?.image_url ||
    item?.images?.[0]?.image_url ||
    FALLBACK_RENTAL_IMAGE
  );
}

export const unsplash = img;
