import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The package.json "build" script runs scripts/cf-build.mjs (Cloudflare needs the
// Worker built during the build step), so OpenNext must call Next directly.
export default { ...defineCloudflareConfig(), buildCommand: "npx next build" };
