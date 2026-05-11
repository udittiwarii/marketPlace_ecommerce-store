module.exports = {
  clearMocks: true,
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.js"],
  testMatch: ["**/tests/**/*.test.js"],
};
