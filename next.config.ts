import type { NextConfig } from "next";

/**
 * Security headers for every response. Kept deliberately narrow so they can't break the
 * YouTube player, which is the whole game:
 * - The CSP only limits who may frame the site and a few injection sinks. It has no
 *   `script-src`/`frame-src`, since a script policy would need nonces (which conflict with
 *   static pages) or `'unsafe-inline'`, and the IFrame API pulls scripts from YouTube.
 * - The Referrer-Policy must keep sending the origin: YouTube refuses to play embeds
 *   that arrive without a Referer (so never `no-referrer`).
 * - The Permissions-Policy turns off only features the game never uses. Leave `autoplay`
 *   and `encrypted-media` alone, because the embedded player relies on them.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  // For old browsers that ignore `frame-ancestors`.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
