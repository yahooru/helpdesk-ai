import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HelpDesk AI",
    short_name: "HelpDesk",
    description: SITE_DESCRIPTION,
    start_url: "/app/inbox",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f9",
    theme_color: "#0f1b2d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
