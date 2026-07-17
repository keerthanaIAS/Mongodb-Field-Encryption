const { MongoClient, ClientEncryption } = require('mongodb');
require('dotenv').config();

async function run() {
    console.log("Starting RANDOM Encryption...");

    const masterKey = require('crypto').randomBytes(96);
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const keyVaultDb = client.db('encryption');
    await keyVaultDb.createCollection('__keyVault');

    const clientEncryption = new ClientEncryption(client, {
        keyVaultNamespace: 'encryption.__keyVault',
        kmsProviders: { local: { key: masterKey } }
    });

    const keyId = await clientEncryption.createDataKey('local', {
        keyAltNames: ['employee_key']
    });
    console.log("Data Encryption Key created");

    const collection = client.db(process.env.DATABASE).collection('employees');

    // Encrypt with random algorithm
    const encryptedEmail1 = await clientEncryption.encrypt(
        "keer@gmail.com",
        {
            keyId: keyId,
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
        }
    );

    const encryptedEmail2 = await clientEncryption.encrypt(
        "keer@gmail.com", // Same email but random will produce different
        {
            keyId: keyId,
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
        }
    );

    const encryptedSalary = await clientEncryption.encrypt(
        50000,
        {
            keyId: keyId,
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
        }
    );

    await collection.deleteMany({});
    await collection.insertMany([
        { name: "Keerthana", email: encryptedEmail1, salary: encryptedSalary },
        { name: "Keerthana_2", email: encryptedEmail2, salary: encryptedSalary }
    ]);
    console.log("Inserted 2 documents with SAME email");

    console.log("\nRaw data - both emails are encrypted differently (random):");
    const rawDocs = await collection.find({}).toArray();
    rawDocs.forEach((doc, i) => {
        console.log(`  Doc ${i+1}: name=${doc.name}, email=Encrypted (different from doc ${i+1 === 1 ? 2 : 1})`);
    });

    console.log("\nRandom Encryption:");
    console.log("  Same plaintext -> Different ciphertext");
    console.log("  Equality queries DO NOT work");
    console.log("  Strongest security");

    await client.close();
}

run().catch(console.error);