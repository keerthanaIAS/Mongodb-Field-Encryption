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

Simple:
-------
* **DEK (Data Encryption Key)** = the key that **actually encrypts your data**.
* **Master Key** = the key that **protects the DEK**.

**"Master key unwraps the DEK"** means:

> The master key **decrypts/unlocks the encrypted DEK**, so the DEK can then be used to encrypt or decrypt the actual data.

Think of it like:
**Master Key 🔑 → unlocks DEK 🔐 → DEK encrypts/decrypts Data 📄**

The master key **does not directly encrypt your database data**. It protects the **DEK**.

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

# Queryable Encryption
        │
        ├── Master Key
        ├── Data Encryption Key
        ├── Encrypted Fields Configuration
        ├── crypt_shared
        ├── Encrypt data
        └── Query encrypted fields

## The key difference is:
CSFLE
email → encrypted
       ↓
Cannot normally query encrypted value directly

Queryable Encryption
email → encrypted
       ↓
Can query using plaintext:
{ email: "keerthana@example.com" }
       ↓
MongoDB performs encrypted query processing
       ↓
Returns matching document

### Unlike your previous CSFLE POC:
CSFLE
    ↓
DEK
    ↓
schemaMap
    ↓
Encrypt fields

### QE uses:
Queryable Encryption
        ↓
Data Encryption Key
        ↓
encryptedFields
        ↓
Queryable encrypted field
        ↓
Internal QE metadata collections

#### we'll define:
email
as an equality-queryable encrypted field.

##### Conceptually:
Plaintext

{
  name: "Keerthana",
  email: "keerthana@example.com"
}
        ↓
Queryable Encryption
{
  name: "Keerthana",
  email: <encrypted>
}
        ↓
Atlas
Encrypted data
+
QE internal metadata

##### Then you'll be able to run:
users.findOne({
  email: "keerthana@example.com"
});
- without manually encrypting the query yourself.
The driver handles the encryption/query processing.

# Queryable Encryption POC
The POC flow will be:

                Node.js Application
                        │
                        ▼
               MongoDB Driver
                        │
                        ▼
           mongodb-client-encryption
                        │
                        ▼
                  crypt_shared
                        │
                        ▼
               Queryable Encryption
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
       Encrypt                    Query
          │                           │
          └─────────────┬─────────────┘
                        ▼
                 MongoDB Atlas

Learn:
1. Master Key
2. DEK
3. Key Vault
4. Encrypted Fields
5. Queryable encrypted field
6. Automatic encryption
7. Automatic decryption
8. Equality query
9. Inspect encrypted data in Atlas
10. Understand QE internal collections

# The complete QE flow building:
STEP 1
Create separate folder
        ↓
queryable-encryption-poc

STEP 2
Install dependencies
        ↓
mongodb
dotenv
mongodb-client-encryption

STEP 3
Generate NEW Master Key
        ↓
master-key.txt

STEP 4
Configure Atlas URI
        ↓
.env

STEP 5
Copy crypt_shared
        ↓
lib/mongo_crypt_v1.dylib

STEP 6
Create NEW QE DEK
        ↓
encryption.__keyVault

STEP 7
Define encryptedFields
        ↓
email = equality queryable

STEP 8
Create encrypted collection
        ↓
csfle_qe_poc.users

STEP 9
Insert plaintext
        ↓
{ email: "keerthana@example.com" }

STEP 10
Driver automatically encrypts
        ↓
Atlas stores encrypted data

STEP 11
Query plaintext
        ↓
{ email: "keerthana@example.com" }

STEP 12
QE automatically handles query
        ↓
Matching document

STEP 13
Inspect Atlas
        ↓
Encrypted user data
+
QE internal collections
+
Key Vault

