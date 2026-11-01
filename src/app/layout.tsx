import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import { TenantTheme } from "@/components/tenant-theme";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Espace auto-école", template: "%s · Espace auto-école" },
  description: "Réservez vos leçons, suivez votre solde d'heures et gérez votre dossier.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f7f9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-dvh">
        <Suspense fallback={null}>
          <TenantTheme />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
