import { config } from "dotenv";

// Vitest doesn't auto-load .env.local the way Next.js does.
config({ path: ".env.local" });
