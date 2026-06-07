import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "puppeteer",
    "puppeteer-extra",
    "puppeteer-extra-plugin-stealth",
    "puppeteer-extra-plugin-recaptcha",
  ],
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/data/**",
          "**/profiles/**",
          "**/history/**",
          "**/sessions/**",
          "**/logs/**",
          "**/settings.json",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
