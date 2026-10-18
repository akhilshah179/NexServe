import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, ImagePlus, CheckCheck, MessagesSquare, X } from "lucide-react";
import { fetchBookingMessagesApi, sendChatMessageApi } from "../../api/chatApi";
import { useAuth } from "../../context/AuthContext";
import { Modal, Skeleton, Alert, Avatar, cn } from "../ui";
import { formatTime, getErrorMessage } from "../../lib/format";

export default function BookingChatModal({ booking, onClose }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const close = () => {
    setOpen(false);
    setTimeout(onClose, 250);
  };

  const loadMessages = async () => {
    try {
      const data = await fetchBookingMessagesApi(booking.id);
      setMessages(data);
    } catch (e) {
      console.error("Failed to load chat messages", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageUrl.trim()) return;

    setSending(true);
    setError("");
    try {
      const newMsg = await sendChatMessageApi(booking.id, {
        content: content.trim() || "Image attachment",
        image_url: imageUrl.trim() || null,
      });
      setMessages((prev) => [...prev, newMsg]);
      setContent("");
      setImageUrl("");
      setShowImageInput(false);
    } catch (err) {
      setError(getErrorMessage(err, "Message not sent. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const otherPerson = user?.id === booking.customer_id ? booking.provider : booking.customer;
  const otherPersonName = otherPerson?.full_name || (user?.id === booking.customer_id ? "Provider" : "Customer");

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      icon={MessagesSquare}
      title={otherPersonName}
      description={`Booking #${booking.id} · ${booking.service?.name || booking.service?.title || "Service"}`}
      bodyClassName="!px-0 !pb-0 flex flex-col"
      className="sm:h-[640px]"
      footer={
        <form onSubmit={handleSend} className="space-y-2">
          <AnimatePresence initial={false}>
            {showImageInput && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <input
                  type="url"
                  placeholder="Paste an image URL (https://…)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  aria-label="Image URL"
                  className="input h-10 min-h-10 text-[13px]"
                />
              </motion.div>
            )}
          </AnimatePresence>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImageInput((v) => !v)}
              aria-label={showImageInput ? "Remove image link" : "Attach image link"}
              aria-pressed={showImageInput}
              className={cn(
                "w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border transition-colors",
                showImageInput ? "bg-primary-500/15 border-primary-400/40 text-primary-200" : "bg-white/[0.03] border-white/[0.08] text-ink-300 hover:text-white"
              )}
            >
              {showImageInput ? <X className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a message…"
              aria-label="Message"
              className="input flex-1"
            />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.92 }}
              disabled={sending || (!content.trim() && !imageUrl.trim())}
              aria-label="Send message"
              className="w-11 h-11 shrink-0 rounded-xl bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </form>
      }
    >
      <div className="flex-1 min-h-[320px] px-5 sm:px-6 py-4 space-y-3 bg-surface-950/40" aria-live="polite">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="h-10 w-1/2 rounded-2xl ml-auto" />
            <Skeleton className="h-10 w-3/5 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center">
            <Avatar name={otherPersonName} src={otherPerson?.profile_image} size="lg" />
            <p className="mt-3 text-sm font-medium text-white">Start the conversation</p>
            <p className="mt-1 text-[13px] text-ink-400 max-w-xs">Share access details, timing or questions about the job.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === user?.id;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={cn("flex flex-col", isMine ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    isMine ? "bg-primary-600 text-white rounded-br-md" : "bg-surface-800 text-ink-100 rounded-bl-md border border-white/[0.06]"
                  )}
                >
                  {m.image_url && <img src={m.image_url} alt="Shared attachment" className="rounded-lg mb-2 max-h-48 object-cover" />}
                  <p className="break-words">{m.content}</p>
                </div>
                <span className="text-[11px] text-ink-500 mt-1 px-1 flex items-center gap-1">
                  {formatTime(m.created_at)}
                  {isMine && <CheckCheck className={cn("w-3.5 h-3.5", m.is_read ? "text-primary-300" : "text-ink-500")} aria-label={m.is_read ? "Read" : "Sent"} />}
                </span>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </Modal>
  );
}
