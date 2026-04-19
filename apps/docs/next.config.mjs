/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default {
  output: 'export',
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  reactStrictMode: true,
  webpack(config, { isServer }) {
    // Tailwind v4 emits modern CSS (color-mix, complex selectors) that Next 15's
    // bundled cssnano-simple cannot parse. Next registers the CSS minimizer as a
    // lazy closure inside `optimization.minimizer`. Detect it by the plugin name
    // referenced in the closure source and remove it.
    if (!isServer && config.optimization && Array.isArray(config.optimization.minimizer)) {
      config.optimization.minimizer = config.optimization.minimizer.filter((entry) => {
        if (typeof entry !== 'function') return true;
        try {
          const src = Function.prototype.toString.call(entry);
          return !src.includes('CssMinimizerPlugin');
        } catch {
          return true;
        }
      });
    }
    return config;
  },
};
