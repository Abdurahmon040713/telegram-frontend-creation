# ChatSphere Frontend — Next.js standalone production image
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build vaqtida minimal placeholder — runtime'da compose env ustun keladi
ARG BACKEND_URL=http://backend:8000
ARG JWT_SECRET_KEY=0000000000000000000000000000000000000000000000000000000000000000
ENV BACKEND_URL=$BACKEND_URL JWT_SECRET_KEY=$JWT_SECRET_KEY

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
