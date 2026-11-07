import type { Metadata } from "next";
import { InstructorShell } from "@/components/moniteur/instructor-shell";

export const metadata: Metadata = {
  title: { default: "Espace moniteur", template: "%s · Espace moniteur" },
  description: "Votre journée de leçons, l'émargement, le livret et vos indisponibilités, même hors connexion.",
  appleWebApp: { capable: true, title: "Moniteur", statusBarStyle: "default" },
  icons: { apple: "/moniteur/apple-touch-icon.png" },
};

export default function InstructorLayout({ children }: LayoutProps<"/moniteur">) {
  return <InstructorShell>{children}</InstructorShell>;
}
