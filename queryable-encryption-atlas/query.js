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

    const emailToSearch =
      "keerthana@example.com";

    console.log(
      "\nSearching for:",
      emailToSearch
    );

    const result = await collection.findOne({
      email: emailToSearch,
    });

    const result1 = await collection.find({
      email: { $eq: "keerthana@example.com" }
    }).toArray();

    console.log(result1, "res1");

    const result2 = await collection.find({
      email: {
        $in: [
          "keerthana@example.com",
          "abc@gmail.com"
        ]
      }
    }).toArray();

    console.log(result2, "res2");

    console.log(
      "\nDecrypted result returned to application:"
    );

    console.log(result);

  } catch (error) {
    console.error(
      "Query failed:"
    );

    console.error(error);

  } finally {
    await client.close();
  }
}

main();

// query.js
//     │
//     │ Plaintext query
//     ▼
// {
//   email: "keerthana@example.com"
// }
//     │
//     ▼
// QE processes encrypted query
//     │
//     ▼
// Finds encrypted document
//     │
//     ▼
// Decrypts result
//     │
//     ▼
// Application receives:
// {
//   name: "Keerthana",
//   email: "keerthana@example.com"
// }