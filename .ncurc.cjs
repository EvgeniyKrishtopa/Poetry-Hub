// implements FR-8 of add-ci-pipeline: `npm run deps:outdated` (ncu --errorLevel 2) fails CI on any available upgrade.

// Packages held to their current major; only minor/patch releases count as outdated for them.
const HELD_TO_CURRENT_MAJOR = {
  // Types must match the Node runtime in .nvmrc (24), not the newest Node. Bump together with .nvmrc.
  "@types/node": true,
};

module.exports = {
  target: (name) => (HELD_TO_CURRENT_MAJOR[name] ? "minor" : "latest"),
};
