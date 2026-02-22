"use client";

/**
 * Decorative palm leaf shapes that appear subtly on the right side
 * of the hero section, matching the reference image.
 */
export function PalmLeaves() {
    return (
        <>
            {/* Background leaf pattern (using CSS classes from globals.css) */}
            <div className="leaf-pattern" />

            {/* SVG Palm leaf strokes */}
            <div className="palm-leaves">
                {/* First palm group - upper right */}
                <svg
                    className="absolute"
                    style={{ right: "6%", top: "18%", opacity: 0.12 }}
                    width="200"
                    height="350"
                    viewBox="0 0 200 350"
                    fill="none"
                >
                    {/* Fan of palm fronds */}
                    <g transform="translate(80, 340)">
                        <path d="M0 0 C-20 -120, -60 -200, -70 -280" stroke="var(--primary)" strokeWidth="2.5" fill="none" />
                        <path d="M0 0 C-10 -130, -30 -220, -30 -300" stroke="var(--primary)" strokeWidth="2.5" fill="none" />
                        <path d="M0 0 C0 -130, 0 -230, 10 -310" stroke="var(--primary)" strokeWidth="2.5" fill="none" />
                        <path d="M0 0 C10 -130, 30 -220, 50 -295" stroke="var(--primary)" strokeWidth="2.5" fill="none" />
                        <path d="M0 0 C20 -120, 60 -200, 90 -270" stroke="var(--primary)" strokeWidth="2.5" fill="none" />
                        <path d="M0 0 C25 -100, 70 -170, 110 -230" stroke="var(--primary)" strokeWidth="2" fill="none" />

                        {/* Small leaf veins branching off */}
                        <path d="M-35 -150 L-55 -170" stroke="var(--primary)" strokeWidth="1.2" fill="none" opacity="0.6" />
                        <path d="M-20 -200 L-45 -225" stroke="var(--primary)" strokeWidth="1.2" fill="none" opacity="0.6" />
                        <path d="M25 -200 L50 -225" stroke="var(--primary)" strokeWidth="1.2" fill="none" opacity="0.6" />
                        <path d="M50 -150 L75 -170" stroke="var(--primary)" strokeWidth="1.2" fill="none" opacity="0.6" />
                    </g>
                </svg>

                {/* Second palm group - lower right, lighter */}
                <svg
                    className="absolute"
                    style={{ right: "0%", top: "45%", opacity: 0.08 }}
                    width="180"
                    height="300"
                    viewBox="0 0 180 300"
                    fill="none"
                >
                    <g transform="translate(60, 290)">
                        <path d="M0 0 C-15 -100, -40 -160, -50 -240" stroke="var(--accent)" strokeWidth="2" fill="none" />
                        <path d="M0 0 C-5 -110, -15 -180, -10 -260" stroke="var(--accent)" strokeWidth="2" fill="none" />
                        <path d="M0 0 C5 -110, 15 -180, 30 -255" stroke="var(--accent)" strokeWidth="2" fill="none" />
                        <path d="M0 0 C15 -100, 45 -160, 70 -230" stroke="var(--accent)" strokeWidth="2" fill="none" />
                        <path d="M0 0 C20 -80, 55 -130, 95 -190" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
                    </g>
                </svg>
            </div>
        </>
    );
}
