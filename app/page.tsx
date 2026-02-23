"use client";

import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AuthCard } from "@/components/AuthCard";
import { ContactSection } from "@/components/ContactSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { LogoIcon } from "@/components/LogoIcon";
import { PalmLeaves } from "@/components/PalmLeaves";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const authCardRef = useRef<HTMLDivElement>(null);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    // We only redirect if authenticated and not actively interacting with the form
    // (A hacky but effective way is checking if the auth-submit-btn is currently disabled/loading)
    const btn = document.getElementById("auth-submit-btn") as HTMLButtonElement | null;
    const isActivelySubmitting = btn?.disabled === true;

    if (isAuthenticated && !isLoading && !isActivelySubmitting) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const scrollToAuth = () => {
    authCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Also focus the email input
    setTimeout(() => {
      const emailInput = document.getElementById("email");
      if (emailInput) emailInput.focus();
    }, 600);
  };

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    const section = document.getElementById("features");
    if (section) {
      // Respect reduced motion
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });

      // Update URL hash without causing a jump
      window.history.pushState(null, "", "#features");

      // Dispatch hashchange manually to trigger highlight effect
      window.dispatchEvent(new Event("hashchange"));
    }
  };

  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const section = document.getElementById("how-it-works");
    if (section) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });

      window.history.pushState(null, "", "#how-it-works");
      window.dispatchEvent(new Event("hashchange"));
    }
  };

  const scrollToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    const section = document.getElementById("contact");
    if (section) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });

      window.history.pushState(null, "", "#contact");
      window.dispatchEvent(new Event("hashchange"));
    }
  };

  if (isLoading) {
    return (
      <div className="hero-gradient flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <LogoIcon className="w-10 h-10" />
          <div className="animate-pulse text-white text-lg font-medium">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Theme Toggle in top right */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <main className="hero-gradient min-h-screen relative overflow-hidden">
        {/* Decorative palm leaves */}
        <PalmLeaves />

        {/* Main two-column hero layout */}
        <div className="relative z-10 min-h-screen flex flex-col">
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 sm:px-10 lg:px-16 xl:px-24 py-10 lg:py-0 gap-10 lg:gap-16 xl:gap-24 max-w-[1440px] mx-auto w-full">
            {/* ===== LEFT COLUMN ===== */}
            <div className="flex-1 flex flex-col justify-center max-w-xl lg:max-w-[560px]">
              {/* Logo + Product Name */}
              <div className="flex items-center gap-3 mb-10 fade-in-up">
                <LogoIcon className="w-12 h-12" />
                <span
                  className="text-2xl font-semibold tracking-tight"
                  style={{
                    fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                    color: "var(--foreground)",
                  }}
                >
                  Sou Sou Hub Pro
                </span>
              </div>

              {/* Big Serif Headline */}
              <h1
                className="text-5xl sm:text-6xl lg:text-[4.2rem] xl:text-7xl leading-[1.08] font-bold mb-6 fade-in-up-delay-1"
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', serif",
                  color: "var(--foreground)",
                }}
              >
                A Modern
                <br />
                Platform for your
                <br />
                Sou-Sou Funds
              </h1>

              {/* Description */}
              <p
                className="text-lg sm:text-xl leading-relaxed mb-8 max-w-md fade-in-up-delay-2"
                style={{ color: "var(--foreground)" }}
              >
                Streamline your group savings with secure
                <br className="hidden sm:block" />
                and professional financial management
              </p>

              {/* Get Started Button */}
              <div className="mb-16 fade-in-up-delay-3">
                <button
                  id="get-started-btn"
                  onClick={scrollToAuth}
                  className="btn-gold px-10 py-4 rounded-xl text-lg font-semibold tracking-wide"
                >
                  Get Started
                </button>
              </div>

              {/* Bottom Nav Links */}
              <nav className="flex items-center gap-8 sm:gap-12 fade-in-up-delay-4">
                <a
                  href="#features"
                  onClick={scrollToFeatures}
                  className="text-base font-medium transition-colors hover:opacity-80"
                  style={{ color: "var(--foreground)" }}
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  onClick={scrollToHowItWorks}
                  className="text-base font-medium transition-colors hover:opacity-80"
                  style={{ color: "var(--foreground)" }}
                >
                  How It Works
                </a>
                <a
                  href="#contact"
                  onClick={scrollToContact}
                  className="text-base font-medium transition-colors hover:opacity-80"
                  style={{ color: "var(--foreground)" }}
                >
                  Contact
                </a>
              </nav>
            </div>

            {/* ===== RIGHT COLUMN — Auth Card ===== */}
            <div
              ref={authCardRef}
              className="flex-shrink-0 w-full max-w-md lg:max-w-[420px] flex items-center justify-center"
            >
              <AuthCard
                onSuccess={() => {
                  router.push("/dashboard");
                }}
              />
            </div>
          </div>
        </div>
      </main>

      <FeaturesSection scrollToAuth={scrollToAuth} />
      <HowItWorksSection scrollToAuth={scrollToAuth} scrollToFeatures={scrollToFeatures} />
      <ContactSection />
    </div>
  );
}
