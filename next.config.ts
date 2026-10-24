import type { NextConfig } from "next";
const config: NextConfig = {
  distDir:
    process.env.AFTERBELL_LOCAL_DATA === "browser-tests"
      ? ".next-test"
      : ".next",
  devIndicators: false,
  poweredByHeader: false,
  outputFileTracingExcludes: {
    "/*": [
      "./.local/**/*",
      "./test-results/**/*",
      "./.env.local",
      "./.env.*.local",
    ],
  },
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.local/**",
          "**/.next/**",
          "**/.next-test/**",
        ],
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};
export default config;
