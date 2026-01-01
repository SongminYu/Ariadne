import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Static export for GitHub Pages
  output: 'export',

  // For GitHub Pages: /repo-name/ path
  // Change 'Ariadne' to your actual repo name if different
  basePath: isProd ? '/Ariadne' : '',
  assetPrefix: isProd ? '/Ariadne/' : '',

  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
