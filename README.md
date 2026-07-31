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

**Master Key 🔑 → unlocks DEK 🔐 → DEK encrypts/decrypts Data 📄** here unlock means?
------------------------------------------------------------------------------------
------------------------------------------------------------------------------------
Here, **"unlock" means the Master Key is used to decrypt (unwrap) the DEK**.

Think of it like this:

```text
Master Key 🔑
     │
     │ unwrap / decrypt
     ▼
Encrypted DEK 🔐
     │
     ▼
DEK 🔑
     │
     │ encrypt / decrypt
     ▼
Your Data 📄
```

### Simple real-world example

Imagine:

* **Master Key** = Big key 🔑
* **DEK** = Small key 🔐
* **Data** = Locked box 📦

The small key (DEK) is itself kept inside a **locked container** in the Key Vault.

```text
Key Vault
┌──────────────────────┐
│ Encrypted DEK 🔐     │
└──────────────────────┘
          ▲
          │ Master Key
          │ unlocks/unwraps
          ▼
       DEK 🔑
          │
          ▼
   Encrypts/Decrypts
          │
          ▼
       Data 📄
```

So when we say:

> **Master Key unlocks the DEK**

we mean:

> The Master Key **decrypts (unwraps) the encrypted DEK**, making the DEK available to the encryption system.

### Important distinction

The Master Key **does not unlock your actual data**.

```text
❌ Master Key → Data

✅ Master Key → Encrypted DEK → DEK → Data
```

The **DEK** is the key that actually encrypts and decrypts your data. The **Master Key protects the DEK**.

------------------------------------------------------------------------------------
------------------------------------------------------------------------------------

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

# is queryable encryption does not need dek creation?:
------------->>>>>>>>>>>>>>>>>>>>>>>-----------------
=====================================================
No — **Queryable Encryption (QE) also needs a DEK**.

The difference is mainly **how the encryption keys and encrypted fields are managed**.

### Simple flow

**CSFLE:**

```text
Master Key
    ↓ protects
DEK
    ↓ encrypts
Field Data
```

**Queryable Encryption:**

```text
Master Key
    ↓ protects
DEK
    ↓ used by QE encryption system
Encrypted Field + Queryable Encryption Metadata
```

In QE, you typically use MongoDB's **`ClientEncryption.createEncryptedCollection()`** helper. It can **automatically generate the DEK(s)** and create the encrypted collection metadata for you.

So:

> **QE needs DEKs, but you may not have to manually create them yourself.**

That's probably why it looked like QE doesn't need DEK creation.

### In your POC

With **CSFLE**, you were explicitly doing something like:

```javascript
const dataKey = await clientEncryption.createDataKey(...)
```

With **QE**, you can do:

```javascript
await clientEncryption.createEncryptedCollection(...)
```

and MongoDB's QE setup handles the required DEK generation and encrypted-fields configuration.

**Bottom line:**
**CSFLE → DEK is often manually created.**
**QE → DEK is still required, but the QE helper can create/manage it as part of encrypted collection creation.**


# clientEncryption.createEncryptedCollection & const dataKey = await clientEncryption.createDataKey
---------------------------------------------------------------------------------------------------
if we use this in both we dont need to create manual?
------------------------------------------------------
Yes — **but you need to distinguish CSFLE and QE**.

### CSFLE

If you use:

```javascript
const dataKey = await clientEncryption.createDataKey("local", {
  keyAltNames: ["my-data-key"]
});
```

then you are **creating the DEK manually**.

You need this because your CSFLE `schemaMap` typically references that DEK.

```text
Master Key
    ↓
createDataKey()
    ↓
DEK
    ↓
Key Vault
    ↓
CSFLE Schema Map
    ↓
Encrypted Collection
```

---

### Queryable Encryption (QE)

If you use:

```javascript
await clientEncryption.createEncryptedCollection(
  db,
  "users",
  {
    provider: "local",
    createCollectionOptions: {
      encryptedFields: encryptedFieldsMap
    },
    masterKey: {}
  }
);
```

then **you don't need to manually call `createDataKey()` first**.

