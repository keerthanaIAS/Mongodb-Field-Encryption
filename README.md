# 
| POC                      | Replica Set Required? |
| ------------------------ | --------------------- |
| normal                   | ❌ No                  |
| csfle                    | ❌ No                  |
| deterministic-encryption | ❌ No                  |
| random-encryption        | ❌ No                  |
| queryable-encryption     | ✅ Yes                 |

*Queryable Encryption requires a replica set because it relies on features (such as retryable writes and transactions) that require replica set functionality, even for a single-node development setup.*

# What the project teaches
Normal
   │
Plain text
   │
──────────────
CSFLE
   │
How encryption is configured
   │
Key Vault
Master Key
DEK
Schema Map
Auto Encryption
Auto Decryption
──────────────
Deterministic
   │
Equality Search
──────────────
Random
   │
Storage Only
──────────────
Queryable Encryption
   │
Encrypted Queries

## What Each Project Demonstrates

| Project | What it Shows |
|---------|---------------|
| **normal** | Baseline - all queries work on plaintext data |
| **csfle** | Client encrypts data, MongoDB stores encrypted data, client decrypts on read |
| **deterministic-encryption** | Same plaintext -> same ciphertext, equality queries work, range/regex fail |
| **random-encryption** | Same plaintext -> different ciphertext, all queries fail on encrypted fields |
| **queryable-encryption** | Both equality and range queries work on encrypted data, regex still fails |

# Stop existing containers
docker-compose down

# Start fresh
docker-compose up -d

# Initialize replica set
docker exec -it mongodb-field-encryption mongosh --eval '
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "localhost:27017" }]
})
'
You have to choose one approach
Option A — Run on your Mac

# 1. Start everything
docker-compose up -d

# 2. Initialize replica set
docker exec -it mongodb-field-encryption mongosh --eval '
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "mongodb:27017" }]
})
'

# 3. Enter Node container
docker exec -it node-csfle-app bash

# 4. Inside container - install and run
cd /app/client-side-encryption
npm install

# Inside the container
cd /app/client-side-encryption

# Clean install
rm -rf node_modules package-lock.json
npm install
npm install mongodb-client-encryption

# Run
node index.js


Use:

MONGODB_URI=mongodb://localhost:27017/?replicaSet=rs0

and your replica set should advertise localhost:27017.

Option B — Run inside Docker

Use:

MONGODB_URI=mongodb://mongodb:27017/?replicaSet=rs0

and your replica set should advertise mongodb:27017.

Don't mix them.

# Note:
-------
---

## What We've Built: 5 Different Approaches

| Project | Type | Algorithm Used | What It Does |
|---------|------|----------------|--------------|
| **normal-mongodb** | No Encryption | None | Plaintext storage |
| **client-side-encryption** | CSFLE (Random) | `AEAD_AES_256_CBC_HMAC_SHA_512-Random` | Same value → Different ciphertext each time |
| **deterministic-encryption** | CSFLE (Deterministic) | `AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic` | Same value → Same ciphertext |
| **random-encryption** | CSFLE (Random) | `AEAD_AES_256_CBC_HMAC_SHA_512-Random` | Same value → Different ciphertext |
| **queryable-encryption** | Queryable Encryption | `AEAD_AES_256_CBC_HMAC_SHA_512-Random` + Special Indexes | Same as Random but with encrypted indexes for querying |

---

## Let Me Explain Each One Clearly
----------------------------------------------
### 1. client-side-encryption (CSFLE - Random)

**What it is:** Client-Side Field Level Encryption with Random algorithm

**Algorithm:** `AEAD_AES_256_CBC_HMAC_SHA_512-Random`

**How it works:**
- Uses AES-256 encryption
- Random initialization vector (IV) each time
- Same plaintext → Different ciphertext

**In our code:**
```javascript
algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
```

