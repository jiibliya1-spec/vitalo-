import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The package.json "build" script runs scripts/cf-build.mjs (Cloudflare needs the
// Worker built during the build step), so OpenNext must call Next directly.
// Deployed with Cloudflare Workers Builds (build: npm run build, deploy: npx wrangler deploy).
export default { ...defineCloudflareConfig(), buildCommand: "npx next build" };
