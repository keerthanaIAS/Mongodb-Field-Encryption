const { createClient } = require("./qe-aggregation-client");

async function main() {
  const client = createClient();

  try {
    await client.connect();

    console.log("Connected to MongoDB Atlas");

    const employees = client
      .db("queryable_encryption")
      .collection("employees");

    console.log(
      "\nRunning QE aggregation with $sort on encrypted salary..."
    );

    const result = await employees
      .aggregate([
        {
          $sort: {
            salary: 1,
          },
        },
      ])
      .toArray();

    console.log("\nAggregation result:");

    console.dir(result, {
      depth: null,
    });

  } catch (error) {
    console.error("\nAggregation failed:");
    console.error(error);

  } finally {
    await client.close();
  }
}

main();

// Your test proved:
// --------------------
// QE encrypted salary
//         │
//         ├── $match with range
//         │      └── ✅ Supported
//         │
//         └── $sort
//                └── ❌ Not allowed

// Error response:
// Aggregation failed:
// MongoCryptError: [crypt_shared 8.3.4] "analyze_query" failed: Sorting on key 'salary' is not allowed due to encryption. [Error 2, code 51201]
