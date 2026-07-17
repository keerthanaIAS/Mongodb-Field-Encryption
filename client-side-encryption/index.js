const { MongoClient, ClientEncryption } = require('mongodb');
require('dotenv').config();

async function run() {
    console.log("Starting CSFLE...");

    const masterKey = require('crypto').randomBytes(96);
    console.log("Master Key generated");

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log("Connected to MongoDB");

    const keyVaultDb = client.db('encryption');
    await keyVaultDb.createCollection('__keyVault');
    console.log("Key Vault created");

    const clientEncryption = new ClientEncryption(client, {
        keyVaultNamespace: 'encryption.__keyVault',
        kmsProviders: { local: { key: masterKey } }
    });

    const keyId = await clientEncryption.createDataKey('local', {
        keyAltNames: ['employee_key']
    });
    console.log("Data Encryption Key created");

    const collection = client.db(process.env.DATABASE).collection('employees');

    // Encrypt data manually
    const encryptedEmail = await clientEncryption.encrypt(
        "keer@gmail.com",
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
    await collection.insertOne({
        name: "Keerthana",
        email: encryptedEmail,
        salary: encryptedSalary
    });
    console.log("Inserted encrypted data");

    const rawData = await collection.findOne({});
    console.log("Raw data in MongoDB:");
    console.log("  name:", rawData.name);
    console.log("  email:", typeof rawData.email === 'object' ? 'Encrypted Binary' : rawData.email);
    console.log("  salary:", typeof rawData.salary === 'object' ? 'Encrypted Binary' : rawData.salary);

    // Decrypt
    const decryptedEmail = await clientEncryption.decrypt(rawData.email);
    const decryptedSalary = await clientEncryption.decrypt(rawData.salary);

    console.log("\nDecrypted data:");
    console.log("  name:", rawData.name);
    console.log("  email:", decryptedEmail);
    console.log("  salary:", decryptedSalary);

    await client.close();
    console.log("Done!");
}

run().catch(console.error);