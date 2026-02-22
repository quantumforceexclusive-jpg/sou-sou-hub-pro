"use client";

import { useEffect, useState } from "react";
import {
    Layers,
    Dices,
    CalendarDays,
    IdCard,
    ShieldCheck,
    LineChart,
    Lock,
    SunMoon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
    {
        title: "Smart Batch Management",
        icon: <Layers className="w-5 h-5" />,
        bullets: [
            "Auto batch sequencing (#1, #2, #3...)",
            "Up to 50 members per batch",
            "Auto-close when full",
            "Admin can add/delete batches (even closed)",
        ],
    },
    {
        title: "Verifiable Randomized Payouts",
        icon: <Dices className="w-5 h-5" />,
        bullets: [
            "Randomized payout order on batch close",
            "Locked schedule (no reshuffles)",
            "Public fairness commitment hash",
            "Optional seed reveal for verification",
        ],
    },
    {
        title: "Structured Monthly Cycle Engine",
        icon: <CalendarDays className="w-5 h-5" />,
        bullets: [
            "Current Month of Cycle (Month X of N)",
            "Next payout member shown clearly",
            "Total Monthly Pool calculation",
            "Countdown to next payout date",
        ],
    },
    {
        title: "Member Identity System",
        icon: <IdCard className="w-5 h-5" />,
        bullets: [
            "Member numbering (#01–#50)",
            "Payout month independent of join order",
            "Personal dashboard status",
            "Clear “my payout month” visibility",
        ],
    },
    {
        title: "Admin Control Panel",
        icon: <ShieldCheck className="w-5 h-5" />,
        bullets: [
            "Close batches early",
            "Set monthly contribution amount",
            "Mark payouts as paid",
            "Role-based admin access",
        ],
    },
    {
        title: "Real-Time Dashboard",
        icon: <LineChart className="w-5 h-5" />,
        bullets: [
            "Live member count updates",
            "Payout order list with status",
            "Highlight current month",
            "Instant UI updates (Convex realtime)",
        ],
    },
    {
        title: "Secure Auth & Profiles",
        icon: <Lock className="w-5 h-5" />,
        bullets: [
            "Email + password authentication",
            "Edit profile details",
            "Device-based profile image upload (no URL)",
            "Secure server-side validation",
        ],
    },
    {
        title: "Dark / Light Mode",
        icon: <SunMoon className="w-5 h-5" />,
        bullets: [
            "System theme detection",
            "Smooth theme toggle",
            "Premium fintech UI in both modes",
        ],
    },
];

export function FeaturesSection({ scrollToAuth }: { scrollToAuth: () => void }) {
    const [highlight, setHighlight] = useState(false);

    useEffect(() => {
        const checkHash = () => {
            if (window.location.hash === "#features") {
                setHighlight(true);
                setTimeout(() => setHighlight(false), 800);
            }
        };

        // Check initially
        checkHash();

        window.addEventListener("hashchange", checkHash);
        return () => window.removeEventListener("hashchange", checkHash);
    }, []);

    return (
        <section id="features" className="py-24 px-6 sm:px-10 lg:px-16 xl:px-24 mx-auto w-full bg-background relative z-10 border-t border-border">
            <div className="max-w-[1440px] mx-auto">
                <div className={`transition-all duration-700 ease-in-out p-2 sm:p-4 rounded-3xl ${highlight ? 'ring-2 ring-primary bg-primary/5 scale-[1.01] shadow-xl' : ''}`}>
                    <div className="text-center mb-16">
                        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--primary)" }}>FEATURES</p>
                        <h2 className="text-3xl md:text-5xl font-bold mt-4 mb-6" style={{ fontFamily: "var(--font-playfair), serif", color: "var(--foreground)" }}>
                            Everything you need to run a Sou Sou—properly.
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--muted-foreground)" }}>
                            Smart batches, verifiable fairness, and a monthly cycle engine built for trust.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, idx) => (
                            <Card key={idx} className="border shadow-sm hover:shadow-md transition-shadow duration-300" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-3 text-lg" style={{ color: "var(--foreground)" }}>
                                        <div className="p-2 rounded-lg" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                                            {feature.icon}
                                        </div>
                                        {feature.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2 text-sm mt-2">
                                        {feature.bullets.map((bullet, i) => (
                                            <li key={i} className="flex items-start gap-2" style={{ color: "var(--muted-foreground)" }}>
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--primary)" }} />
                                                <span className="flex-1">{bullet}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <div className="mt-20 text-center">
                    <p className="text-sm font-medium mb-6" style={{ color: "var(--muted-foreground)" }}>
                        Built for Trinidad & Tobago—ready for the Caribbean.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button onClick={scrollToAuth} className="btn-gold px-8 py-3 rounded-xl font-semibold w-full sm:w-auto">
                            Get Started
                        </button>
                        <a href="#how-it-works" className="px-8 py-3 rounded-xl font-semibold border transition-colors hover:bg-muted w-full sm:w-auto" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
                            How It Works
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
