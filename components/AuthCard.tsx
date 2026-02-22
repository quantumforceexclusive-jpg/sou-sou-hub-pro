"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AuthCardProps {
    onSuccess?: () => void;
}

export function AuthCard({ onSuccess }: AuthCardProps) {
    const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuthActions();
    const createOrGetUser = useMutation(api.users.createOrGetUser);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === "signUp") {
                if (!name.trim()) {
                    toast.error("Please enter your name.");
                    setLoading(false);
                    return;
                }
                // Sign up with password provider
                await signIn("password", {
                    email,
                    password,
                    flow: "signUp",
                });
            } else {
                // Sign in
                await signIn("password", {
                    email,
                    password,
                    flow: "signIn",
                });
            }

            // The Convex WebSocket sometimes takes a moment to sync the auth state after signIn resolves.
            // createOrGetUser returns null when auth isn't ready yet, so we retry silently.
            let profileCreated = false;

            for (let i = 0; i < 8; i++) {
                const result = await createOrGetUser({
                    name: mode === "signUp" ? name.trim() : email.split("@")[0],
                    email
                });
                if (result !== null) {
                    profileCreated = true;
                    break;
                }
                // Auth token hasn't synced yet — wait and retry
                await new Promise(res => setTimeout(res, 500));
            }

            if (!profileCreated) {
                console.warn("Profile creation deferred — will auto-create on next sign-in.");
            }

            toast.success(mode === "signUp" ? "Account created successfully!" : "Welcome back!");

            if (onSuccess) {
                onSuccess();
            } else {
                router.push("/dashboard");
            }
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "Authentication failed";

            if (message.includes("InvalidAccountId") || message.includes("Could not verify")) {
                toast.error("Invalid email or password. Please try again.");
            } else if (message.includes("AccountAlreadyExists") || message.includes("already exists")) {
                toast.error("An account with this email already exists. Please sign in.");
            } else {
                toast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-card p-8 md:p-10 w-full max-w-md fade-in-up-delay-2">
            {/* Card Header */}
            <div className="text-center mb-8">
                <h2
                    className="text-3xl font-bold text-navy mb-2"
                    style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", color: "var(--foreground)" }}
                >
                    Sou Sou Hub
                </h2>
                <h3
                    className="text-xl font-semibold"
                    style={{ color: "var(--foreground)" }}
                >
                    {mode === "signIn" ? "Sign In" : "Create Account"}
                </h3>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-5" id="auth-form">
                {mode === "signUp" && (
                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium mb-1.5"
                            style={{ color: "var(--foreground)" }}
                        >
                            Full name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="auth-input w-full"
                            placeholder="Enter your full name"
                            required
                            disabled={loading}
                        />
                    </div>
                )}

                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium mb-1.5"
                        style={{ color: "var(--foreground)" }}
                    >
                        Email address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="auth-input w-full"
                        placeholder="you@example.com"
                        required
                        disabled={loading}
                    />
                </div>

                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium mb-1.5"
                        style={{ color: "var(--foreground)" }}
                    >
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input w-full"
                        placeholder="••••••••"
                        required
                        minLength={6}
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    id="auth-submit-btn"
                    className="btn-gold w-full py-3 rounded-lg text-base font-semibold tracking-wide"
                    disabled={loading}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg
                                className="animate-spin h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            {mode === "signIn" ? "Signing In..." : "Creating Account..."}
                        </span>
                    ) : mode === "signIn" ? (
                        "Sign In"
                    ) : (
                        "Create Account"
                    )}
                </button>
            </form>

            {/* Toggle Mode */}
            <div className="text-center mt-6">
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    {mode === "signIn"
                        ? "Don't have an account?"
                        : "Already have an account?"}{" "}
                    <button
                        type="button"
                        id="auth-toggle-mode"
                        onClick={() => {
                            setMode(mode === "signIn" ? "signUp" : "signIn");
                            setName("");
                        }}
                        className="font-semibold hover:underline transition-colors"
                        style={{ color: "var(--primary)" }}
                    >
                        {mode === "signIn" ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}
