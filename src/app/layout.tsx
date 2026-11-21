import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
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
  title: { default: "HelpDesk AI", template: "%s | HelpDesk AI" },
  description:
    "Customer support a small business can set up in five minutes: an AI assistant answers from your own help articles and hands the live chat to your team.",
};

export const viewport: Viewport = {
  themeColor: "#f3f4f1",
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