**What it looks like:**
```
Plaintext: "keer@gmail.com" → Ciphertext: 7f8a9b3c...
Plaintext: "keer@gmail.com" → Ciphertext: 4d5e6f7a... (different!)
```

**Pros:** Strongest security, no pattern leakage
**Cons:** Cannot search on encrypted fields

---

### 2. deterministic-encryption (CSFLE - Deterministic)

**What it is:** Client-Side Field Level Encryption with Deterministic algorithm

**Algorithm:** `AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic`

**How it works:**
- Uses AES-256 encryption
- Same IV for same plaintext
- Same plaintext → Same ciphertext

**In our code:**
```javascript
algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
```

**What it looks like:**
```
Plaintext: "keer@gmail.com" → Ciphertext: 7f8a9b3c...
Plaintext: "keer@gmail.com" → Ciphertext: 7f8a9b3c... (same!)
```

**Pros:** Enables equality queries
**Cons:** Pattern leakage possible (same values look same in database)

---

### 3. random-encryption (CSFLE - Random)

**What it is:** Same as `client-side-encryption` (just organized as a separate POC)

**Algorithm:** Same as client-side-encryption

**Why separate?** To clearly demonstrate that Random encryption makes queries fail.

**What it shows:**
```javascript
// This query FAILS with Random encryption
await collection.findOne({ email: "keer@gmail.com" }); // ❌
```

---

### 4. queryable-encryption (Queryable Encryption)

**What it is:** MongoDB's Queryable Encryption (QE) - A NEWER feature

**Algorithm:** Uses the same encryption but adds **encrypted indexes**

**How it works:**
1. Data is encrypted with Random encryption
2. MongoDB creates special encrypted indexes
3. Queries use these encrypted indexes

**In our code:**
```javascript
encryptedFields: {
    fields: [
        {
            path: "email",
            bsonType: "string",
            queries: { queryType: "equality" }  // Equality support
        },
        {
            path: "salary",
            bsonType: "int",
            queries: { queryType: "range" }      // Range support!
        }
    ]
}
```

**What it supports:**
- ✅ Equality queries
- ✅ Range queries
- ✅ Data remains encrypted at rest

---

## Comparison Table

| Feature | CSFLE Random | CSFLE Deterministic | Queryable Encryption |
|---------|--------------|---------------------|---------------------|
| **Encryption Algorithm** | AES-256 Random | AES-256 Deterministic | AES-256 Random |
| **Same Value → Same Ciphertext** | ❌ No | ✅ Yes | ❌ No |
| **Equality Queries** | ❌ No | ✅ Yes | ✅ Yes |
| **Range Queries** | ❌ No | ❌ No | ✅ Yes |
| **Regex Queries** | ❌ No | ❌ No | ❌ No |
| **Pattern Leakage** | ❌ No | ✅ Yes | ❌ No |
| **Special Indexes Needed** | ❌ No | ❌ No | ✅ Yes |

---

## What We Actually Did in Code

### For CSFLE (Client-Side Encryption):
```javascript
// We created a Data Encryption Key
const keyId = await clientEncryption.createDataKey('local', {
    keyAltNames: ['employee_key']
});

// We encrypted data MANUALLY on the client
const encryptedEmail = await clientEncryption.encrypt(
    "keer@gmail.com",
    {
        keyId: keyId,
        algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random" // or Deterministic
    }
);
```

### For Queryable Encryption:
```javascript
// We configured encrypted fields with query support
encryptedFields: {
    fields: [
        {
            path: "email",
            bsonType: "string",
            queries: { queryType: "equality" }
        },
        {
            path: "salary",
            bsonType: "int",
            queries: { queryType: "range" }
        }
    ]
}
```

---

