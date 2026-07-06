import { useState } from "react";
import { MessageCircle, Instagram, Mail, MapPin } from "lucide-react";
import { api, buildWaLink, INSTAGRAM_URL } from "@/lib/api";
import { toast } from "sonner";

export const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/contact", form);
      toast.success("Message received. We'll reply within a day.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      toast.error("Could not send. Try WhatsApp instead.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAF6F0]">
      <div className="container-x py-16 md:py-24">
        <div className="text-center mb-14 fade-up">
          <span className="label-caps text-[#7E1F35]">Say hi</span>
          <h1 className="font-display text-5xl sm:text-6xl mt-2">Talk to us</h1>
          <p className="mt-4 text-[#6B5B55] max-w-lg mx-auto">
            WhatsApp is fastest — we usually reply within an hour during the day.
            You can also drop a message here.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Contact channels */}
          <div className="space-y-4">
            <a
              href={buildWaLink("Hi Rari Ethnic!")}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="contact-whatsapp"
              className="flex items-start gap-4 p-6 bg-[#25D366]/8 border border-[#25D366]/30 rounded-sm hover:bg-[#25D366]/15 transition-colors group"
            >
              <div className="w-11 h-11 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                <MessageCircle size={20} />
              </div>
              <div>
                <div className="font-display text-xl">WhatsApp</div>
                <div className="text-sm text-[#2B211E]/75 mt-0.5">+91 93165 65117</div>
                <div className="text-xs text-[#6B5B55] mt-1">
                  Fastest response. Order updates, sizing help, custom requests.
                </div>
              </div>
            </a>

            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="contact-instagram"
              className="flex items-start gap-4 p-6 bg-[#98285D]/6 border border-[#98285D]/25 rounded-sm hover:bg-[#98285D]/12 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-[#98285D] text-white flex items-center justify-center shrink-0">
                <Instagram size={20} />
              </div>
              <div>
                <div className="font-display text-xl">Instagram</div>
                <div className="text-sm text-[#2B211E]/75 mt-0.5">@rari.ethnic</div>
                <div className="text-xs text-[#6B5B55] mt-1">
                  DM us. New drops go up here first.
                </div>
              </div>
            </a>

            <div className="flex items-start gap-4 p-6 bg-[#F3EDE4] rounded-sm">
              <div className="w-11 h-11 rounded-full bg-[#7E1F35] text-white flex items-center justify-center shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <div className="font-display text-xl">Email</div>
                <div className="text-sm text-[#2B211E]/75 mt-0.5">hello@rariethnic.com</div>
                <div className="text-xs text-[#6B5B55] mt-1">For wholesale, press or long queries.</div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-[#F3EDE4] rounded-sm">
              <div className="w-11 h-11 rounded-full bg-[#185D64] text-white flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <div className="font-display text-xl">Studio</div>
                <div className="text-sm text-[#2B211E]/75 mt-0.5">
                  Ring Road, Surat, Gujarat 395002
                </div>
                <div className="text-xs text-[#6B5B55] mt-1">By appointment only — WhatsApp to book.</div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={submit}
            data-testid="contact-form"
            className="bg-[#FAF6F0] border border-[#2B211E]/10 rounded-sm p-6 md:p-8 space-y-5"
          >
            <h3 className="font-display text-2xl">Drop a note</h3>
            <div>
              <label className="label-caps text-[#2B211E]">Name</label>
              <input
                required
                data-testid="contact-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 border-b border-[#2B211E]/25 bg-transparent py-2 outline-none focus:border-[#7E1F35]"
              />
            </div>
            <div>
              <label className="label-caps text-[#2B211E]">Email</label>
              <input
                required
                type="email"
                data-testid="contact-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1 border-b border-[#2B211E]/25 bg-transparent py-2 outline-none focus:border-[#7E1F35]"
              />
            </div>
            <div>
              <label className="label-caps text-[#2B211E]">Phone (optional)</label>
              <input
                type="tel"
                data-testid="contact-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full mt-1 border-b border-[#2B211E]/25 bg-transparent py-2 outline-none focus:border-[#7E1F35]"
              />
            </div>
            <div>
              <label className="label-caps text-[#2B211E]">Message</label>
              <textarea
                required
                rows={4}
                data-testid="contact-message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full mt-1 border border-[#2B211E]/20 bg-transparent p-3 outline-none focus:border-[#7E1F35] rounded-sm"
              />
            </div>
            <button
              disabled={submitting}
              type="submit"
              data-testid="contact-submit"
              className="w-full bg-[#7E1F35] text-[#FAF6F0] py-3.5 rounded-sm uppercase tracking-widest text-sm hover:bg-[#631728] transition-colors disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
