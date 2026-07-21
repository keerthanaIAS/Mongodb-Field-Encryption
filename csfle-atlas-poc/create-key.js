// Generate the Master Key
const crypto = require("crypto");
const fs = require("fs");

const masterKey = crypto.randomBytes(96);
// The MongoDB Node.js CSFLE quick start also uses a randomly generated 96-byte local master key.

fs.writeFileSync("master-key.txt", masterKey);

console.log("Master Key generated.");
console.log("Size:", masterKey.length, "bytes");
console.log("Stored at: master-key.txt");