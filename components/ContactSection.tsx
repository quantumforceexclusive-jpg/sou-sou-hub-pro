"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner"; // Assuming sonner is installed or handle your own toast, but standard is sonner in shadcn

export function ContactSection() {
    const [highlight, setHighlight] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitMessage = useMutation(api.contact.submitContactMessage);
    const user = useQuery(api.users.getMe); // Optional to prefill

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "General Question",
        message: "",
    });

    // Pre-fill user data if they are logged in
    useEffect(() => {
        if (user && !formData.name && !formData.email) {
            setFormData(prev => ({
                ...prev,
                name: user.name || "",
                email: user.email || "",
            }));
        }
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const checkHash = () => {
            if (window.location.hash === "#contact") {
                setHighlight(true);
                setTimeout(() => setHighlight(false), 800);
            }
        };

        checkHash();

        window.addEventListener("hashchange", checkHash);
        return () => window.removeEventListener("hashchange", checkHash);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await submitMessage({
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message,
            });

            toast.success("Message sent successfully! We'll be in touch soon.");

            // Clear message but keep name/email
            setFormData(prev => ({
                ...prev,
                subject: "General Question",
                message: "",
            }));
        } catch (error) {
            toast.error("Failed to send message. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="contact" className="py-24 px-6 sm:px-10 lg:px-16 xl:px-24 mx-auto w-full bg-background relative z-10 border-t border-border">
            <div className="max-w-[1440px] mx-auto">
                <div
                    className={`transition-all duration-700 ease-in-out p-2 sm:p-4 rounded-3xl ${highlight ? "ring-2 ring-primary bg-primary/5 scale-[1.01] shadow-xl" : ""
                        }`}
                >
                    {/* Header */}
                    <div className="text-center mb-16 fade-in-up">
                        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
                            CONTACT
                        </p>
                        <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6" style={{ fontFamily: "var(--font-playfair), serif", color: "var(--foreground)" }}>
                            Let&rsquo;s talk.
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--muted-foreground)" }}>
                            Questions, partnerships, or early access? Reach out and we&rsquo;ll respond.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">

                        {/* Left Column: Contact Info Cards */}
                        <div className="space-y-6">
                            <div className="mb-4">
                                <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 bg-muted rounded-full" style={{ color: "var(--foreground)" }}>
                                    Contact: Anslem Brathwaite
                                </span>
                            </div>

                            {/* Email */}
                            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-300" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 rounded-full flex-shrink-0" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>Email</h3>
                                        <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>anslemb7615@outlook.com</p>
                                        <a href="mailto:anslemb7615@outlook.com" className="inline-block px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:opacity-90" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                            Email Us
                                        </a>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Phone / WhatsApp */}
                            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-300" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 rounded-full flex-shrink-0" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                        <Phone className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>Phone / WhatsApp</h3>
                                        <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>+1 (868) 352-1007</p>
                                        <a href="https://wa.me/18683521007" target="_blank" rel="noreferrer" className="inline-block px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:opacity-90" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                            Message on WhatsApp
                                        </a>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Location */}
                                <Card className="border shadow-sm hover:shadow-md transition-shadow duration-300" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                                    <CardContent className="p-6 flex flex-col gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold mb-1" style={{ color: "var(--foreground)" }}>Location</h3>
                                            <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>Trinidad & Tobago</p>
                                            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Serving the Caribbean</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Hours */}
                                <Card className="border shadow-sm hover:shadow-md transition-shadow duration-300" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                                    <CardContent className="p-6 flex flex-col gap-3">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold mb-1" style={{ color: "var(--foreground)" }}>Hours</h3>
                                            <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>Mon–Fri</p>
                                            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>9:00 AM – 6:00 PM (AST)</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Right Column: Contact Form */}
                        <Card className={`border shadow-lg transition-all duration-500 overflow-hidden ${highlight ? 'ring-2 ring-primary border-transparent' : ''}`} style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                            <div className="h-2 w-full" style={{ background: "var(--primary)" }} />
                            <CardContent className="p-8">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Full Name</label>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-ring outline-none"
                                            style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                                            placeholder="Jane Doe"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Email Address</label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-ring outline-none"
                                            style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                                            placeholder="jane@example.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="subject" className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Subject</label>
                                        <select
                                            id="subject"
                                            name="subject"
                                            required
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-ring outline-none appearance-none"
                                            style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                                        >
                                            <option value="General Question">General Question</option>
                                            <option value="Partnerships">Partnerships</option>
                                            <option value="Support">Support</option>
                                            <option value="Early Access">Early Access</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="message" className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Message</label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            required
                                            rows={4}
                                            value={formData.message}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-ring outline-none resize-none"
                                            style={{ background: "var(--background)", borderColor: "var(--border)", color: "var(--foreground)" }}
                                            placeholder="How can we help you today?"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                                        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                                    >
                                        {isSubmitting ? (
                                            <span className="animate-pulse">Sending...</span>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Send Message
                                            </>
                                        )}
                                    </button>
                                </form>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </section>
    );
}
