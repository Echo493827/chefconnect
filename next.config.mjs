/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // class photos, avatars and recap images will live in Supabase Storage
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    serverActions: {
      // The sign-in/sign-up forms submit through Server Actions. Behind the
      // GitHub Codespaces proxy the request's forwarded host differs from what
      // Next expects, so allow those dev origins explicitly. Vercel needs nothing.
      allowedOrigins: ["localhost:3000", "*.app.github.dev"],
    },
  },
};

export default nextConfig;
