// Generates dist/sw.js after `expo export -p web`. Run via `npm run build:web`.
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,css,html,ttf,ico,png,json}'],
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
  swDest: 'dist/sw.js',
  // SPA: every navigation (e.g. /scanner/12) is served the app shell, even offline.
  navigateFallback: '/index.html',
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
};
