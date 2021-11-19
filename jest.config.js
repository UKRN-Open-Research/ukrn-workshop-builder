module.exports = {
  preset: '@vue/cli-plugin-unit-jest',
  transformIgnorePatterns: ['/node_modules/'],
  "coverageDirectory": "./coverage/",
  "collectCoverage": true,
  "collectCoverageFrom": ["src/**/*.{js,vue}"]
}
