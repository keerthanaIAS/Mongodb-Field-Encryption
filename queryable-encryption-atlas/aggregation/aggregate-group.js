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
                    $group: {
                        _id: "$salary",
                        count: {
                            $sum: 1,
                        },
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

// This confirms another QE aggregation limitation.
// Your $group test failed with:
// Error message while run:
// ------------------------
// Cannot group on field '_id' which is encrypted with the random algorithm or whose encryption properties are not known until runtime