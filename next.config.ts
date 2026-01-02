import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Static export for GitHub Pages
  output: 'export',

  // For custom domain on GitHub Pages, we don't need basePath
  // basePath: isProd ? '/Ariadne' : '',
  // assetPrefix: isProd ? '/Ariadne/' : '',

  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
