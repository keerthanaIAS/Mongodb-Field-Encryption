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
      "\nRunning QE aggregation with salary range..."
    );

    const result = await employees
      .aggregate([
        {
          $match: {
            salary: {
              $gte: 50000,
              $lt: 100000,
            },
          },
        },
      ])
      .toArray();

    console.log(
      "\nAggregation result:"
    );

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