## Remaining Steps:
                    QUERYABLE ENCRYPTION POC
                              │
                              ▼
                       Master Key
                     (local file)
                              │
                              ▼
                           DEK
                              │
                              ▼
                    encryption.__keyVault
                              │
                              ▼
                     encryptedFields
                              │
                              ▼
                  Create QE encrypted collection
                              │
                              ▼
                         Insert.js
                              │
                  plaintext email from app
                              │
                              ▼
                     Driver encrypts it
                              │
                              ▼
                         Atlas stores
                 encrypted data + QE metadata
                              │
                              ▼
                          query.js
                              │
                  plaintext email query
                              │
                              ▼
                 Driver encrypts query
                              │
                              ▼
                    Atlas finds matching data
                              │
                              ▼
                   Driver decrypts result
                              │
                              ▼
                       App sees plaintext

### How is QE Stored in Atlas?
This is the part you specifically wanted to understand.

* Your CSFLE POC currently looks approximately like:
Atlas
│
├── encryption
│   └── __keyVault
│       └── DEK
│
└── your_database
    └── users
        ├── _id
        ├── name
        └── email: <encrypted binary>

With Queryable Encryption, you'll have additional QE-related metadata.

* Conceptually:
Atlas
│
├── encryption
│   └── __keyVault
│       └── QE DEK
│
└── queryable_encryption
    │
    ├── users
    │   └── encrypted user documents
    │
    └── QE internal metadata collections
        └── encrypted query support data

*The major difference is*:
CSFLE
Application
   │
   │ insert plaintext
   ▼
Driver
   │
   │ encrypt
   ▼
Atlas
   │
   ▼
Encrypted field

*You cannot normally query the encrypted field directly*.

Queryable Encryption
Application
   │
   │ insert plaintext
   ▼
QE Driver
   │
   ├── encrypt data
   ├── create query metadata
   └── maintain queryability
          │
          ▼
       Atlas

Then:
Application
------------
users.findOne({
  email: "keerthana@example.com"
})
        ↓
QE Driver

Encrypts query
        ↓
Atlas

Uses QE query metadata
        ↓

Finds encrypted document
        ↓
QE Driver

Decrypts result
        ↓
Application

{
  email: "keerthana@example.com"
}

## Result of QE Decrypt:
Decrypted result returned to application:
{
  _id: new ObjectId('6a5f192af805a847f24a989a'),
  name: 'Keerthana',
  email: 'keerthana@example.com',
  __safeContent__: [               -->*This is Queryable Encryption metadata used by MongoDB to support queries against encrypted fields.*
    Binary.createFromBase64('VC8gfOyBdwcofn2XciyjMZR7benPXD4m4ZtzVxkpWvI=', 0)
  ]
}

