const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const collection = client.db(process.env.DATABASE).collection('employees');

    await collection.deleteMany({});
    await collection.insertOne({
        name: "Keerthana",
        email: "keer@gmail.com",
        salary: 50000
    });
    console.log("Inserted: Keerthana");

    const found = await collection.findOne({ email: "keer@gmail.com" });
    console.log("Equality query works:", found);

    const range = await collection.find({ salary: { $gt: 40000 } }).toArray();
    console.log("Range query works:", range);

    const regex = await collection.find({ email: { $regex: /gmail/ } }).toArray();
    console.log("Regex query works:", regex);

    const sorted = await collection.find({}).sort({ salary: -1 }).toArray();
    console.log("Sort works:", sorted);

    console.log("\nNormal MongoDB: All operations work because data is plaintext");
    
    await client.close();
}

run().catch(console.error);