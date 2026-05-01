# Use a slim Node base image so we can compile the Nest app without carrying a full distro.
FROM node:22-bookworm-slim AS builder

# Build everything from the monorepo root because Nest libraries are shared across apps.
WORKDIR /workspace

# Copy package manifests first so Docker can cache dependency installation between code changes.
COPY package*.json ./

# Install all dependencies needed to compile the TypeScript monorepo.
RUN npm ci

# Copy the rest of the monorepo once dependencies are cached.
COPY . .

# Build only the shared libraries and the device-monitoring app to keep the build focused.
RUN npx nest build common \
  && npx nest build database \
  && npx nest build device-monitoring

# Use a fresh slim runtime stage so the final image contains only runtime dependencies.
FROM node:22-bookworm-slim AS runner

# Set production mode so Nest and Node skip development-only behavior.
ENV NODE_ENV=production

# Run the service as an unprivileged user for a safer default container posture.
USER node

# Keep runtime files under the node user's home so we do not need root-owned writable paths.
WORKDIR /home/node/app

# Copy the package manifests so production installs are resolved against the same lockfile.
COPY --chown=node:node package*.json ./

# Install only production dependencies in the runtime image to keep it small.
RUN npm ci --omit=dev --ignore-scripts \
  && npm cache clean --force

# Copy the compiled app and shared library output that Nest needs at runtime.
COPY --from=builder --chown=node:node /workspace/dist ./dist

# Start the compiled Nest entrypoint for the device-monitoring service.
CMD ["node", "dist/apps/device-monitoring/main.js"]