## Result for QE range Decrypt:
Decrypted results returned to application:
[
  {
    _id: ObjectId {
      buffer: Buffer(12) [Uint8Array] [
        106,  95,  29, 159, 181,
        170,  45, 241,   4,  25,
         81, 123
      ]
    },
    name: 'Keerthana',
    email: 'keerthana@example.com',
    salary: 75000,
    __safeContent__: [
      Binary {
        buffer: Buffer(32) [Uint8Array] [
          114,  12, 253, 171, 127, 222, 89, 214,
          206,  99, 220, 172,  49, 167, 13, 254,
           39,  14, 125,  29,  65,  90,  2, 156,
          114, 156, 168, 160,  79, 143, 46,   4
        ],
        sub_type: 0,
        position: 32
      },
      Binary {
        buffer: Buffer(32) [Uint8Array] [
           74, 171,  12, 251,  51,  71,  40, 119,
           71,  70,  31, 101,  17,  34, 115,  51,
           53, 195, 188, 103, 211, 102, 157, 180,
          134, 224, 216, 135, 165, 207,  27, 200
        ],
        sub_type: 0,
        position: 32
      },
      Binary {
        buffer: Buffer(32) [Uint8Array] [
          234, 206,  71, 228, 171,  59, 125, 232,
          169,  37,   2,  19,  19,  72, 150, 217,
          251,  75,  31,  54, 129,  76, 184,  72,
           28,  60, 219, 191, 159, 141, 139,  30
        ],
        sub_type: 0,
        position: 32
      },
      Binary {
        buffer: Buffer(32) [Uint8Array] [
          182, 100, 149,  71, 134, 250, 128,
           76, 167,   2,  76, 186, 230, 255,
          130,  57, 236, 116, 168,  58, 202,
          102, 175, 185, 169, 165, 113, 163,
           69, 208,  44,  23
        ],
        sub_type: 0,
        position: 32
      },
      Binary {
        buffer: Buffer(32) [Uint8Array] [
          189, 158, 211, 127, 152,  16,  27,
          205, 185, 103, 202, 114, 158, 251,
          119, 241, 245, 251,  47,   6, 175,
           11, 232, 182, 197, 165, 235,  25,
          169, 112, 201, 178
        ],
        sub_type: 0,
        position: 32
      },
      Binary {
        buffer: Buffer(32) [Uint8Array] [
           88,  42, 164, 101,   5, 252,  10, 232,
          176,  11,  40,  57, 134, 108, 253,  11,
          121, 230, 252, 241, 134, 161,  75,  11,
           93,  62,  33, 223,  80, 167, 186, 140
        ],
        sub_type: 0,
        position: 32
      },
      Binary {
        buffer: Buffer(32) [Uint8Array] [
          119,  98,  76, 235,  44,  65, 160, 141,
          106, 254, 136, 122, 201,  18, 250,  20,
          146, 206, 206,  86,   6, 244,  14, 209,
           30,  10, 181, 159,   0, 117, 159,  81
        ],
        sub_type: 0,
        position: 32
      },
      Binary {
        buffer: Buffer(32) [Uint8Array] [
          156, 217, 165,  41, 161, 244, 206,  12,
            1, 228,  43, 110,  81,  56,  25,  22,
          164, 178,  14, 191, 232,  92, 253,  49,
           96, 106, 186,  86,   6, 191,   7, 190
        ],
        sub_type: 0,
        position: 32
      },
      Binary {
        buffer: Buffer(32) [Uint8Array] [
          183, 129, 160, 149, 171,  16, 173,
          238,  84, 188,  36, 213,  90, 178,
          252, 116, 199, 198, 241, 163,  88,
          149,  98,  35, 254,  10, 255, 183,
          192,  35, 101, 210
        ],
        sub_type: 0,
        position: 32
      }
    ]
  }
]

### This is the key thing you wanted to understand:
              CSFLE                         Queryable Encryption
──────────────────────────────    ──────────────────────────────
Master Key                       Master Key
     ↓                                 ↓
DEK                              DEK
     ↓                                 ↓
Key Vault                        Key Vault
     ↓                                 ↓
Encrypt field                    Encrypt field
     ↓                                 ↓
Encrypted data                   Encrypted data
                                   +
                               __safeContent__
                                   +
                             ESC / ECOC metadata
                                   ↓
                           Query encrypted field

#### QE learning flow:
You now have two independent POCs:

POC 1 — Equality
users
│
└── email
      │
      ├── Encrypt
      ├── Store encrypted
      └── Query equality
           ↓
      email = "keerthana@example.com"

Run:
node create-collection.js
node insert.js
node query.js

POC 2 — Range
employees
│
├── email
│     └── Equality query
│
└── salary
      │
      ├── Encrypt
      ├── Store encrypted
      └── Query range
           ↓
      salary >= 50000
      salary < 100000

Run:
cd range-query
node create-range-collection.js
node insert-range.js
node query-range.js

# important doubts:
------------------------------
**the master key and key vault are two different things**.

### 1. Master Key

```js
const masterKey = crypto.randomBytes(96);
```

This creates a **96-byte local master key**.

* It is the root key used to protect your **Data Encryption Keys (DEKs)**.
* You should generate it **once** and save it securely.
* Do **not** generate a new one every time the application starts, otherwise old encrypted DEKs cannot be decrypted.

Example:

```js
const masterKey = crypto.randomBytes(96);
fs.writeFileSync("master-key.txt", masterKey);
```

*For a real production system, you would normally use a **KMS** such as AWS KMS, Azure Key Vault, or GCP KMS instead of storing a local master key in a file*.                                                                                              --->*important line*

---

### 2. Key Vault

```js
const keyVault = client
    .db("encryption")
    .collection("__keyVault");
```

This is where MongoDB stores the **Data Encryption Key (DEK)**.

