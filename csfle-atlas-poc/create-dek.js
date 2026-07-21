// Create the DEK
require("dotenv").config();

const fs = require("fs");
const {
  MongoClient,
  ClientEncryption,
  Binary,
} = require("mongodb");

const uri = process.env.MONGODB_URI;
console.log('uri: ', uri);

const masterKey = fs.readFileSync("master-key.txt");

const kmsProviders = {
  local: {
    key: masterKey,
  },
};

const keyVaultNamespace = "encryption.__keyVault";

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    console.log("Connected to MongoDB Atlas");

    const encryption = new ClientEncryption(client, {
      keyVaultNamespace,
      kmsProviders,
    });

    const keyVault = client
      .db("encryption")
      .collection("__keyVault");

    // Required unique index
    await keyVault.createIndex(
      { keyAltNames: 1 },
      {
        unique: true,
        partialFilterExpression: {
          keyAltNames: { $exists: true },
        },
      }
    );

    const dek = await encryption.createDataKey("local", {
      keyAltNames: ["my-data-key"],
    });

    console.log("\nDEK created successfully!");

    console.log(
      "DEK ID:",
      dek.toString("base64")
    );

    console.log(
      "\nCheck Atlas:"
    );

    console.log(
      "Database: encryption"
    );

    console.log(
      "Collection: __keyVault"
    );

  } finally {
    await client.close();
  }
}

main().catch(console.error);