FROM node:20

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libmongocrypt-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pre-install mongodb-client-encryption globally (with pre-built binary)
RUN npm install -g mongodb-client-encryption

CMD ["tail", "-f", "/dev/null"]