import { motion } from "framer-motion";
import { Home, Compass, Package } from "lucide-react";
import { ButtonLink } from "../components/ui";
import { ease } from "../lib/motion";

export default function NotFound() {
  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_45%,black,transparent)]" aria-hidden="true" />
      <div className="text-center max-w-lg">
        <motion.p
          initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: ease.out }}
          className="text-[120px] sm:text-[160px] leading-none font-semibold font-heading text-gradient tracking-tighter"
          aria-hidden="true"
        >
          404
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.45, ease: ease.out }}>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-white">This page took the day off</h1>
          <p className="mt-3 text-ink-400 leading-relaxed">
            The page you're looking for may have moved or no longer exists. Let's get you somewhere useful.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <ButtonLink to="/" icon={Home} className="w-full sm:w-auto">
              Back home
            </ButtonLink>
            <ButtonLink to="/services" variant="secondary" icon={Compass} className="w-full sm:w-auto">
              Explore services
            </ButtonLink>
            <ButtonLink to="/rentals" variant="ghost" icon={Package} className="w-full sm:w-auto">
              Browse rentals
            </ButtonLink>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
