import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { replyToReviewApi } from "../../api/reviewsApi";
import { Modal, Button, Field, Textarea, Rating, Alert, useToast } from "../ui";
import { getErrorMessage } from "../../lib/format";

export default function ProviderReplyModal({ review, onClose, onSuccess }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setOpen(false);
    setTimeout(onClose, 250);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const updatedReview = await replyToReviewApi(review.id, { reply: reply.trim() });
      toast.success("Reply posted", "It's now visible on your public profile.");
      onSuccess?.(updatedReview);
      close();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to post reply."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      icon={MessageSquare}
      title="Reply to review"
      description="Your reply is shown publicly under this review."
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="reply-form" loading={submitting} loadingText="Posting" disabled={!reply.trim()}>
            Post reply
          </Button>
        </div>
      }
    >
      <form id="reply-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="surface-inset p-4">
          <Rating value={review.rating} />
          <p className="mt-2 text-sm text-ink-200 italic">“{review.comment || "No comment provided."}”</p>
        </div>
        <Field label="Your reply" required>
          <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thank the customer or respond to their feedback…" />
        </Field>
        {error && <Alert tone="error">{error}</Alert>}
      </form>
    </Modal>
  );
}
