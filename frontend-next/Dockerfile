FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG CODESAGE_BACKEND_URL=http://backend:8000
ARG NEXT_PUBLIC_API_MODE=current
ENV CODESAGE_BACKEND_URL=$CODESAGE_BACKEND_URL
ENV NEXT_PUBLIC_API_MODE=$NEXT_PUBLIC_API_MODE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 codesage
COPY --from=builder --chown=codesage:nodejs /app/.next/standalone ./
COPY --from=builder --chown=codesage:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=codesage:nodejs /app/public ./public
USER codesage
EXPOSE 3000
CMD ["node", "server.js"]
