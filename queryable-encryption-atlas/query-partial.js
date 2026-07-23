const {
  createClient,
  encryptedDatabaseName,
  prefixCollectionName,
  suffixCollectionName,
  substringCollectionName,
} = require("./qe-client-partial");

async function main() {
  const client = createClient();
  try {
    await client.connect();
    console.log(
      "Connected to MongoDB Atlas"
    );
    const db = client.db(
      encryptedDatabaseName
    );
    // =================================================
    // PREFIX SEARCH
    // =================================================
    console.log(
      "\n=============================="
    );
    console.log(
      "PREFIX SEARCH"
    );
    console.log(
      "Searching emails starting with: keer"
    );
    const prefixCollection =
      db.collection(
        prefixCollectionName
      );
    const prefixResult =
      await prefixCollection
        .aggregate([
          {
            $match: {
              $expr: {
                $encStrStartsWith: [
                  "$email",
                  "keer",
                ],
              },
            },
          },
        ])
        .toArray();
    console.log(
      "Prefix result:"
    );
    console.log(prefixResult);
    // =================================================
    // SUFFIX SEARCH
    // =================================================
    console.log(
      "\n=============================="
    );
    console.log(
      "SUFFIX SEARCH"
    );
    console.log(
      "Searching emails ending with: @example.com"
    );
    const suffixCollection =
      db.collection(
        suffixCollectionName
      );
    const suffixResult =
      await suffixCollection
        .aggregate([
          {
            $match: {
              $expr: {
                $encStrEndsWith: [
                  "$email",
                  "@example.com",
                ],
              },
            },
          },
        ])
        .toArray();
    console.log(
      "Suffix result:"
    );
    console.log(suffixResult);
    // =================================================
    // SUBSTRING SEARCH
    // =================================================
    console.log(
      "\n=============================="
    );
    console.log(
      "SUBSTRING SEARCH"
    );
    console.log(
      "Searching emails containing: thana"
    );
    const substringCollection =
      db.collection(
        substringCollectionName
      );
    const substringResult =
      await substringCollection
        .aggregate([
          {
            $match: {
              $expr: {
                $encStrContains: [
                  "$email",
                  "thana",
                ],
              },
            },
          },
        ])
        .toArray();

    console.log(
      "Substring result:"
    );
    console.log(
      substringResult
    );
  } catch (error) {
    console.error(
      "\nQuery failed:"
    );
    console.error(error);
  } finally {
    await client.close();
  }
}
main();