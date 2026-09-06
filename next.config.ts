import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next.js Server Actions default to a 1MB request body, which silently rejects
      // any real-world avatar photo or knowledge-source document upload (both go
      // through Server Actions, not a route handler) well below either upload's own
      // MAX_AVATAR_BYTES/MAX_FILE_BYTES check. 25mb covers the largest upload
      // (knowledge files, capped at 20MB) with headroom for multipart overhead.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
