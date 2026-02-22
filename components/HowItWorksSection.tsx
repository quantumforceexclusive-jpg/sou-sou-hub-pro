"use client";

import { useEffect, useState } from "react";
import { Eye, ShieldCheck, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function HowItWorksSection({
    scrollToAuth,
    scrollToFeatures,
}: {
    scrollToAuth: () => void;
    scrollToFeatures: (e: React.MouseEvent) => void;
}) {
    const [highlight, setHighlight] = useState(false);

    useEffect(() => {
        const checkHash = () => {
            if (window.location.hash === "#how-it-works") {
                setHighlight(true);
                setTimeout(() => setHighlight(false), 800);
            }
        };

        checkHash();

        window.addEventListener("hashchange", checkHash);
        return () => window.removeEventListener("hashchange", checkHash);
    }, []);

    const steps = [
        {
            num: "01",
            title: "Join a Batch",
            desc: "Users sign up and join the current open batch (up to 50 members). Members receive a join-order identity number: Name #01, Name #02, etc.",
            mini: "Sign up & secure spot",
        },
        {
            num: "02",
            title: "Batch Closes & Payouts Lock",
            desc: "When the batch is full or closed by an admin, the payout sequence is permanently randomized and locked in place fairly.",
            mini: "Schedule locked & randomized",
        },
        {
            num: "03",
            title: "Verify Fairness",
            desc: "The system stores a public commitment hash proving the schedule was locked at close. Verification protects against reshuffling.",
            mini: "Immutable system ledger",
        },
        {
            num: "04",
            title: "Track Monthly Payouts",
            desc: "The dashboard displays the current month, overall cycle progress, next payout member, total monthly pool, and live payout status.",
            mini: "Real-time transparent progress",
        },
    ];

    const benefits = [
        {
            title: "Clarity",
            icon: <Eye className="w-5 h-5" />,
            desc: "Everyone knows their member number and payout month.",
        },
        {
            title: "Trust",
            icon: <ShieldCheck className="w-5 h-5" />,
            desc: "Locked randomized payouts + verification tools.",
        },
        {
            title: "Control",
            icon: <Settings className="w-5 h-5" />,
            desc: "Admin tools for contribution amount, payouts, and batch management.",
        },
    ];

    return (
        <section id="how-it-works" className="py-24 px-6 sm:px-10 lg:px-16 xl:px-24 mx-auto w-full bg-background relative z-10 border-t border-border">
            <div className="max-w-[1440px] mx-auto">
                <div
                    className={`transition-all duration-700 ease-in-out p-2 sm:p-4 rounded-3xl ${highlight ? "ring-2 ring-primary bg-primary/5 scale-[1.01] shadow-xl" : ""
                        }`}
                >
                    {/* Header */}
                    <div className="text-center mb-16 fade-in-up">
                        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
                            HOW IT WORKS
                        </p>
                        <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6" style={{ fontFamily: "var(--font-playfair), serif", color: "var(--foreground)" }}>
                            Tradition meets technology—step by step.
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--muted-foreground)" }}>
                            Join a batch, lock a fair payout schedule, then track every month with full transparency.
                        </p>
                    </div>

                    {/* Stepper / Timeline */}
                    <div className="relative mb-20 md:mb-28">
                        {/* Desktop Horizontal Line */}
                        <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-[2px]" style={{ background: "var(--border)" }} />

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4 relative z-10">
                            {steps.map((step, idx) => (
                                <div key={idx} className="flex flex-col items-center text-center relative max-md:py-4">
                                    {/* Mobile Vertical Line */}
                                    {idx !== steps.length - 1 && (
                                        <div className="md:hidden absolute top-14 bottom-[-2rem] left-1/2 w-[2px] -translate-x-1/2" style={{ background: "var(--border)" }} />
                                    )}

                                    <div
                                        className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg mb-6 shadow-md relative z-10"
                                        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                                    >
                                        {step.num}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
                                        {step.title}
                                    </h3>
                                    <p className="text-sm px-2 mb-4" style={{ color: "var(--muted-foreground)" }}>
                                        {step.desc}
                                    </p>
                                    <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 bg-muted rounded-full" style={{ color: "var(--foreground)" }}>
                                        {step.mini}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mini Grid (What You Get) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        {benefits.map((benefit, idx) => (
                            <Card key={idx} className="border shadow-sm hover:shadow-md transition-all duration-300 bg-card">
                                <CardHeader className="pb-2 flex flex-row items-center gap-4">
                                    <div className="p-2.5 rounded-xl" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                        {benefit.icon}
                                    </div>
                                    <CardTitle className="text-xl m-0 leading-none" style={{ color: "var(--foreground)" }}>{benefit.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                        {benefit.desc}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                </div>

                {/* Footer CTA */}
                <div className="mt-12 text-center pt-8 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button onClick={scrollToAuth} className="btn-gold px-10 py-3.5 rounded-xl font-semibold w-full sm:w-auto text-base">
                            Get Started
                        </button>
                        <a
                            href="#features"
                            onClick={scrollToFeatures}
                            className="px-10 py-3.5 rounded-xl font-semibold border transition-colors hover:bg-muted w-full sm:w-auto text-base"
                            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                        >
                            View Features
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
