import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic dynamic rendering: every console page reads the session cookie per request.
  cacheComponents: false,
  // The dev indicator would cover the 88px widget iframe launcher.
  devIndicators: false,
  serverExternalPackages: ["unpdf"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // The widget iframe must be embeddable on any customer website.
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/widget.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300" },
        ],
      },
      {
        // Console and auth pages must not be framed by other sites.
        source: "/((?!embed|widget\.js).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
