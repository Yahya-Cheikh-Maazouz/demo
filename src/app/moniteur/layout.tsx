import type { Metadata } from "next";
import { InstructorShell } from "@/components/moniteur/instructor-shell";

export const metadata: Metadata = {
  title: { default: "Espace moniteur", template: "%s · Espace moniteur" },
  description: "Votre journée de leçons, l'émargement, le livret et vos indisponibilités, même hors connexion.",
  // Web app manifest of the instructor PWA (CLAUDE.md, "PWA moniteur"), linked from this space only:
  // no other space or host offers to install it. A static file, shared by every school, so the
  // colors are the default brand. Paths with an extension skip src/proxy.ts (public, no session).
  manifest: "/moniteur/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Moniteur", statusBarStyle: "default" },
  icons: { apple: "/moniteur/apple-touch-icon.png" },
};

export default function InstructorLayout({ children }: LayoutProps<"/moniteur">) {
  return <InstructorShell>{children}</InstructorShell>;
}
