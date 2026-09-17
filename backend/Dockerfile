FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 3000
# Applies pending migrations and (idempotently, via upsert) the demo seed
# data on every start, then boots the API - convenient for a first/simple
# deployment (e.g. Render) with no separate migration step to run by hand.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed; node dist/main.js"]
