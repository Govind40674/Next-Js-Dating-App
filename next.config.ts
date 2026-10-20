/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: false,

  allowedDevOrigins: ["rescuer-jovial-uptight.ngrok-free.dev"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;