const {
  clearMemoryDb,
  connectMemoryDb,
  disconnectMemoryDb,
} = require("../../src/db/memoryDb");

jest.setTimeout(60000);

beforeAll(async () => {
  if (process.env.ENABLE_MEMORY_DB === "true") {
    await connectMemoryDb();
  }
});

afterEach(async () => {
  if (process.env.ENABLE_MEMORY_DB === "true") {
    await clearMemoryDb();
  }
});

afterAll(async () => {
  if (process.env.ENABLE_MEMORY_DB === "true") {
    await disconnectMemoryDb();
  }
});
