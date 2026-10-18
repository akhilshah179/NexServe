import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Copy, Check, Share2, Wallet, Users } from "lucide-react";
import { fetchMyReferralsApi } from "../../api/referralsApi";
import { Reveal, AnimatedNumber, cn } from "../ui";
import { formatINR } from "../../lib/format";

/** Referral rewards — only renders for signed-in users with a referral profile. */
export default function ReferralCard({ className }) {
  const [referralData, setReferralData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyReferralsApi()
      .then((res) => setReferralData(res))
      .catch((err) => console.debug("Could not fetch referral details:", err))
      .finally(() => setLoading(false));
  }, []);

  const flashCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleCopy = async () => {
    if (!referralData?.referral_code) return;
    try {
      await navigator.clipboard.writeText(referralData.referral_code);
      flashCopied();
    } catch {
      /* clipboard can be blocked; the code is still visible to copy manually */
    }
  };

  const handleShare = async () => {
    if (!referralData?.referral_code) return;
    const shareUrl = `${window.location.origin}/register?ref=${referralData.referral_code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join NexServe & get ₹100 off",
          text: `Use my referral code ${referralData.referral_code} on NexServe for ₹100 off your first service.`,
          url: shareUrl,
        });
      } catch {
        /* user dismissed the share sheet */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        flashCopied();
      } catch {
        /* ignore */
      }
    }
  };

  if (loading || !referralData) return null;

  return (
    <Reveal className={cn("relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface-900", className)}>
      <div
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[radial-gradient(closest-side,rgb(97_80_226/0.22),transparent)] blur-2xl pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="flex gap-4">
          <span className="w-12 h-12 rounded-2xl bg-primary-500/12 text-primary-300 flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-xl font-semibold text-white">Give ₹100, get ₹100</h3>
            <p className="mt-1.5 text-sm text-ink-400 leading-relaxed max-w-md">
              Friends get ₹100 off their first booking. You earn ₹100 in credits when their service is completed.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 surface-inset p-3.5">
            <p className="text-xs text-ink-400">Your code</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-mono text-lg font-semibold tracking-wider text-white truncate">{referralData.referral_code}</span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy referral code"}
                className="ml-auto w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.1] text-ink-100 transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={copied ? "y" : "n"}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  </motion.span>
                </AnimatePresence>
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share referral link"
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.1] text-ink-100 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="sm:w-40 surface-inset p-3.5">
            <p className="text-xs text-ink-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
              Credits
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-300 tabular font-heading">
              <AnimatedNumber value={referralData.referral_credits || 0} format={(n) => formatINR(n)} />
            </p>
            <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3" aria-hidden="true" />
              {referralData.successful_referrals || 0} joined
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
