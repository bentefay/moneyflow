import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    serverExternalPackages: ["loro-crdt"]
};

export default nextConfig;
