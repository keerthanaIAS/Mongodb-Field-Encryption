const { createClient } = require("./qe-aggregation-client");

async function main() {
  const client = createClient();

  try {
    await client.connect();

    console.log("Connected to MongoDB Atlas");

    const users = client
      .db("queryable_encryption")
      .collection("users");

    console.log(
      "\nRunning Atlas Search on encrypted email..."
    );

    const result = await users
      .aggregate([
        {
          $search: {
            text: {
              query: "keerthana@example.com",
              path: "email",
            },
          },
        },
      ])
      .toArray();

    console.log("\nSearch result:");

    console.dir(result, {
      depth: null,
    });

  } catch (error) {
    console.error("\nSearch failed:");
    console.error(error);

  } finally {
    await client.close();
  }
}

main();

// test was trying to use Atlas Search ($search) on the encrypted email field. It failed with:

// mongotQuery' is not allowed in user requests

// Error response:
// ---------------
// Running Atlas Search on encrypted email...

// Search failed:
// MongoServerError: mongotQuery' is not allowed in user requests

// What this means:
// -------------------
// Your Queryable Encryption (QE) setup supports the queries you explicitly configured:

// email → equality ✅
// salary → range ✅
