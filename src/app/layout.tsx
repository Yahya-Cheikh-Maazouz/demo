import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { Suspense } from "react";
import { TenantTheme } from "@/components/tenant-theme";
import "./globals.css";

// Variable font (weights 200–800). The optical size axis gives large titles their display cut.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
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
  themeColor: "#f3f7f6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${bricolage.variable} h-full antialiased`}>
      <body className="min-h-dvh">
        <Suspense fallback={null}>
          <TenantTheme />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
