import type { MetadataRoute } from "next";

/**
 * Web app manifest of the instructor PWA (CLAUDE.md, "PWA moniteur"): installable from the browser,
 * it opens on the instructor's day. Shared by every school, so the colors are the default brand.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/moniteur",
    name: "Espace moniteur",
    short_name: "Moniteur",
    description: "Votre journée de leçons, l'émargement, le livret et vos indisponibilités, même hors connexion.",
    lang: "fr-FR",
    start_url: "/moniteur",
    scope: "/moniteur",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f7f6",
    theme_color: "#0f766e",
    categories: ["education", "productivity"],
    icons: [
      { src: "/moniteur/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/moniteur/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/moniteur/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/moniteur/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
