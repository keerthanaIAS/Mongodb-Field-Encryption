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
    // Use QE equality
    const result3 = await collection.find({
      email: "keerthana@example.com"
    }).toArray();

    console.log(result3, "exact match search");

    // Search a separate non-encrypted field
    //  -

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

    console.log("\n--- Regex Search ---");

    try {
      const regexResult = await collection.find({
        email: {
          $regex: "keer",
          $options: "i",
        },
      }).toArray();

      console.log("Regex result:", regexResult);

    } catch (error) {
      console.log(
        "Regex search failed as expected:"
      );

      console.log(error.message);
    }

    const users = await collection.find({}).toArray();

    // Use application-side filtering
    const resultFilter = users.filter(user =>
      user.email
        .toLowerCase()
        .startsWith("keer")
    );

    console.log(
      "\n resultFilter:", resultFilter
    );

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