The `createEncryptedCollection()` helper handles the QE key creation/setup for you.

```text
Master Key
    ↓
createEncryptedCollection()
    ↓
QE creates required DEK/key material
    ↓
Key Vault
    ↓
QE Collection
```

### So the short answer:

|           | `createDataKey()` manually      | `createEncryptedCollection()` |
| --------- | ------------------------------- | ----------------------------- |
| **CSFLE** | ✅ Usually required              | ❌ Not the normal CSFLE setup  |
| **QE**    | ❌ Not necessary if using helper | ✅ Handles QE key setup        |

**Your QE code should generally not have this extra step:**

```javascript
const dek = await encryption.createDataKey("local", {
  keyAltNames: ["qe-data-key"]
});
```

if you're immediately using `createEncryptedCollection()` with `masterKey: {}`.

So for your POC, you can remove the **manual QE `createDataKey()` step** and let `createEncryptedCollection()` handle it.

# here in qe is the date type based fields have to have unique dek like string age number field? is dek seperate if yes then u said previous order colleaction have one and user colleaction ahve one u said like this:
-----------------------------------------------------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------
Yes — **this is where your previous mental model needs correction**.

For **Queryable Encryption**, you should **not assume that every field or every BSON data type needs a separate DEK**.

Let's make it precise.

### Your example

Suppose you have:

```text
users
├── email     → string
└── age       → int

orders
├── orderId   → string
└── amount    → double
```

You might think:

```text
email  → DEK 1
age    → DEK 2
orderId → DEK 3
amount → DEK 4
```

**No. That's not the correct rule.**

The key question is **how the encrypted collection is configured**, not simply the field's data type.

---

### With QE's `createEncryptedCollection()`

You define your encrypted fields:

```javascript
const encryptedFields = {
  fields: [
    {
      path: "email",
      bsonType: "string",
      queries: [
        { queryType: "equality" }
      ]
    },
    {
      path: "age",
      bsonType: "int",
      queries: [
        { queryType: "range" }
      ]
    }
  ]
};
```

Then:

```javascript
await clientEncryption.createEncryptedCollection(
  db,
  "users",
  {
    provider: "local",
    createCollectionOptions: {
      encryptedFields
    },
    masterKey: {}
  }
);
```

The QE helper manages the required key material.

So conceptually:

```text
Master Key
     │
     ▼
QE key management
     │
     ▼
Key Vault
     │
     ▼
users collection
   ├── email (string, equality)
   └── age (int, range)
```

You don't need to think:

> "String = one DEK, Int = another DEK."

That's **not how you should model it**.

---

### What about `users` and `orders`?

If you have:

```text
users collection
   ├── email
   └── age

orders collection
   ├── orderId
   └── amount
```

each encrypted collection is configured independently:

```text
Master Key
     │
     ├───────────────┐
     │               │
     ▼               ▼
users QE setup    orders QE setup
     │               │
     ▼               ▼
Key Vault         Key Vault
```

The **same Key Vault collection** can store key material for multiple encrypted collections.

So **don't think**:

> "One collection = exactly one DEK."

That's also too simplistic.

The actual QE key structure can involve **multiple internal data keys/key material** depending on the encrypted fields and queryable encryption configuration.

### The safe mental model

```text
Master Key
     │
     │ protects
     ▼
DEKs / QE key material
     │
     │ stored encrypted in
     ▼
One shared Key Vault collection
     │
     ├── users QE collection
     │      ├── email
     │      └── age
     │
     └── orders QE collection
            ├── orderId
            └── amount
```

### The key correction to what I told you earlier

I previously simplified it as:

> `users` → one DEK
> `orders` → one DEK

That was **too simplistic and potentially misleading**.

The correct concept is:

> **The Key Vault is shared, and QE manages the encryption key material needed by your encrypted collections. You should not infer the number of DEKs simply from the number of collections or BSON data types.**

And **string vs number does not automatically mean separate DEKs**. The `bsonType` tells QE **what type of data is being encrypted and how the field's query capability is configured**; it does not by itself define "one DEK per data type."


