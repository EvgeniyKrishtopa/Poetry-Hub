// implements FR-8 of add-ci-pipeline: `npm run deps:outdated` (ncu --errorLevel 2) fails CI on any available upgrade.

// Packages held to their current major; only minor/patch releases count as outdated for them.
const HELD_TO_CURRENT_MAJOR = {
  // Types must match the Node runtime in .nvmrc (24), not the newest Node. Bump together with .nvmrc.
  "@types/node": true,
  // TS 7 is blocked by typescript-eslint's peer range (typescript >=4.8.4 <6.1.0) as of 2026-09-29. 6.0.x fits that range,
  // but the user chose to stay on 5 rather than take a partial step (2026-09-29). See docs/deferred.md.
  typescript: true,
  // ESLint 10 is blocked by eslint-plugin-react/-import/-jsx-a11y peer ranges (eslint ≤9) as of 2026-09-29. See docs/deferred.md.
  eslint: true,
};

module.exports = {
  target: (name) => (HELD_TO_CURRENT_MAJOR[name] ? "minor" : "latest"),
};