## Visual Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     ENCRYPTION TYPES                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            CLIENT-SIDE ENCRYPTION (CSFLE)           │    │
│  │                                                     │    │
│  │  ┌─────────────────┐      ┌─────────────────┐      │    │
│  │  │  DETERMINISTIC  │      │     RANDOM      │      │    │
│  │  │                 │      │                 │      │    │
│  │  │  Same plaintext │      │ Same plaintext  │      │    │
│  │  │  → Same cipher  │      │ → Different ci  │      │    │
│  │  │                 │      │                 │      │    │
│  │  │  ✅ Equality    │      │ ❌ No queries   │      │    │
│  │  │  ❌ Range       │      │ ❌ Range        │      │    │
│  │  │  ⚠️ Pattern leak│      │ ✅ No leak      │      │    │
│  │  └─────────────────┘      └─────────────────┘      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          QUERYABLE ENCRYPTION (QE)                  │    │
│  │                                                     │    │
│  │  Same as Random + Encrypted Indexes                 │    │
│  │                                                     │    │
│  │  ✅ Equality queries                                │    │
│  │  ✅ Range queries                                   │    │
│  │  ❌ Regex queries                                   │    │
│  │  ❌ No pattern leakage                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## In Simple Terms

| Approach | Best For |
|----------|----------|
| **CSFLE Random** | Passwords, credit cards - no need to search |
| **CSFLE Deterministic** | Email, username - need to search by exact match |
| **Queryable Encryption** | Sensitive data that needs full search (equality + range) |

---

## The Algorithm Names

All use **AES-256** encryption with different modes:

1. **Random**: `AEAD_AES_256_CBC_HMAC_SHA_512-Random`
2. **Deterministic**: `AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic`
3. **Queryable**: Same as Random but with encrypted indexes

**AEAD** = Authenticated Encryption with Associated Data
**AES-256** = 256-bit Advanced Encryption Standard
**CBC** = Cipher Block Chaining mode
**HMAC-SHA-512** = Message authentication for integrity

---

You now understand all 5 approaches! The key difference is:
- **CSFLE** = Client encrypts, but query capabilities depend on algorithm
- **Queryable Encryption** = Client encrypts + special indexes allow more queries

# main env:
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin123

MONGO_PORT=27017

MONGO_DATABASE=encryption_poc

# other all inside env:
MONGODB_URI=mongodb://mongodb:27017/?replicaSet=rs0
DATABASE=encryption_poc


chmod +x docker-compose-up.sh
./docker-compose-up.sh

# The important distinction is:
- DEK (Data Encryption Key) → *stored in MongoDB Atlas inside encryption.__keyVault, but its actual key material is encrypted/wrapped*.
- Master Key / CMK (Customer Master Key) → with the Local KMS provider, *stored outside MongoDB*, for example in master-key.txt.
- Atlas *does not store your plaintext master key*.
- Your application uses *the master key to unwrap the DEK*, and the *DEK encrypts/decrypts your actual field data*. MongoDB describes this as envelope encryption.

# Auto Encryption Flow:
                   YOUR NODE.JS APPLICATION
                            |
                            |
                  Local Master Key (CMK)
                     master-key.txt
                            |
                            | wraps / unwraps
                            v
                  DEK (Data Encryption Key)
                            |
                            | stored encrypted
                            v
                 MongoDB Atlas Key Vault
                 encryption.__keyVault
                            |
                            | DEK encrypts field
                            v
                 MongoDB Atlas Application DB
                  csfle_poc.users
                            |
                            v
                 { email: <encrypted> }

# Now open Atlas: *After created the 1st master create-key and create dek 2nd, we see like this:
Atlas
  ↓
Browse Collections
  ↓
encryption
  ↓
__keyVault

## You should see a document similar conceptually to:
{
  _id: Binary(...),

  keyAltNames: [
    "my-data-key"
  ],

  keyMaterial: Binary(...),

  creationDate: ISODate(...),

  updateDate: ISODate(...),

  status: 0,

  masterKey: {
    provider: "local"
  }
}

### The important thing is:                                                                                  -->*important notes*
_id
   ↓
DEK identifier

keyMaterial
   ↓
Encrypted DEK material

masterKey
   ↓
