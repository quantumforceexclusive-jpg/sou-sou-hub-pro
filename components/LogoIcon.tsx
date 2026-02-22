"use client";

export function LogoIcon({ className = "w-12 h-12" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`logo-icon ${className}`}
        >
            {/* Circle background */}
            <circle cx="32" cy="32" r="30" fill="url(#logoGrad)" />

            {/* Shell/palm fan pattern - representing sou-sou community */}
            <g transform="translate(32, 38)">
                {/* Base arc */}
                <path
                    d="M-16 0 C-16 -20, 16 -20, 16 0"
                    stroke="var(--background)"
                    strokeWidth="2"
                    fill="none"
                    opacity="0.9"
                />
                {/* Inner arcs creating shell pattern */}
                <path
                    d="M-12 0 C-12 -15, 12 -15, 12 0"
                    stroke="var(--background)"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.75"
                />
                <path
                    d="M-8 0 C-8 -10, 8 -10, 8 0"
                    stroke="var(--background)"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.6"
                />
                <path
                    d="M-4 0 C-4 -5, 4 -5, 4 0"
                    stroke="var(--background)"
                    strokeWidth="1.5"
                    fill="none"
                    opacity="0.45"
                />
                {/* Radiating lines from center */}
                <line x1="0" y1="2" x2="-14" y2="-14" stroke="var(--background)" strokeWidth="1.2" opacity="0.5" />
                <line x1="0" y1="2" x2="-8" y2="-17" stroke="var(--background)" strokeWidth="1.2" opacity="0.5" />
                <line x1="0" y1="2" x2="0" y2="-19" stroke="var(--background)" strokeWidth="1.2" opacity="0.5" />
                <line x1="0" y1="2" x2="8" y2="-17" stroke="var(--background)" strokeWidth="1.2" opacity="0.5" />
                <line x1="0" y1="2" x2="14" y2="-14" stroke="var(--background)" strokeWidth="1.2" opacity="0.5" />
            </g>

            <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--primary)" />
                </linearGradient>
            </defs>
        </svg>
    );
}
