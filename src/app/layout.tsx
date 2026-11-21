import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { SITE_DESCRIPTION, siteUrl } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
});

const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "HelpDesk AI", template: "%s | HelpDesk AI" },
  description: SITE_DESCRIPTION,
  applicationName: "HelpDesk AI",
  openGraph: {
    type: "website",
    siteName: "HelpDesk AI",
    title: "HelpDesk AI: answers in seconds, a person when it matters",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "HelpDesk AI: answers in seconds, a person when it matters",
    description: SITE_DESCRIPTION,
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#f4f6f9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${code.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