Metadata describing the CMK/KMS provider

*The actual plaintext DEK is not sitting in Atlas as readable key material. The DEK is encrypted by the master key before it is stored in the Key Vault. MongoDB documents this explicitly: the Key Vault stores DEKs, and DEKs are encrypted using the CMK before storage.*

| Component                   | Purpose                                          |
| --------------------------- | ------------------------------------------------ |
| `mongodb`                   | Node.js MongoDB driver                           |
| `mongodb-client-encryption` | Encryption dependency/binding required for CSFLE |
| `mongo_crypt_v1.dylib`      | Cryptographic encryption engine                  |
| `master-key.txt`            | Your local Customer Master Key                   |
| DEK                         | Encrypts your actual data fields                 |
| `encryption.__keyVault`     | Stores the encrypted DEK                         |
| Atlas `users` collection    | Stores your encrypted application data           |

#### The relationship is:
MASTER KEY
master-key.txt
       │
       │ protects / wraps
       ▼
DEK
Data Encryption Key
       │
       │ encrypts
       ▼
email
"keerthana@example.com"

##### the storage is:
Your Mac
│
└── master-key.txt
      │
      │
      │ used to decrypt/wrap DEK
      │
      ▼
MongoDB Atlas
│
└── encryption.__keyVault
      │
      └── encrypted DEK
              │
              │ encrypts
              ▼
         csfle_poc.users
              │
              └── email: Binary(...)

- The crypt_shared library is not your Master Key.
- It is not your DEK.
- It is not the Key Vault.
- It is the engine that performs the encryption/decryption operations.

# successful flow
------------------
__________________
# Your exact successful flow

When you ran:

```bash
node insert.js
```

this happened:

### Step 1

Your application started:

```text
insert.js
```

### Step 2

The driver loaded:

```text
mongodb-client-encryption
```

### Step 3

The driver loaded:

```text
mongo_crypt_v1.dylib
```

because you configured:

```js
cryptSharedLibPath
```

### Step 4

Your application found the DEK:

```text
UJlU6I/ET76+rKm8k6FQmQ==
```

### Step 5

The encryption engine used your key configuration.

### Step 6

Your application attempted to insert:

```js
{
  name: "Keerthana",
  email: "keerthana@example.com"
}
```

### Step 7

Before sending the document to Atlas:

```text
email:
"keerthana@example.com"
```

was automatically encrypted.

Conceptually:

```text
{
  name: "Keerthana",

  email: Binary(
    encrypted data
  )
}
```

### Step 8

Atlas received the encrypted value.

### Step 9

When your application executed:

```js
users.findOne(...)
```

the encrypted value came back from Atlas.

### Step 10

The driver + `crypt_shared` decrypted it.

### Step 11

Your Node.js application received:

```js
{
  name: "Keerthana",
  email: "keerthana@example.com"
}
```

That's why you see:

```text
Decrypted result returned to application
```

---

## The most important thing to remember

You now have **three separate concepts**:

```text
                 CRYPTOGRAPHIC KEYS
                       │
             ┌─────────┴─────────┐
             │                   │
        Master Key             DEK
       (CMK / KEK)          Data Key
             │                   │
             │                   │
             ▼                   ▼
     Protects the DEK      Encrypts your data
             │                   │
             ▼                   ▼
      master-key.txt       email field
```

And separately:

```text
              ENCRYPTION ENGINE
                     │
                     ▼
              crypt_shared
          mongo_crypt_v1.dylib
                     │
                     ▼
       Performs encryption/decryption
```

So:

> **Master Key and DEK are keys. `crypt_shared` is the software engine that performs the cryptographic operations using those keys.**

*mongodb-client-encryption using this lib are we using the mongo_crypt_v1.dylib engine? say short*?               ---->*doubt*
mongodb-client-encryption
        ↓
loads/uses
mongo_crypt_v1.dylib (crypt_shared)
        ↓
performs CSFLE encryption/decryption

---
