import { Loader2 } from "lucide-react";

/** Full-height loading state used by route guards and lazy routes. */
export default function RouteFallback({ label = "Loading" }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-3 text-ink-400">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" aria-hidden="true" />
        <p className="text-sm">{label}…</p>
      </div>
    </div>
  );
}