# how mongodb wokring with quryable how random working how here csfle and queryable supporting random say the difference:
--------------------------------------------------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------------------------------------------------
Yes. This is the **exact distinction you need to understand** between **CSFLE** and **Queryable Encryption (QE)**.

The word **"random"** is causing the confusion because **both CSFLE and QE can use randomized encryption**, but **they do not provide the same query capabilities**.

---

# 1. First: What does randomized encryption mean?

Suppose you have:

```text
email = "keerthana@gmail.com"
```

With **randomized encryption**, encrypting the same value multiple times can produce different ciphertexts:

```text
"keerthana@gmail.com"
       │
       ├── Encrypt → X7A91...
       ├── Encrypt → P8B42...
       └── Encrypt → Z3K19...
```

So:

```text
Same plaintext
      ↓
Different ciphertext
```

This is good for privacy because someone looking at your database cannot easily identify that the same encrypted value appears multiple times.

---

# 2. CSFLE randomized encryption

In CSFLE, you can configure a field as:

```text
email
  ↓
Random Encryption
```

The data is encrypted randomly.

For example:

```text
Document 1
email → X7A91...

Document 2
email → P8B42...

Document 3
email → Z3K19...
```

Now suppose you run:

```javascript
db.users.find({
  email: "keerthana@gmail.com"
});
```

The problem is:

```text
Query value
"keerthana@gmail.com"
       ↓
Random encryption
       ↓
Maybe ABC123...
```

But the database contains:

```text
X7A91...
P8B42...
Z3K19...
```

There is no single ciphertext that MongoDB can compare against.

Therefore:

> **CSFLE randomized encryption does not support querying the encrypted field.**

You can encrypt and decrypt it, but you can't use normal equality queries on that randomized encrypted field.

---

# 3. CSFLE deterministic encryption

CSFLE also supports **deterministic encryption**.

Now:

```text
"keerthana@gmail.com"
       ↓
Deterministic encryption
       ↓
ABC123
```

Every time the same plaintext is encrypted:

```text
"keerthana@gmail.com" → ABC123
"keerthana@gmail.com" → ABC123
"keerthana@gmail.com" → ABC123
```

Now MongoDB can do:

```text
Query:
"keerthana@gmail.com"
       ↓
Encrypt deterministically
       ↓
ABC123
       ↓
Search database
       ↓
ABC123 → Match
```

So:

> **CSFLE deterministic encryption supports equality queries.**

But the downside is:

```text
Same plaintext
     ↓
Same ciphertext
```

An attacker who can see the database can notice that multiple records have the same ciphertext.

This reveals **equality patterns**.

---

# 4. Queryable Encryption

Now we come to QE.

QE uses **randomized encryption** for the actual encrypted data.

So you might have:

```text
"keerthana@gmail.com"
       ↓
Randomized encryption
       ↓
X7A91...

"keerthana@gmail.com"
       ↓
Randomized encryption
       ↓
P8B42...
```

The ciphertexts are different.

But QE adds **special queryable encryption mechanisms** that allow supported queries.

Conceptually:

```text
                QE
                 │
       ┌─────────┴─────────┐
       │                   │
       ▼                   ▼
Randomized Encryption   Queryable Structure
       │                   │
       ▼                   ▼
Protects Data          Enables Queries
```

When you query:

```javascript
db.users.find({
  email: "keerthana@gmail.com"
});
```

The MongoDB driver handles the query encryption process.

Conceptually:

```text
Application
    │
    │ email = "keerthana@gmail.com"
    ▼
MongoDB Driver
    │
    ├── Encrypts query
    ├── Generates query information
    │
    ▼
MongoDB Server
    │
    ▼
Searches encrypted query structure
    │
    ▼
Returns encrypted document
    │
    ▼
Driver decrypts
    │
    ▼
Application gets plaintext
```

The MongoDB server doesn't need the plaintext email.

---

# 5. The biggest difference

Here is the important comparison:

