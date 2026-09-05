import React, { useEffect, useState } from "react";
import { FiGift, FiCopy, FiCheck, FiUsers, FiDollarSign, FiShare2, FiArrowRight } from "react-icons/fi";
import { fetchMyReferralsApi } from "../../api/referralsApi";

export default function ReferralCard() {
  const [referralData, setReferralData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyReferralsApi()
      .then((res) => setReferralData(res))
      .catch((err) => console.debug("Could not fetch referral details:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!referralData?.referral_code) return;
    navigator.clipboard.writeText(referralData.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (!referralData?.referral_code) return;
    const shareUrl = `${window.location.origin}/register?ref=${referralData.referral_code}`;
    if (navigator.share) {
      navigator.share({
        title: "Join NexServe & Get ₹100 Discount",
        text: `Use my referral code ${referralData.referral_code} when joining NexServe for ₹100 off your first service!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading || !referralData) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl">
      {/* Background glow decoration */}
      <div className="absolute -top-20 -right-20 w-52 h-52 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-md">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
            <FiGift className="w-4 h-4" />
            <span>Referral Rewards Program</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Give ₹100, Get ₹100
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Invite your friends to NexServe. They get ₹100 off their first booking, and you earn
            ₹100 credits the moment their first service is completed!
          </p>
        </div>

        {/* Code & Balances */}
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 backdrop-blur-md shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Your Unique Code</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xl font-extrabold text-indigo-300 tracking-wider bg-slate-800/80 px-3 py-1.5 rounded-xl border border-indigo-500/30">
                {referralData.referral_code}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-md shadow-indigo-600/30"
                title="Copy code"
              >
                {copied ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700"
                title="Share link"
              >
                <FiShare2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-px sm:h-12 w-full sm:w-px bg-slate-800" />

          <div>
            <div className="text-[11px] text-slate-400 font-medium">Wallet Balance</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              ₹{referralData.referral_credits || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {referralData.successful_referrals || 0} friends joined
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
