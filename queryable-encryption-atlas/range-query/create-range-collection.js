const {
    createClient,
    kmsProviders,
    encryptedDatabaseName,
    encryptedCollectionName,
} = require("./qe-range-client");

const { ClientEncryption } = require("mongodb");

async function main() {
    const client = createClient();

    try {
        await client.connect();

        console.log("Connected to MongoDB Atlas");

        const clientEncryption = new ClientEncryption(
            client,
            {
                keyVaultNamespace: "encryption.__keyVault",
                kmsProviders,
            }
        );

        const encryptedFieldsMap = {
            fields: [
                {
                    path: "email",
                    bsonType: "string",
                    queries: [
                        {
                            queryType: "equality",
                        },
                    ],
                },
                {
                    path: "salary",
                    bsonType: "int",
                    queries: [
                        {
                            queryType: "range",
                            min: 0,
                            max: 1000000,
                        },
                    ],
                },
            ],
        };

        await clientEncryption.createEncryptedCollection(
            client.db(encryptedDatabaseName),
            encryptedCollectionName,
            {
                provider: "local",

                createCollectionOptions: {
                    encryptedFields: encryptedFieldsMap,
                },

                masterKey: {},
            }
        );

        console.log(
            "Queryable Encryption range collection created successfully!"
        );

        console.log(
            `Database: ${encryptedDatabaseName}`
        );

        console.log(
            `Collection: ${encryptedCollectionName}`
        );

    } catch (error) {
        console.error(
            "Failed to create encrypted range collection:"
        );

        console.error(error);

    } finally {
        await client.close();
    }
}

main();