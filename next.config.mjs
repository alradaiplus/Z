/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow building the static export for the future Tauri desktop wrapper without
  // breaking the server features used by the web app.
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
