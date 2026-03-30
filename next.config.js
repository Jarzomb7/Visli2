/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Stripe webhook body parsing is not interfered with
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};
module.exports = nextConfig;
