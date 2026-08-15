import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sou Sou Hub Pro — Modern Platform for Sou-Sou Funds",
  description:
    "Streamline your group savings with secure and professional financial management. Join batches, track members, and manage your sou-sou funds with ease.",
  keywords: ["sou-sou", "savings", "financial management", "group savings", "Caribbean"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <ConvexAuthNextjsServerProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ThemeProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