| Feature                                            | CSFLE Deterministic | CSFLE Randomized | Queryable Encryption |
| -------------------------------------------------- | ------------------- | ---------------- | -------------------- |
| Encrypts data                                      | ✅                   | ✅                | ✅                    |
| Same plaintext → same ciphertext                   | ✅                   | ❌                | ❌                    |
| Equality queries                                   | ✅                   | ❌                | ✅                    |
| Range queries                                      | ❌                   | ❌                | ✅*                   |
| Better protection against equality-pattern leakage | ❌                   | ✅                | ✅                    |
| Queryable encrypted fields                         | Limited             | ❌                | ✅                    |

`*` QE supports range queries when the field is configured for the supported range query type and version/configuration requirements are met.

---

# 6. The easiest way to remember

### CSFLE Randomized

```text
Data
 ↓
Random encryption
 ↓
Different ciphertext every time
 ↓
Strong privacy
 ↓
❌ Can't query normally
```

### CSFLE Deterministic

```text
Data
 ↓
Deterministic encryption
 ↓
Same plaintext = Same ciphertext
 ↓
✅ Equality query
 ↓
⚠️ Equality patterns can leak
```

### Queryable Encryption

```text
Data
 ↓
Randomized encryption
 +
Queryable encryption structures
 ↓
Different ciphertexts
 +
Query capability
 ↓
✅ Supported queries
```

---

# 7. Your POC

When you wrote:

```javascript
{
  path: "email",
  bsonType: "string",
  queries: [
    {
      queryType: "equality"
    }
  ]
}
```

you were telling QE:

> "I want this field to remain encrypted, but I also want to support equality queries on it."

QE then handles the cryptographic machinery needed to make that possible.

So your final mental model should be:

```text
                    MongoDB Encryption
                           │
             ┌─────────────┴─────────────┐
             │                           │
           CSFLE                         QE
             │                           │
      ┌──────┴──────┐             Randomized encryption
      │             │                      +
 Deterministic   Randomized          Queryable structures
      │             │                      │
      ▼             ▼                      ▼
 Equality        Encrypt only       Supported queries
 queries         No query            Equality / Range*
```

### The one sentence you should remember:

> **CSFLE randomized encryption gives you strong encryption but doesn't allow querying; CSFLE deterministic encryption allows equality queries by producing the same ciphertext for the same value; QE uses randomized encryption plus special queryable encryption mechanisms so you can query encrypted data without relying on deterministic ciphertext.**

-----------------------------------------------------------------------------------------------------------------------------

# Depth of QE:
Yes. Let's understand **how MongoDB Queryable Encryption (QE) works internally**, especially **how random encryption still allows queries**.

The confusing part is:

> If the same value is encrypted randomly every time, how can MongoDB search for it?

That's exactly what QE solves.

---

## 1. Normal encryption

Suppose you have:

```text
email = "keerthana@gmail.com"
```

With normal encryption, you might get:

```text
keerthana@gmail.com
        ↓
    Encrypt
        ↓
X7A91B2C...
```

If you encrypt the same value again:

```text
keerthana@gmail.com
        ↓
    Encrypt
        ↓
P9K21XYZ...
```

Because of **randomized encryption**, the ciphertext is different.

So MongoDB cannot simply do:

```text
Find ciphertext = X7A91B2C
```

because the same plaintext might have a different ciphertext.

---

# 2. What Queryable Encryption does

QE adds a special **queryable encryption structure**.

Think:

```text
User Application
      │
      │ Query:
      │ email = "keerthana@gmail.com"
      ▼
MongoDB Driver
      │
      │ Encrypts query
      ▼
MongoDB Server
      │
      │ Searches encrypted queryable structure
      ▼
Encrypted Collection
```

The application/driver knows the encryption keys.

The MongoDB server **does not get the plaintext email**.

---

# 3. What happens when you INSERT

You insert:

```javascript
{
  email: "keerthana@gmail.com",
  age: 25
}
```

The driver automatically encrypts the configured fields.

Conceptually, MongoDB stores something like:

```text
email
  ↓
Randomized encryption
  ↓
Encrypted ciphertext
  +
Queryable encryption metadata
```

