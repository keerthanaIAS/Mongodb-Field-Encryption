require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  MongoClient,
} = require("mongodb");

const uri = process.env.MONGODB_URI;
// ==========================================
// MASTER KEY
// ==========================================
const masterKey = fs.readFileSync(
  path.join(
    __dirname,
    "master-key.txt"
  )
);
// ==========================================
// KMS
// ==========================================
const kmsProviders = {
  local: {
    key: masterKey,
  },
};
// ==========================================
// KEY VAULT
// ==========================================
const keyVaultNamespace = "encryption.__keyVault";
// ==========================================
// DATABASE
// ==========================================

const encryptedDatabaseName = "queryable_encryption";
// ==========================================
// COLLECTION NAMES
// ==========================================
const prefixCollectionName = "users_prefix";
const suffixCollectionName = "users_suffix";
const substringCollectionName = "users_substring";
// ==========================================
// crypt_shared
// ==========================================
const cryptSharedLibPath =
  path.join(
    __dirname,
    "lib",
    "mongo_crypt_v1.dylib"
  );
// ==========================================
// AUTO ENCRYPTION
// Used when querying QE collections
// ==========================================
const autoEncryption = {
  keyVaultNamespace,
  kmsProviders,
  extraOptions: {
    cryptSharedLibPath,
  },
};
// ==========================================
// CLIENT 1
// Used for normal QE queries
// Has autoEncryption
// ==========================================

function createClient() {
  return new MongoClient(
    uri,
    {
      autoEncryption,
    }
  );
}
// ==========================================
// CLIENT 2
// Used ONLY for creating QE collections
// NO autoEncryption
// ==========================================
function createEncryptionClient() {
  return new MongoClient(uri);
}

module.exports = {
  createClient,
  createEncryptionClient,
  kmsProviders,
  keyVaultNamespace,
  encryptedDatabaseName,
  prefixCollectionName,
  suffixCollectionName,
  substringCollectionName,
};

// Your POC should document this:
// ------------------------------
// Queryable Encryption
// │
// ├── Equality search
// │      └── ✅ Working on current Atlas tier
// │
// ├── Regex search
// │      └── ❌ Not supported on encrypted field
// │
// ├── Prefix search
// │      └── ⚠️ Preview feature
// │          └── ❌ Blocked by current Atlas tier
// │
// ├── Suffix search
// │      └── ⚠️ Preview feature
// │          └── ❌ Blocked by current Atlas tier
// │
// └── Substring search
//        └── ⚠️ Preview feature
//            └── ❌ Blocked by current Atlas tier