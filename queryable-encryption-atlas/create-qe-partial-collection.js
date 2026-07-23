const {
  createEncryptionClient,
  kmsProviders,
  encryptedDatabaseName,
  prefixCollectionName,
  suffixCollectionName,
  substringCollectionName,
} = require("./qe-client-partial");

const {
  ClientEncryption,
} = require("mongodb");


async function createCollection(
  clientEncryption,
  db,
  collectionName,
  queryType,
  queryOptions = {}
) {
  console.log(
    `\nCreating collection: ${collectionName}`
  );

  console.log(
    `Query type: ${queryType}`
  );

  const encryptedFields = {
    fields: [
      {
        path: "email",

        bsonType: "string",

        queries: {
          queryType,

          ...queryOptions,
        },
      },
    ],
  };

  await clientEncryption.createEncryptedCollection(
    db,
    collectionName,
    {
      provider: "local",
      createCollectionOptions: {
        encryptedFields,
      },
      masterKey: {},
    }
  );
  console.log(
    `Created ${collectionName} successfully`
  );
}


async function main() {
  // ==========================================
  // IMPORTANT:
  // This client has NO autoEncryption
  // ==========================================
  const client =
    createEncryptionClient();

  try {
    await client.connect();
    console.log(
      "Connected to MongoDB Atlas"
    );
    const db = client.db(
      encryptedDatabaseName
    );
    // ==========================================
    // ClientEncryption
    // ==========================================
    const clientEncryption =
      new ClientEncryption(
        client,

        {
          keyVaultNamespace:
            "encryption.__keyVault",

          kmsProviders,
        }
      );
    // ==========================================
    // 1. PREFIX
    // ==========================================
    await createCollection(
      clientEncryption,
      db,
      prefixCollectionName,
      "prefixPreview",
      {
        strMinQueryLength: 1,
        strMaxQueryLength: 20,
        caseSensitive: false,
        diacriticSensitive: false,
      }
    );
    // ==========================================
    // 2. SUFFIX
    // ==========================================
    await createCollection(
      clientEncryption,
      db,
      suffixCollectionName,
      "suffixPreview",
      {
        strMinQueryLength: 1,
        strMaxQueryLength: 20,
        caseSensitive: false,
        diacriticSensitive: false,
      }
    );
    // ==========================================
    // 3. SUBSTRING
    // ==========================================
    await createCollection(
      clientEncryption,
      db,
      substringCollectionName,
      "substringPreview",
      {
        strMaxLength: 100,
        strMinQueryLength: 1,
        strMaxQueryLength: 20,
        caseSensitive: false,
        diacriticSensitive: false,
      }
    );
    console.log(
      "\n================================"
    );
    console.log(
      "All QE partial-search collections created!"
    );
    console.log(
      "================================"
    );
  } catch (error) {
    console.error(
      "\nFailed to create collections:"
    );
    console.error(error);
  } finally {
    await client.close();
  }
}


main();


// While try QE suffix, prefix , substring getting this error from atlas:
//  errorResponse: {
//     ok: 0,
//     errmsg: 'Creating a collection with QE Suffix, Substring or Prefix Indexes is disallowed in this atlas tier',
//     code: 8000,
//     codeName: 'AtlasError'
//   },
//   ok: 0,
//   code: 8000,
//   codeName: 'AtlasError'
// }

// so this altas tier will not support for partial search we need to upgrade the atlas tier
// ----------------------------------------------------------------------------------------