The actual storage is more complex than just:

```text
email: encrypted-value
```

QE creates additional internal structures that allow MongoDB to determine which encrypted records match a query.

---

# 4. What happens when you SEARCH

You run:

```javascript
db.users.find({
  email: "keerthana@gmail.com"
});
```

Your application sends the query through the MongoDB driver.

The driver does something conceptually like:

```text
"keerthana@gmail.com"
        │
        ▼
Encrypt query
        │
        ▼
Generate query tokens
        │
        ▼
Send encrypted query
        │
        ▼
MongoDB
        │
        ▼
Search encrypted queryable structure
        │
        ▼
Find matching encrypted document
        │
        ▼
Return encrypted document
        │
        ▼
Driver decrypts
        │
        ▼
Application sees:
email = "keerthana@gmail.com"
```

The MongoDB server never needs to see:

```text
"keerthana@gmail.com"
```

in plaintext.

---

# 5. What are Query Tokens?

This is the important part.

QE uses cryptographic structures often described as **query tokens**.

Conceptually:

```text
Plaintext
"keerthana@gmail.com"
       │
       ▼
Cryptographic processing
       │
       ├── Query token
       ├── Encrypted value
       └── Metadata
```

When you search:

```text
email = "keerthana@gmail.com"
```

the driver generates the appropriate query information.

MongoDB uses that information to find the matching encrypted data.

So even though the actual encrypted value is randomized, QE has a separate mechanism that makes the query possible.

---

# 6. Why random encryption is useful

Suppose you had deterministic encryption:

```text
"keerthana@gmail.com"
        ↓
ABC123
```

Every time the same email appears:

```text
"keerthana@gmail.com" → ABC123
```

An attacker who can see the database can notice:

```text
ABC123
ABC123
ABC123
```

and know that those records have the same plaintext value.

This leaks **equality patterns**.

With randomized encryption:

```text
"keerthana@gmail.com" → X1A9...
"keerthana@gmail.com" → P8K2...
"keerthana@gmail.com" → Z7Q4...
```

The ciphertexts are different.

This gives stronger protection against pattern analysis.

QE then uses its additional cryptographic query structures to still support queries.

---

# 7. Simple picture

Think of QE as having **two things**:

```text
              Queryable Encryption
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   Randomized Encryption     Query Structures
          │                       │
          ▼                       ▼
   Protect actual data       Enable queries
```

So:

> **Randomized encryption protects the data from revealing repeated values.**

> **Queryable structures allow MongoDB to search without decrypting the data.**

---

# 8. Your QE example

You configured:

```javascript
{
  path: "email",
  bsonType: "string",
  queries: [
    {
      queryType: "equality"
    }
  ]
}
```

This means:

```text
email
  │
  ▼
Randomized encrypted value
  +
Queryable encryption metadata
  │
  ▼
Equality query supported
```

Then:

```javascript
db.users.find({
  email: "keerthana@gmail.com"
});
```

The driver automatically handles the encryption/query preparation.

You don't manually do:

```javascript
encrypt("keerthana@gmail.com")
```

and you don't manually search ciphertext.

---

### The simplest way to remember it

```text
Normal encryption
    ↓
Encrypt data
    ↓
Cannot easily query


Deterministic encryption
    ↓
Same plaintext → Same ciphertext
    ↓
Equality queries possible
    ↓
But leaks equality patterns


Queryable Encryption
    ↓
Randomized encryption
    +
Special queryable cryptographic structures
    ↓
Query encrypted data
    ↓
Better privacy
```

So **QE is not "random encryption alone."** It is **randomized encryption + special cryptographic mechanisms that let the driver and MongoDB perform supported queries without exposing the plaintext data to the server**.

-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------


# safecontant fields? used to find the random encrypted filter? if its sperate concept how here in QE mongo db finds the result of random? why not csle why here random algorithm fails say the correct sententce shortly?
-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------
your confusion is about **how QE finds a match when the actual ciphertext is randomized**.

The correct short explanation is:

