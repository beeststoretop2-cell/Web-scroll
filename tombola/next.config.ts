import type { NextConfig } from "next";

// Static export: the whole site is HTML + JS + CSS, no server needed.
// BASE_PATH lets it live under a sub-folder (e.g. GitHub Pages: /Web-scroll/tombola).
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
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
