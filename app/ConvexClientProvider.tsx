"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { Toaster } from "sonner";

const convex = new ConvexReactClient(
    process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    return (
        <ConvexAuthNextjsProvider client={convex}>
            {children}
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: "var(--background)",
                        border: "1px solid #E2DED8",
                        color: "var(--foreground)",
                    },
                }}
            />
        </ConvexAuthNextjsProvider>
    );
}
