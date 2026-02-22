"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Prevent hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <button className="relative w-9 h-9 flex items-center justify-center rounded-full bg-secondary/30 text-muted-foreground border border-border">
                <span className="opacity-0">.</span>
            </button>
        );
    }

    const isDark = resolvedTheme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative w-9 h-9 flex items-center justify-center rounded-full bg-secondary/30 hover:bg-secondary/50 text-foreground transition-all duration-300 border border-border overflow-hidden group focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Toggle theme"
        >
            <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 will-change-transform">
                {isDark ? (
                    <Moon className="w-4 h-4 text-gold absolute opacity-100 rotate-0 transition-all duration-500 scale-100" />
                ) : (
                    <Sun className="w-4 h-4 text-gold-dark absolute opacity-100 rotate-0 transition-all duration-500 scale-100" />
                )}
            </div>
        </button>
    );
}
