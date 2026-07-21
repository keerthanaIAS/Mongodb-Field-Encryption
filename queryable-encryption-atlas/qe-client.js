require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

const masterKey = fs.readFileSync(
  path.join(__dirname, "master-key.txt")
);

const kmsProviders = {
  local: {
    key: masterKey,
  },
};

const keyVaultNamespace = "encryption.__keyVault";

const encryptedDatabaseName = "queryable_encryption";

const encryptedCollectionName = "users";

const cryptSharedLibPath = path.join(
  __dirname,
  "lib",
  "mongo_crypt_v1.dylib"
);

const autoEncryption = {
  keyVaultNamespace,
  kmsProviders,

  extraOptions: {
    cryptSharedLibPath,
  },
};

function createClient() {
  return new MongoClient(uri, {
    autoEncryption,
  });
}

module.exports = {
  createClient,
  kmsProviders,
  keyVaultNamespace,
  encryptedDatabaseName,
  encryptedCollectionName,
};