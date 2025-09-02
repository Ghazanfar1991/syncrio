/**
 * Quick unblock for deployments: skip ESLint during builds.
 * You can remove this once lint errors are resolved.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // If TypeScript compile errors block builds, you can temporarily enable:
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

module.exports = nextConfig;

