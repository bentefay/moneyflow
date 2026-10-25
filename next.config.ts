import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    serverExternalPackages: ["loro-crdt"],
    experimental: {
        // Next 16.4's agent-upgrade check aborts the first `next dev` start to print an upgrade
        // nudge and then shows an "Insight" badge over the sidebar's Lock button, which breaks the
        // E2E lock flow. Upgrading next is the remediation; this only silences the dev-only check.
        agentUpgrade: false
    }
};

export default nextConfig;
