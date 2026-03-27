FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/lib/db ./src/lib/db
COPY --from=builder /app/scripts/create-superadmin.mjs ./scripts/create-superadmin.mjs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/create-superadmin.mjs && npm run start"]
