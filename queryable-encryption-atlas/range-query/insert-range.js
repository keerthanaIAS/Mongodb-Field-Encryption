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

        const employee = {
            name: "Keerthana",
            email: "keerthana@example.com",
            salary: 75000,
        };

        console.log("\nInserting employee:");
        console.log(employee);

        await collection.insertOne(employee);

        console.log(
            "\nEmployee inserted successfully!"
        );

    } catch (error) {
        console.error(
            "Failed to insert employee:"
        );

        console.error(error);

    } finally {
        await client.close();
    }
}

main();