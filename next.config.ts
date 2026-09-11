import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep firebase-admin out of the Turbopack bundle (avoids jose ESM require crash on Vercel)
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose", "@google-cloud/firestore"],
};

export default nextConfig;
