const {
    createClient,
    encryptedDatabaseName,
    encryptedCollectionName,
} = require("./qe-range-client");

async function main() {
    const client = createClient();

    try {
        await client.connect();

        console.log("Connected to MongoDB Atlas");

        const db = client.db(encryptedDatabaseName);

        const collection = db.collection(
            encryptedCollectionName
        );

        const minSalary = 50000;
        const maxSalary = 100000;

        console.log(
            `\nSearching employees with salary >= ${minSalary} and < ${maxSalary}`
        );

        const results = await collection
            .find({
                salary: {
                    $gte: minSalary,
                    $lt: maxSalary,
                },
            })
            .toArray();

        console.log(
            "\nDecrypted results returned to application:"
        );

        console.dir(results, {
            depth: null,
        });

    } catch (error) {
        console.error(
            "Failed to execute range query:"
        );

        console.error(error);

    } finally {
        await client.close();
    }
}

main();