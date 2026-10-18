/**
 * Contact — support channels, validated contact form and FAQ.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, ChevronDown, ArrowUpRight, LifeBuoy } from "lucide-react";
import { submitContactForm } from "../api/contactApi";
import { PageHeader, Field, Input, Textarea, Select, Button, Alert, Reveal, Stagger, StaggerItem, cn } from "../components/ui";
import { getErrorMessage } from "../lib/format";
import { ease } from "../lib/motion";

const contactChannels = [
  { icon: Mail, label: "Email support", value: "support@nexserve.com", href: "mailto:support@nexserve.com", note: "Replies within 2 hours" },
  { icon: Phone, label: "Phone & emergency dispatch", value: "+91 98765 43210", href: "tel:+919876543210", note: "Toll free" },
  { icon: MapPin, label: "Headquarters", value: "Koramangala, Bengaluru", href: null, note: "Karnataka, India" },
  { icon: Clock, label: "Support hours", value: "Every day, 8 AM – 10 PM", href: null, note: "Emergency dispatch 24/7" },
];

const TOPICS = ["A booking I made", "A rental or deposit", "Payments & refunds", "Becoming a partner", "Something else"];

const faqs = [
  {
    q: "How does the security deposit work for rentals?",
    a: "Your deposit is collected at checkout and held securely. Once you return the item and the host completes the inspection, it's refunded to your original payment method.",
  },
  {
    q: "What if a professional doesn't show up or the work isn't right?",
    a: "Every booking is covered by our 30-day re-work guarantee. If something isn't right, we'll send a professional back or arrange a refund.",
  },
  {
    q: "How are professionals verified?",
    a: "Each professional completes identity verification, a background check and a skills assessment before their profile goes live.",
  },
  {
    q: "Can I reschedule or cancel a booking?",
    a: "Yes — open the booking from your dashboard or Service History to track it or cancel it with a reason.",
  },
];

const EMPTY = { name: "", email: "", subject: "", topic: TOPICS[0], message: "" };

function validate(data) {
  const e = {};
  if (data.name.trim().length < 2) e.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) e.email = "Enter a valid email address.";
  if (data.subject.trim().length < 3) e.subject = "Add a short subject.";
  if (data.message.trim().length < 20) e.message = "Tell us a bit more — at least 20 characters.";
  return e;
}

export default function Contact() {
  const [formData, setFormData] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

  const errors = validate(formData);
  const show = (k) => (touched[k] ? errors[k] : undefined);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, subject: true, message: true });
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setError("");
    try {
      await submitContactForm({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: `[${formData.topic}] ${formData.subject.trim()}`,
        message: formData.message.trim(),
      });
      setIsSubmitted(true);
      setFormData(EMPTY);
      setTouched({});
    } catch (err) {
      console.error("Failed to submit contact message:", err);
      setError(getErrorMessage(err, "We couldn't send your message. Please try again or call us."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Contact"
        title="We're here to help"
        subtitle="Questions about a booking, a rental deposit, or joining as a partner? Reach the team directly — real people, fast answers."
      />

      <div className="container-page grid gap-8 lg:grid-cols-[1.35fr_1fr] items-start">
        {/* Form */}
        <Reveal className="surface p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {isSubmitted ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: ease.out }}
                className="py-10 text-center"
                role="status"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.1 }}
                  className="w-16 h-16 mx-auto rounded-full bg-emerald-400/15 text-emerald-300 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
                </motion.div>
                <h2 className="mt-6 text-2xl font-semibold text-white">Message sent</h2>
                <p className="mt-2 text-ink-400 max-w-sm mx-auto">
                  Thanks for reaching out. A support ticket is open and we'll reply to your email shortly.
                </p>
                <Button variant="secondary" className="mt-8" onClick={() => setIsSubmitted(false)}>
                  Send another message
                </Button>
              </motion.div>
            ) : (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} noValidate className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-white">Send us a message</h2>
                  <p className="text-sm text-ink-400 mt-1">We usually reply within two hours during support hours.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full name" required error={show("name")}>
                    <Input name="name" value={formData.name} onChange={handleChange} onBlur={handleBlur} autoComplete="name" placeholder="Your name" />
                  </Field>
                  <Field label="Email" required error={show("email")}>
                    <Input type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} autoComplete="email" placeholder="you@example.com" />
                  </Field>
                </div>
                <div className="grid sm:grid-cols-[200px_1fr] gap-4">
                  <Field label="Topic">
                    <Select name="topic" value={formData.topic} onChange={handleChange}>
                      {TOPICS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Subject" required error={show("subject")}>
                    <Input name="subject" value={formData.subject} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Booking #482 rescheduling" />
                  </Field>
                </div>
                <Field
                  label="Message"
                  required
                  error={show("message")}
                  hint={`${formData.message.trim().length}/20 characters minimum`}
                >
                  <Textarea name="message" rows={6} value={formData.message} onChange={handleChange} onBlur={handleBlur} placeholder="Include booking or rental IDs so we can help faster." />
                </Field>
                {error && <Alert tone="error">{error}</Alert>}
                <Button type="submit" size="lg" fullWidth icon={Send} loading={submitting} loadingText="Sending">
                  Send message
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </Reveal>

        {/* Channels */}
        <div className="space-y-6">
          <Stagger className="grid gap-3">
            {contactChannels.map((c) => {
              const Icon = c.icon;
              const inner = (
                <>
                  <span className="w-10 h-10 rounded-xl bg-primary-500/12 text-primary-300 flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs text-ink-400">{c.label}</span>
                    <span className="block text-sm font-medium text-white truncate">{c.value}</span>
                    <span className="block text-xs text-ink-500">{c.note}</span>
                  </span>
                  {c.href && <ArrowUpRight className="w-4 h-4 text-ink-500 group-hover:text-white transition-colors" aria-hidden="true" />}
                </>
              );
              return (
                <StaggerItem key={c.label}>
                  {c.href ? (
                    <a href={c.href} className="group surface card-interactive p-4 flex items-center gap-4">
                      {inner}
                    </a>
                  ) : (
                    <div className="surface p-4 flex items-center gap-4">{inner}</div>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>

          <Reveal id="faq" className="surface p-5 sm:p-6 scroll-mt-24">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-primary-300" aria-hidden="true" />
              Frequently asked
            </h2>
            <ul className="mt-4 divide-y divide-white/[0.06]">
              {faqs.map((faq, idx) => {
                const open = openFaq === idx;
                return (
                  <li key={faq.q}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : idx)}
                      aria-expanded={open}
                      aria-controls={`faq-${idx}`}
                      className="w-full py-4 flex items-start justify-between gap-4 text-left text-sm font-medium text-ink-100 hover:text-white"
                    >
                      {faq.q}
                      <ChevronDown className={cn("w-4 h-4 mt-0.5 shrink-0 text-ink-400 transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          id={`faq-${idx}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: ease.out }}
                          className="overflow-hidden"
                        >
                          <p className="pb-4 text-sm text-ink-400 leading-relaxed">{faq.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
