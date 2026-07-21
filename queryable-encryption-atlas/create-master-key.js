const crypto = require("crypto");
const fs = require("fs");

const masterKey = crypto.randomBytes(96);

fs.writeFileSync("master-key.txt", masterKey);

console.log("Master Key generated successfully");
console.log("Stored in master-key.txt");
console.log("Key size:", masterKey.length, "bytes");

// CSFLE POC
//     │
//     └── master-key.txt
//          ↓
//        CSFLE DEK

// QE POC
//     │
//     └── master-key.txt
//          ↓
//        QE DEK