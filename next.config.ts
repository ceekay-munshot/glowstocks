import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

// Lets `next dev` talk to the same Cloudflare bindings the Worker uses.
initOpenNextCloudflareForDev();

export default nextConfig;
