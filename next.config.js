/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Session 116: the Android app build (npm run build:app, NEXT_PUBLIC_APP_MODE=1) exports to
  // out-app/ so it can never overwrite the website export in out/.
  ...(process.env.NEXT_PUBLIC_APP_MODE === "1" ? { distDir: "out-app" } : {}),
};

module.exports = nextConfig;
