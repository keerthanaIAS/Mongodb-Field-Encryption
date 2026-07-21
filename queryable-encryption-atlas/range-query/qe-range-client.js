const path = require("path");
const fs = require("fs");
const { MongoClient } = require("mongodb");

require("dotenv").config({
    path: path.join(__dirname, "..", ".env"),
});

const uri = process.env.MONGODB_URI;

const masterKey = fs.readFileSync(
    path.join(__dirname, "..", "master-key.txt")
);

const kmsProviders = {
    local: {
        key: masterKey,
    },
};

const keyVaultNamespace = "encryption.__keyVault";

const encryptedDatabaseName = "queryable_encryption";

const encryptedCollectionName = "employees";

const cryptSharedLibPath = path.join(
    __dirname,
    "..",
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