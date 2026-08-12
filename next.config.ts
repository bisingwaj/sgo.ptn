import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  sassOptions: {
    includePaths: [path.join(__dirname, "node_modules")],
  },
};

export default nextConfig;