The relationship is:

```text
Master Key
    │
    │ protects
    ▼
Data Encryption Key (DEK)
    │
    │ encrypts
    ▼
Your sensitive field
(email, salary, etc.)
```

The DEK itself is stored in:

```text
encryption.__keyVault
```

The DEK is stored **encrypted/wrapped**, not as a plaintext key.

---

### Why do we access `__keyVault`?

When your code does:

```js
const dataKey = await keyVault.findOne({
    keyAltNames: "my-data-key"
});
```

you are saying:

> "Find the Data Encryption Key that I previously created and stored in the Key Vault."

Then CSFLE uses that DEK to encrypt/decrypt your field.

### The complete flow

```text
1. Generate Master Key
       ↓
2. Create DEK using Master Key
       ↓
3. Store encrypted DEK in encryption.__keyVault
       ↓
4. Use DEK to encrypt email
       ↓
5. Store encrypted email in MongoDB
```

So, **we don't create the Key Vault because of the Master Key**. The Key Vault is the MongoDB collection that **stores the encrypted DEKs**, while the Master Key is used to protect those DEKs.

And yes, in your **local CSFLE POC**, `crypto.randomBytes(96)` is the way you generated the 96-byte master key. **You should generate it only once**, not every run.

* Question:
------------
------------
So, **we don't create the Key Vault because of the Master Key**. The Key Vault is the MongoDB collection that **stores the encrypted DEKs**, while the Master Key is used to protect those DEKs. yes in seen in mongo db but it will create only once right for one collection? kmk dek keyvault?

Yes, but there is one important correction: **the Key Vault is not one per collection**.

For MongoDB Client-Side Field Level Encryption (CSFLE), think of it like this:

```text
KMS / Master Key
       │
       │ protects
       ▼
     DEK
       │
       │ stored encrypted in
       ▼
   Key Vault Collection
       │
       │ used to encrypt/decrypt
       ▼
   Your Data Collection
```

### How many do you create?

| Component                     | How many?                                      | Purpose                                |
| ----------------------------- | ---------------------------------------------- | -------------------------------------- |
| **Master Key (KMK)**          | Usually one or more                            | Protects/wraps the DEKs                |
| **DEK**                       | Can be multiple                                | Encrypts your actual data fields       |
| **Key Vault Collection**      | Usually **one per database/application setup** | Stores the encrypted DEK documents     |
| **Encrypted Data Collection** | Can be many                                    | Stores your encrypted application data |

### Example

Suppose you have:

```text
users
orders
payments
```

You can have:

```text
KMS Master Key
      │
      ├── DEK 1 → users.email
      ├── DEK 2 → orders.cardNumber
      └── DEK 3 → payments.accountNumber
                │
                ▼
        Key Vault Collection
        (stores all 3 encrypted DEKs)
```

So, **you don't create a new Key Vault collection for every data collection**.

You typically create the **Key Vault collection once**, then create as many **DEKs** as your encryption design requires.

One more important point: **the Master Key itself is normally not stored inside the MongoDB Key Vault collection**. The Key Vault stores the **encrypted DEK**. The Master Key is managed by a KMS (or, in a local development setup, you may use a local master key).

So your mental model should be:

> **Master Key → protects DEK → encrypted DEK is stored in Key Vault → DEK encrypts your data.**

That is the correct hierarchy.

# important doubt 2 in _keyvault i can see multiple is that created seperately for many node files try?
--------------------------------------------------------------------------------------------------------
Exactly — **these multiple keys were created because you ran your POC code multiple times and/or created separate encryption setups**. They are **not automatically created once per day**.

You currently have several DEKs in `encryption.__keyVault`:

```text
DEK 1 → 2026-07-21 04:37
DEK 2 → 2026-07-21 06:23
DEK 3 → 2026-07-21 06:58
DEK 4 → 2026-07-21 07:19
```

### Why?

Every time you execute code like:

```js
const dataKey = await clientEncryption.createDataKey(
    "local",
    {
        keyAltNames: ["my-data-key"]
    }
);
```

a **new DEK is created** and stored in:

```text
encryption.__keyVault
```

