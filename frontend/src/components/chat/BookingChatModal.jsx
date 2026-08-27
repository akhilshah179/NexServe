import { useState, useEffect, useRef } from "react";
import { fetchBookingMessagesApi, sendChatMessageApi } from "../../api/chatApi";
import { useAuth } from "../../context/AuthContext";

export default function BookingChatModal({ booking, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

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
  }, [booking.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageUrl.trim()) return;

    setSending(true);
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
      alert(err.response?.data?.detail || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const otherPersonName =
    user?.id === booking.customer_id
      ? booking.provider?.full_name || "Provider"
      : booking.customer?.full_name || "Customer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg h-[600px] max-h-[90vh] bg-surface-800 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-surface-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
              💬
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Chat with {otherPersonName}</h3>
              <p className="text-[11px] text-gray-400">Booking #{booking.id} • {booking.service?.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-surface-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface-900/30">
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No messages yet. Send a message to coordinate service delivery.
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                      isMine
                        ? "bg-primary-600 text-white rounded-br-none"
                        : "bg-surface-700 border border-white/10 text-gray-200 rounded-bl-none"
                    }`}
                  >
                    {m.image_url && (
                      <img
                        src={m.image_url}
                        alt="Attachment"
                        className="rounded-lg mb-2 max-h-48 object-cover border border-white/10"
                      />
                    )}
                    <p className="leading-relaxed">{m.content}</p>
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1 px-1">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {isMine && (m.is_read ? " • Read" : " • Sent")}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Attachment Input Box Toggle */}
        {showImageInput && (
          <div className="p-3 bg-surface-800 border-t border-white/5">
            <input
              type="url"
              placeholder="Paste Image URL (https://...)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-surface-700 border border-white/10 text-white text-xs outline-none"
            />
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-surface-900 border-t border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImageInput(!showImageInput)}
            className={`p-2.5 rounded-xl border transition-all ${
              showImageInput ? "bg-primary-500/20 border-primary-500 text-primary-300" : "bg-surface-700 border-white/10 text-gray-400 hover:text-white"
            }`}
            title="Attach Image"
          >
            🖼️
          </button>

          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface-700 border border-white/10 text-white text-xs focus:border-primary-500 outline-none"
          />

          <button
            type="submit"
            disabled={sending || (!content.trim() && !imageUrl.trim())}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-xs disabled:opacity-50 hover:from-primary-500 hover:to-primary-400 transition-all"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
