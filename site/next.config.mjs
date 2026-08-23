/** @type {import('next').NextConfig} */
export default {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  outputFileTracingRoot: import.meta.dirname,
};
