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
      "\nRunning QE aggregation with $match..."
    );

    const result = await users
      .aggregate([
        {
          $match: {
            email: "keerthana@example.com",
          },
        },
      ])
      .toArray();

    console.log("\nAggregation result:");

    console.dir(result, {
      depth: null,
    });

  } catch (error) {
    console.error(
      "\nAggregation failed:"
    );

    console.error(error);

  } finally {
    await client.close();
  }
}

main();