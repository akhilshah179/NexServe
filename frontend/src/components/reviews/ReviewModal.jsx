import { useState } from "react";
import { submitReviewApi } from "../../api/reviewsApi";

export default function ReviewModal({ booking, onClose, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const review = await submitReviewApi({
        booking_id: booking.id,
        rating,
        comment: comment.trim() || null,
      });
      alert("Thank you! Your review has been submitted.");
      if (onSuccess) onSuccess(review);
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-surface-800 border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">Write a Review</h3>
        <p className="text-xs text-gray-400 mb-4">
          Share your experience for Booking #{booking.id} ({booking.service?.title})
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl transition-transform ${star <= rating ? "scale-110 opacity-100" : "opacity-30 hover:opacity-60"}`}
                >
                  ⭐
                </button>
              ))}
              <span className="ml-2 text-sm font-bold text-yellow-400">{rating}.0 / 5.0</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Comment</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe the quality of service, punctuality, and professionalism..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-700 border border-white/10 text-white text-xs outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-xs shadow-md shadow-primary-500/20"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
