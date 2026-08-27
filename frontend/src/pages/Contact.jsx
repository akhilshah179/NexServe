/**
 * Contact Page — let users reach out to NexServe.
 *
 * Includes a contact form and contact information cards.
 * The form is client-side only for now — will be connected
 * to the backend API in a later phase.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { submitContactForm } from "../api/contactApi";

const contactInfo = [
  { icon: "📧", label: "Email", value: "support@nexserve.com", href: "mailto:support@nexserve.com" },
  { icon: "📞", label: "Phone", value: "+91 98765 43210", href: "tel:+919876543210" },
  { icon: "📍", label: "Address", value: "Bengaluru, Karnataka, India", href: null },
  { icon: "🕐", label: "Hours", value: "Mon–Sat, 9 AM – 8 PM", href: null },
];

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await submitContactForm(formData);
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 5000);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error("Failed to submit contact message:", err);
      setError("Failed to send message. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 animate-slide-up">
            Get in{" "}
            <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              Touch
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Have a question or need help? We'd love to hear from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Contact Form */}
          <div className="lg:col-span-3 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-surface-800/50 border border-white/5">
              <h2 className="text-xl font-semibold text-white mb-6">Send us a message</h2>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="contact-name" className="block text-sm text-gray-400 mb-1.5">Name</label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-surface-700 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-all duration-300"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm text-gray-400 mb-1.5">Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-surface-700 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="contact-subject" className="block text-sm text-gray-400 mb-1.5">Subject</label>
                <input
                  id="contact-subject"
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="What's this about?"
                  className="w-full px-4 py-3 rounded-xl bg-surface-700 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-all duration-300"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="contact-message" className="block text-sm text-gray-400 mb-1.5">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Tell us more..."
                  className="w-full px-4 py-3 rounded-xl bg-surface-700 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/25 transition-all duration-300 resize-none"
                />
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-4 p-4 rounded-xl bg-error-500/10 border border-error-500/20 text-error-400 text-sm flex items-center gap-2">
                  <span>⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Message"}
              </button>

              {/* Success toast */}
              {isSubmitted && (
                <div className="mt-4 p-4 rounded-xl bg-success-500/10 border border-success-500/20 text-success-500 text-sm font-medium text-center animate-fade-in">
                  ✅ Message received successfully! Our team will get back to you soon.
                </div>
              )}
            </form>
          </div>

          {/* Contact Info Cards */}
          <div className="lg:col-span-2 flex flex-col gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            {contactInfo.map((info) => (
              <div
                key={info.label}
                className="p-5 rounded-2xl bg-surface-800/50 border border-white/5 hover:border-primary-500/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="text-sm text-gray-500 mb-0.5">{info.label}</p>
                    {info.href ? (
                      <a href={info.href} className="text-white hover:text-primary-400 transition-colors font-medium">
                        {info.value}
                      </a>
                    ) : (
                      <p className="text-white font-medium">{info.value}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* FAQ Link */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-600/10 to-accent-500/5 border border-primary-500/15">
              <h3 className="text-white font-semibold mb-2">Have questions?</h3>
              <p className="text-sm text-gray-400 mb-3">Check our frequently asked questions for quick answers.</p>
              <Link
                to="/about"
                className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
              >
                Learn more about us →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
