import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Standard OpenNext → Cloudflare Workers adapter. `buildCommand` points OpenNext
// at the PLAIN Next build (`npm run build:next`), not `npm run build` — because
// `npm run build` IS the OpenNext build, so without this the Next-build step
// would re-invoke OpenNext and recurse. This lets the Cloudflare build command be
// `npm run build` and still produce the `.open-next/` bundle the deploy needs.
export default { ...defineCloudflareConfig(), buildCommand: "npm run build:next" };
