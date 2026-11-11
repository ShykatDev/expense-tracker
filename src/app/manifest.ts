import type { MetadataRoute } from "next"

/** The navy at the top of the hero, so the status bar blends into it. */
const THEME_COLOR = "#0d2a6b"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pulse",
    short_name: "Pulse",
    description: "Track your income and spending at a glance.",
    start_url: "/",
    scope: "/",
    // Full screen where the platform allows it (Android hides the system
    // bars); otherwise standalone. iOS ignores this and uses the
    // black-translucent status bar plus viewport-fit=cover instead.
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation: "portrait",
    // The splash screen: the darkest navy of the icon, so launch feels seamless.
    background_color: "#040915",
    theme_color: THEME_COLOR,
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
