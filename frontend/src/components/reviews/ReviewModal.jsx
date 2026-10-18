import { useState } from "react";
import { Star } from "lucide-react";
import { submitReviewApi } from "../../api/reviewsApi";
import { Modal, Button, Field, Textarea, StarInput, Alert, useToast } from "../ui";
import { getErrorMessage } from "../../lib/format";

export default function ReviewModal({ booking, onClose, onSuccess }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setOpen(false);
    setTimeout(onClose, 250);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const review = await submitReviewApi({
        booking_id: booking.id,
        rating,
        comment: comment.trim() || null,
      });
      toast.success("Thanks for your review", "It helps other customers choose with confidence.");
      onSuccess?.(review);
      close();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to submit review."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      icon={Star}
      iconTone="text-amber-300 bg-amber-500/12"
      eyebrow={`Booking #${booking.id}`}
      title="How did it go?"
      description={booking.service?.name || booking.service?.title}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="review-form" loading={submitting} loadingText="Submitting">
            Submit review
          </Button>
        </div>
      }
    >
      <form id="review-form" onSubmit={handleSubmit} className="space-y-5">
        <StarInput value={rating} onChange={setRating} label="Your rating" />
        <Field label="Tell us more" hint="Optional — punctuality, quality, professionalism.">
          <Textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What stood out about your professional?"
          />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
      </form>
    </Modal>
  );
}
