const {
  createClient,
  kmsProviders,
  encryptedDatabaseName,
  encryptedCollectionName,
} = require("./qe-client");

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
      "Queryable Encryption collection created successfully!"
    );

    console.log(
      `Database: ${encryptedDatabaseName}`
    );

    console.log(
      `Collection: ${encryptedCollectionName}`
    );

  } catch (error) {
    console.error(
      "Failed to create encrypted collection:"
    );

    console.error(error);

  } finally {
    await client.close();
  }
}

main();