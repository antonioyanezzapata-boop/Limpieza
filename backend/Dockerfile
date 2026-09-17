# Debian-based (not alpine): Prisma's engine binaries need glibc + a real
# OpenSSL install, and fail on Alpine's musl libc with a cryptic
# "Could not parse schema engine response" error unless extra compat
# packages are added. node:20-slim avoids that whole class of problem.
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 3000
# Applies pending migrations and (idempotently, via upsert) the demo seed
# data on every start, then boots the API - convenient for a first/simple
# deployment (e.g. Render) with no separate migration step to run by hand.
# Chained with && (not ;) so a real migration failure stops the container
# and shows up clearly as a failed deploy, instead of silently booting
# against an unmigrated database.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"]
