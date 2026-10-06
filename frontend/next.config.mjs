/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output enabled for Docker/CI on Linux; disabled on Windows to prevent OneDrive copyfile lock errors
  output: process.platform !== 'win32' || process.env.STANDALONE === 'true' ? 'standalone' : undefined,
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'HealthForecast AI',
  },
};

export default nextConfig;
