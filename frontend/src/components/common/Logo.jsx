import { Link } from "react-router-dom";
import { cn } from "../ui";

/** NexServe mark — two interlocking strokes forming an "N" inside a soft square. */
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-8 h-8", className)} aria-hidden="true">
      <defs>
        <linearGradient id="ns-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8b87f8" />
          <stop offset="1" stopColor="#5140c4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#ns-mark)" />
      <path d="M10 22V10l12 12V10" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22" cy="10" r="1.9" fill="#6ee7c8" />
    </svg>
  );
}

export default function Logo({ className, to = "/" }) {
  return (
    <Link to={to} className={cn("group inline-flex items-center gap-2.5 shrink-0 rounded-lg", className)} aria-label="NexServe home">
      <LogoMark className="transition-transform duration-300 group-hover:scale-105" />
      <span className="text-[17px] font-semibold tracking-tight text-white font-heading">NexServe</span>
    </Link>
  );
}