> **QE does not search the randomized ciphertext directly.** The MongoDB driver generates **query tokens** from the query value, and QE's encrypted queryable metadata/structures use those tokens to locate the matching encrypted documents. The actual encrypted value remains randomized.

Query: "keerthana@gmail.com"                                                                                -->*important notes*
        │
        ▼
*Driver generates query tokens*
        │
        ▼
QE queryable structure *uses tokens*
        │
        ▼
Find matching encrypted document
        │
        ▼
Randomized ciphertext is returned
        │
        ▼
Driver decrypts it

### Why CSFLE randomized fails?

> **CSFLE randomized encryption has no queryable token/index structure that lets MongoDB match the plaintext query against different randomized ciphertexts.**

### About `__safeContent__`

Yes, **`__safeContent__` is part of QE's internal queryable encryption mechanism**, but don't think of it as simply "metadata that decrypts or identifies the random ciphertext." *It helps support the encrypted query process and query matching*.

So the key difference is:

```text
CSFLE Randomized
Random ciphertext
+
No QE query-token mechanism
→ Cannot equality-query

QE
Random ciphertext
+
Query tokens + queryable encryption structures
→ Can perform supported queries
```

**One sentence to remember:**                                                                               -->*important notes*
------------------------------
> **QE can query randomized encrypted data because it uses a separate cryptographic query mechanism (query tokens and queryable structures); CSFLE randomized encryption doesn't have that mechanism, so the random ciphertext cannot be directly matched.**

-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------

# but u said before 
*Driver generates query tokens*
        │
        ▼
QE queryable structure *uses tokens*
now you saying MongoDB uses those tokens with its QE queryable structures why u teaching me with full of confusion!!!!!
-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------

### So, who does what?

| Component                         | Job                                                              |
| --------------------------------- | ---------------------------------------------------------------- |
| **MongoDB Driver + crypt_shared** | Generates the QE query tokens                                    |
| **MongoDB Server**                | Receives the QE query and tokens                                 |
| **QE queryable structures**       | Are the encrypted structures MongoDB searches using those tokens |
| **MongoDB Server**                | Performs the actual search/matching                              |
| **Driver**                        | Decrypts the returned encrypted data                             |

So these two statements are **both true**, but they describe different steps:

> **Driver generates query tokens.** ✅

> **MongoDB uses those tokens to search the QE queryable structures.** ✅

What I should **not** have said is: **********------------------------*********wrong statement*******-----------------------*********

> "QE queryable structure uses tokens"

because that makes it sound like the structure itself is actively processing the token. The more accurate statement is:

> **The MongoDB server uses the query tokens to search the QE queryable structures.**

### Your exact POC:
--------------------
aggregate()
    │
    ▼
Node.js MongoDB Driver
    │
    ▼
crypt_shared
    │
    ├── *Reads QE configuration*
    ├── *Uses encryption keys*
    └── *Generates query tokens*
    │
    ▼
Encrypted QE query sent to MongoDB
    │
    ▼
MongoDB Server
    │
    ▼
Uses tokens to search QE queryable structures
    │
    ▼
Matching encrypted documents
    │
    ▼
Driver decrypts result
    │
    ▼
Your application

**The key to remember:**

1. You search: "John"
         ↓
2. Driver gets "John"
         ↓
3. Driver asks crypt_shared: "Make tokens from 'John'"
         ↓
4. crypt_shared uses key from Key Vault → CREATES TOKENS
         ↓
5. Driver sends these tokens to MongoDB
         ↓
6. MongoDB ONLY uses these tokens to SEARCH (does NOT create anything)
         ↓
7. MongoDB finds matches and sends encrypted data back to Driver
         ↓
8. Driver asks crypt_shared: "Decrypt this"
         ↓
9. crypt_shared decrypts using key from Key Vault
         ↓
10. You see: "John"

## SIMPLE ROLES:
* Who	What they do:-
- crypt_shared	CREATES tokens from your search word
- MongoDB	USES those tokens to search (like matching fingerprints)
- Driver	Transports everything back and forth

