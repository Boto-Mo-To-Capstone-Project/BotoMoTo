import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/(.*)",
        headers: [
          // Content Security Policy (CSP)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
              "style-src 'self' 'unsafe-inline';",
              "img-src 'self' data:;",
              "font-src 'self';",
              "connect-src 'self';",
              "frame-src 'none';",
              "object-src 'none';"
            ].join(" ")
          },
          
          // X-Frame-Options
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          
          // X-Content-Type-Options
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          
          // X-XSS-Protection
          {
            key: "X-XSS-Protection",
            value: "1; mode=block"
          },
          
          // Referrer-Policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          
          // Permissions-Policy
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()"
          }
        ],
      },
    ];
  },
  // Other Next.js config options...
};

export default nextConfig;