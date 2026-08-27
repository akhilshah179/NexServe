import { useState } from "react";
import { replyToReviewApi } from "../../api/reviewsApi";

export default function ProviderReplyModal({ review, onClose, onSuccess }) {
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setSubmitting(true);
    try {
      const updatedReview = await replyToReviewApi(review.id, { reply: reply.trim() });
      alert("Reply posted successfully.");
      if (onSuccess) onSuccess(updatedReview);
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to post reply.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-surface-800 border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">Reply to Review</h3>
        <p className="text-xs text-gray-400 mb-4">
          Response will be publicly visible on your provider profile.
        </p>

        <div className="p-3.5 rounded-xl bg-surface-700/50 border border-white/5 mb-4 text-xs">
          <p className="text-yellow-400 font-semibold mb-1">Rating: {review.rating} / 5 ⭐</p>
          <p className="text-gray-300 italic">&quot;{review.comment || "No comment provided."}&quot;</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Your Professional Reply</label>
            <textarea
              required
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Thank the customer or address their feedback..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-700 border border-white/10 text-white text-xs outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reply.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-xs shadow-md shadow-primary-500/20"
            >
              {submitting ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