### Summary:
- Token Creation = crypt_shared (ALWAYS)
- Token Usage/Search = MongoDB (ONLY)
- Decryption = crypt_shared (ALWAYS)

-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------

# what is mongo db driver and wired tiger & why?
-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------

```text id="2yqf4w"
Your Node.js Application
        │
        │ MongoDB Driver
        ▼
MongoDB Server
        │
        │
        ▼
WiredTiger Storage Engine
        │
        ▼
Disk
```

## 1. MongoDB Driver

The **MongoDB Driver** is the library that allows your application to communicate with MongoDB.

Since you're using Node.js:

```bash
npm install mongodb
```

Then:

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(uri);

await client.connect();

const db = client.db("mydb");

const users = db.collection("users");

await users.findOne({
  email: "keerthana@gmail.com"
});
```

Your Node.js application cannot directly communicate with MongoDB by itself.

The **MongoDB Node.js Driver** acts as the communication layer.

```text id="0y10y8"
Node.js Application
       │
       │ MongoDB Node.js Driver
       ▼
MongoDB Server
```

### In your Queryable Encryption POC

The driver is **very important**.

You write:

```javascript
db.users.find({
  email: "keerthana@gmail.com"
});
```

The driver can handle the client-side QE encryption/query processing before sending the request to MongoDB.

Conceptually:

```text id="7w7q88"
Your Application
       │
       │ Plaintext query
       ▼
MongoDB Driver
       │
       │ Encryption + query processing
       ▼
MongoDB Server
```

That's why the **driver is part of the Queryable Encryption architecture**.

---

# 2. WiredTiger

**WiredTiger is MongoDB's storage engine.**

It works **inside the MongoDB server**.

Its job is to manage how MongoDB stores and manages data on disk and in memory.

Think:

```text id="b0ksr6"
MongoDB Server
      │
      └── WiredTiger
            │
            ├── Data storage
            ├── Indexes
            ├── Cache
            ├── Transactions
            └── Concurrency
```

For example, when you insert:

```javascript
db.users.insertOne({
  name: "Keerthana"
});
```

The flow is roughly:

```text id="w9c7fv"
Node.js Application
       │
       ▼
MongoDB Driver
       │
       ▼
MongoDB Server
       │
       ▼
WiredTiger
       │
       ▼
Storage / Disk
```

WiredTiger handles the **storage side**.

---

### Very simple example

Imagine a library:

```text id="8f6d6a"
You
 │
 │ Ask librarian for a book
 ▼
MongoDB Driver
 │
 │ Communicates with library
 ▼
MongoDB Server
 │
 ▼
WiredTiger
 │
 │ Finds/manages stored books
 ▼
Data
```

So remember:

> **MongoDB Driver = communication between your application and MongoDB.**

> **WiredTiger = storage engine inside MongoDB that manages how data is stored and accessed.**

-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------

# timeseries using that wiredtiger?
-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------
Yes. **MongoDB Time Series collections use WiredTiger underneath**.

The architecture is roughly:

```text
Your Application
      │
      ▼
MongoDB Driver
      │
      ▼
MongoDB Server
      │
      ▼
Time Series Collection
      │
      ▼
MongoDB Time Series Internal Storage
      │
      ▼
WiredTiger Storage Engine
      │
      ▼
Disk
```

### Example

You create a time-series collection:

```javascript
db.createCollection("weather", {
  timeseries: {
    timeField: "timestamp",
    metaField: "sensorId"
  }
})
```

Insert data:

```javascript
db.weather.insertOne({
  timestamp: new Date(),
  sensorId: "sensor-01",
  temperature: 30
})
```

MongoDB's **Time Series feature** organizes the time-series data efficiently, while **WiredTiger** is the underlying storage engine that stores and manages the data.

### Simple distinction

```text
Time Series
→ MongoDB data model / feature
→ Organizes time-based measurements efficiently

WiredTiger
→ Storage engine
→ Handles storage, indexes, cache, transactions, etc.
```

> **Time Series decides how time-series data is organized and optimized; WiredTiger handles the underlying storage.**
-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------


-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------


-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------
