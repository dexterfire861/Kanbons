import os from "node:os";
import type { NextConfig } from "next";

function localOrigins(): string[] {
  const hosts = new Set(["localhost", "127.0.0.1"]);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) hosts.add(addr.address);
    }
  }
  return [...hosts];
}

const origins = localOrigins();

const nextConfig: NextConfig = {
  allowedDevOrigins: origins,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
      allowedOrigins: origins,
    },
  },
};

export default nextConfig;