If you use a different `keyAltNames`, for example:

```text
my-data-key
qe-data-key
range-data-key
```

you may also have multiple DEKs intentionally.

### Important distinction

You should think of it like this:

```text
Master Key
└── Usually ONE master key for your local POC
       │
       ├── DEK 1 → CSFLE deterministic email
       │
       ├── DEK 2 → CSFLE random field
       │
       ├── DEK 3 → QE email
       │
       └── DEK 4 → QE salary
```

But your actual setup depends on the code you ran. **The entries you're showing are DEKs, not four master keys.**

The `masterKey` field inside each document describes the **KMS master-key metadata** used to wrap/protect that DEK. It does **not mean MongoDB generated four new 96-byte master keys**.

# important doubt okay why we download the enterprice crypt shared and copy that .dylib file inside my application folder is that platform allow me to do my auto encryption and its does not require for manual?
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
* crypt_shared (mongo_crypt_v1.dylib) is the encryption engine that the MongoDB driver uses for automatic encryption/decryption.

* You downloaded the MongoDB Enterprise package because it contains this shared library.

* You copied the .dylib into your project so the Node.js driver can load it through:
extraOptions: {
  cryptSharedLibPath: "./lib/mongo_crypt_v1.dylib"
}
This allows your application to use automatic CSFLE/QE without manually calling encryption/decryption functions for every field.

## Your flow
Your Node.js Application
        ↓
MongoDB Node.js Driver
        ↓
crypt_shared
mongo_crypt_v1.dylib
        ↓
Automatically encrypts/decrypts fields
        ↓
MongoDB Atlas

* yes: crypt_shared enables the driver to perform the cryptographic work automatically.

But one correction: crypt_shared itself does not replace the encryption configuration. You still need to configure:

- KMS provider / master key
- Data Encryption Key (DEK)
- schemaMap for CSFLE or
- encryptedFields for Queryable Encryption

The .dylib is the engine, while your configuration tells that engine what to encrypt and how.

# important doubt 4:
------------------------
the steps short here first i generate master key then dek when inside i will get cryptshared? then query?

The correct short flow is:

1. **Generate Master Key** → 96-byte local key.
2. **Create DEK** → DEK is generated and stored in `encryption.__keyVault`.
3. **Install/download `crypt_shared`** → `mongo_crypt_v1.dylib` is the encryption engine.
4. **Configure the MongoDB driver** → provide `kmsProviders`, DEK/schema or encrypted fields, and `cryptSharedLibPath`.
5. **Run queries** → the driver + `crypt_shared` automatically encrypt/decrypts data.
6. **For QE** → define supported query types like **equality** or **range** when creating the encrypted collection.

**Important:** You do **not** get `crypt_shared` when generating the Master Key or DEK. It is a **separate library** you install/download.

# another doubt:
-----------------------
why i need to create dek cant it create automatically if master key or vault is create?

No. **The Master Key does not automatically create a DEK.** They have different purposes.

```text
Master Key
    ↓ protects/wraps
DEK
    ↓ encrypts/decrypts
Your sensitive field
```

### Why do we create a DEK?

The **Master Key** is the root key. The **DEK** is the key actually used for field encryption.

When you run:

```js
await clientEncryption.createDataKey("local", {
  keyAltNames: ["my-data-key"]
});
```

MongoDB:

1. Generates a new DEK.
2. Uses the Master Key to protect/wrap that DEK.
3. Stores the encrypted DEK in `encryption.__keyVault`.

So:

```text
Master Key → protects DEK → DEK encrypts email
```

### Why not use the Master Key directly?

Because the architecture separates responsibilities:

* **Master Key** → protects encryption keys.
* **DEK** → encrypts application data.
* **Key Vault** → stores encrypted DEKs.

This allows you to have **multiple DEKs** for different collections or fields while using the same Master Key.

Also, **creating the Key Vault collection itself does not create a DEK**. The Key Vault is simply where the DEK is stored.

In your POC, the flow is:

**Master Key → Create DEK → Store DEK in `__keyVault` → Configure CSFLE/QE → Encrypt fields.**
