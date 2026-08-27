/**
 * About Page — tells the NexServe story.
 *
 * Explains what NexServe is, the mission, and the team values.
 * Keeps the same dark theme and design language as the rest of the app.
 */

import { Link } from "react-router-dom";

const values = [
  { icon: "🤝", title: "Trust & Safety", description: "Every provider is verified. Every review is real. Your safety is our priority." },
  { icon: "⚡", title: "Speed & Convenience", description: "Book any service in under 60 seconds. No calls, no waiting, no hassle." },
  { icon: "💎", title: "Quality First", description: "We partner only with top-rated professionals who deliver consistent quality." },
  { icon: "🌍", title: "Accessibility", description: "Available in multiple cities with plans to expand nationwide." },
];

const team = [
  { role: "Founder & CEO", description: "Building the future of service booking." },
  { role: "CTO", description: "Engineering seamless digital experiences." },
  { role: "Head of Operations", description: "Ensuring quality at every touchpoint." },
  { role: "Lead Designer", description: "Crafting beautiful, intuitive interfaces." },
];

export default function About() {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 animate-slide-up">
            About{" "}
            <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              NexServe
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg animate-slide-up" style={{ animationDelay: "0.1s" }}>
            We're on a mission to make professional services accessible to everyone,
            one booking at a time.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-24 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              Our Mission
            </div>
            <p className="text-xl sm:text-2xl text-gray-300 leading-relaxed">
              NexServe connects people with trusted, verified service professionals.
              Whether you need a plumber at midnight or a tutor on a Sunday,
              we make it happen — <span className="text-white font-semibold">instantly, reliably, and affordably</span>.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <div
                key={v.title}
                className="group p-6 rounded-2xl bg-surface-800/50 border border-white/5 hover:border-primary-500/20 hover:bg-surface-700/50 transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform duration-300">{v.icon}</span>
                <h3 className="text-lg font-semibold text-white mb-2">{v.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold text-white text-center mb-12">The Team</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <div
                key={member.role}
                className="text-center p-6 rounded-2xl bg-surface-800/50 border border-white/5 animate-slide-up"
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-white/10 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{member.role}</h3>
                <p className="text-sm text-gray-500">{member.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="p-10 rounded-3xl bg-gradient-to-br from-primary-600/20 to-accent-500/10 border border-primary-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-32 bg-primary-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Want to Join Us?</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Whether you're a customer looking for services or a professional
                looking to grow your business — NexServe is for you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
                <Link
                  to="/contact"
                  className="px-8 py-3 text-sm font-semibold text-gray-300 bg-surface-700/50 border border-white/10 rounded-xl hover:bg-surface-600/50 hover:text-white transition-all duration-300"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
