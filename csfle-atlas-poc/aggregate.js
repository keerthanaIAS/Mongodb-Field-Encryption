require("dotenv").config();

const path = require("path");
const fs = require("fs");

const {
    MongoClient,
} = require("mongodb");

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

const schemaMap = {
    "csfle_poc.users": {
        bsonType: "object",

        properties: {
            email: {
                encrypt: {
                    keyId: [
                        // IMPORTANT:
                        // This must be your actual DEK ObjectId.
                        // We will load it dynamically below.
                    ],
                    bsonType: "string",
                    algorithm:
                        "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
                },
            },
        },
    },
};

async function main() {
    // Step 1: Connect without encryption
    const keyClient = new MongoClient(uri);

    await keyClient.connect();

    console.log("Connected to MongoDB Atlas");

    // Step 2: Get DEK
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

    // Step 3: Add actual DEK to schemaMap
    schemaMap[
        "csfle_poc.users"
    ].properties.email.encrypt.keyId = [
            dataKey._id,
        ];

    // Step 4: Create CSFLE client
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

    console.log(
        "CSFLE client connected"
    );

    const users = client
        .db("csfle_poc")
        .collection("users");

    // Step 5: Aggregation
    console.log(
        "\nRunning aggregation with $match..."
    );

    const result = await users
        .aggregate([
            {
                $sort: {
                    name: 1,
                },
            },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    email: 1,
                },
            },
        ])
        .toArray();

    console.log("\n$sort + $project result:");
    console.dir(result, { depth: null });

    await client.close();
}

main().catch(console.error);

// MongoDB Atlas
//     │
//     ▼
// CSFLE encrypted collection
//     │
//     ▼
// $match      → Equality search on deterministic encrypted email ✅
//     │
//     ▼
// $sort       → Works on non-encrypted field (name) ✅
//     │
//     ▼
// $project    → Returns selected fields and decrypts email ✅

