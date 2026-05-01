# Use a slim Node base image so we can compile the Nest app and generate Prisma artifacts.
FROM node:22-bookworm-slim AS builder

# Build from the monorepo root because the app depends on shared libraries and Prisma schema files.
WORKDIR /workspace

# Copy package manifests first so dependency installation can be cached effectively.
COPY package*.json ./

# Install all dependencies required for TypeScript compilation and Prisma client generation.
RUN npm ci

# Copy the full monorepo after dependency installation is cached.
COPY . .

# Generate the Prisma client before building because the database library imports generated artifacts.
RUN npx prisma generate --schema libs/database/prisma/schema.prisma

# Build only the libraries and dashboard service needed for this image.
RUN npx nest build common \
  && npx nest build database \
  && npx nest build dashboard-service

# Use a second slim stage so the shipped image stays small and production-focused.
FROM node:22-bookworm-slim AS runner

# Mark the container as production so only runtime behavior is enabled.
ENV NODE_ENV=production

# Drop root privileges in the runtime container.
USER node

# Store the runtime app under the non-root user's home directory.
WORKDIR /home/node/app

# Copy manifests first so we can install just the production dependency tree.
COPY --chown=node:node package*.json ./

# Install only the packages needed at runtime and skip lifecycle scripts because Prisma artifacts are copied in.
RUN npm ci --omit=dev --ignore-scripts \
  && npm cache clean --force

# Copy the generated Prisma client because the compiled database library imports it from node_modules.
COPY --from=builder --chown=node:node /workspace/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /workspace/node_modules/@prisma ./node_modules/@prisma

# Copy the compiled Nest output for the app and shared libraries.
COPY --from=builder --chown=node:node /workspace/dist ./dist

# Start the compiled Nest entrypoint for the dashboard service.
CMD ["node", "dist/apps/dashboard-service/main.js"]
