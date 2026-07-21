const {
  createClient,
  encryptedDatabaseName,
  encryptedCollectionName,
} = require("./qe-client");

async function main() {
  const client = createClient();

  try {
    await client.connect();

    console.log("Connected to MongoDB Atlas");

    const collection = client
      .db(encryptedDatabaseName)
      .collection(encryptedCollectionName);

    const document = {
      name: "Keerthana",
      email: "keerthana@example.com",
    };

    console.log("\nInserting document:");

    console.log(document);

    await collection.insertOne(document);

    console.log(
      "\nUser inserted successfully!"
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