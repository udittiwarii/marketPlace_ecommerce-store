const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const resolveCachedMongoBinary = () => {
  const userProfile = process.env.USERPROFILE;

  if (!userProfile) {
    return undefined;
  }

  const binaryPath = path.join(
    userProfile,
    ".cache",
    "mongodb-binaries",
    "mongod-x64-win32-5.0.19.exe",
  );

  return fs.existsSync(binaryPath) ? binaryPath : undefined;
};

const connectMemoryDb = async () => {
  if (!mongoServer) {
    const systemBinary = resolveCachedMongoBinary();

    if (systemBinary) {
      process.env.MONGOMS_SYSTEM_BINARY_VERSION_CHECK = "false";
    }

    mongoServer = await MongoMemoryServer.create({
      binary: systemBinary
        ? {
            systemBinary,
            version: "5.0.19",
          }
        : undefined,
    });
  }

  const uri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
};

const clearMemoryDb = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  const { collections } = mongoose.connection;

  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
};

const disconnectMemoryDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

module.exports = {
  clearMemoryDb,
  connectMemoryDb,
  disconnectMemoryDb,
};
