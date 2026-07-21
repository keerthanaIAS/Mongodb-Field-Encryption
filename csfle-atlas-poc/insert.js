require("dotenv").config();
const path = require("path");
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
    // Temporary client to find the DEK
    const keyClient = new MongoClient(uri);

    await keyClient.connect();

    const keyVault = keyClient
        .db("encryption")
        .collection("__keyVault");

    const dataKey = await keyVault.findOne({
        keyAltNames: "my-data-key",
    });

    if (!dataKey) {
        throw new Error("DEK not found");
    }

    console.log(
        "Found DEK:",
        dataKey._id.toString("base64")
    );

    await keyClient.close();

    // Automatic encryption schema
    const schemaMap = {
        "csfle_poc.users": {
            bsonType: "object",

            properties: {
                email: {
                    encrypt: {
                        keyId: [dataKey._id],
                        bsonType: "string",
                        algorithm:
                            "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
                    },
                },
            },
        },
    };

    // Client with automatic encryption
    const client = new MongoClient(uri, {
        autoEncryption: {
            keyVaultNamespace,
            kmsProviders,
            schemaMap,
            extraOptions: {
                cryptSharedLibPath: path.join(
                    __dirname,
                    "lib",
                    "mongo_crypt_v1.dylib"
                ),
            },
        },
    });

    await client.connect();

    const users = client
        .db("csfle_poc")
        .collection("users");

    await users.insertOne({
        name: "Keerthana",
        email: "keerthana@example.com",
    });

    console.log("User inserted successfully");

    const result = await users.findOne({
        email: "keerthana@example.com",
    });

    console.log("\nDecrypted result returned to application:");

    console.log(result);

    await client.close();
}

main().catch(console.error);

// Now the architecture is:
// -----------------------
// Node.js Driver
//       │
//       ▼
// crypt_shared
// mongo_crypt_v1.dylib
//       │
//       ▼
// Automatic CSFLE
//       │
//       ▼
// MongoDB Atlas