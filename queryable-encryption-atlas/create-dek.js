require("dotenv").config();

const fs = require("fs");

const {
  MongoClient,
  ClientEncryption,
} = require("mongodb");

const uri = process.env.MONGODB_URI;

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
      keyAltNames: ["qe-data-key"],
    });

    console.log("\nQE DEK created successfully!");

    console.log(
      "DEK ID:",
      dek.toString("base64")
    );

  } finally {
    await client.close();
  }
}

main().catch(console.error);

// Output:
// Connected to MongoDB Atlas
// QE DEK created successfully!
// DEK ID:
// xxxxxxxxxxxxxxxx

// Now your Atlas Key Vault has:
// encryption
// └── __keyVault
//      ├── CSFLE DEK
//      └── QE DEK

