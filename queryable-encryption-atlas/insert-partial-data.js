const {
  createClient,
  encryptedDatabaseName,
  prefixCollectionName,
  suffixCollectionName,
  substringCollectionName,
} = require("./qe-client-partial");

async function main() {
  const client = createClient();

  try {
    await client.connect();

    console.log(
      "Connected to MongoDB Atlas"
    );

    const db = client.db(
      encryptedDatabaseName
    );

    // ============================================
    // PREFIX COLLECTION
    // ============================================

    const prefixCollection = db.collection(
      prefixCollectionName
    );

    await prefixCollection.insertMany([
      {
        name: "Keerthana",
        email: "keerthana@example.com",
      },
      {
        name: "Karthik",
        email: "karthik@example.com",
      },
      {
        name: "Keerthi",
        email: "keerthi@gmail.com",
      },
    ]);

    console.log(
      "Prefix test data inserted"
    );


    // ============================================
    // SUFFIX COLLECTION
    // ============================================

    const suffixCollection = db.collection(
      suffixCollectionName
    );

    await suffixCollection.insertMany([
      {
        name: "Keerthana",
        email: "keerthana@example.com",
      },
      {
        name: "Karthik",
        email: "karthik@example.com",
      },
      {
        name: "John",
        email: "john@gmail.com",
      },
    ]);

    console.log(
      "Suffix test data inserted"
    );


    // ============================================
    // SUBSTRING COLLECTION
    // ============================================

    const substringCollection =
      db.collection(
        substringCollectionName
      );

    await substringCollection.insertMany([
      {
        name: "Keerthana",
        email: "keerthana@example.com",
      },
      {
        name: "Karthik",
        email: "karthik@example.com",
      },
      {
        name: "John",
        email: "john@gmail.com",
      },
    ]);

    console.log(
      "Substring test data inserted"
    );

  } catch (error) {
    console.error(
      "Insert failed:"
    );

    console.error(error);

  } finally {
    await client.close();
  }
}

main();