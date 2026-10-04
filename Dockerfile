# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (respecting lockfile and peer dependency compatibility)
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source code (excluding items specified in .dockerignore)
COPY . .

# Optional build-time arguments for frontend environment configuration
# Values should be passed via --build-arg, never hardcoded
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Set build environment for standalone Node.js production server
ENV NITRO_PRESET=node-server
ENV NODE_ENV=production

# Compile production application
RUN npm run build

# Stage 2: Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

# Define production environment settings
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy compiled standalone server and client public assets from builder
COPY --chown=node:node --from=builder /app/.output ./.output

# Use non-root node user for container security
USER node

# Expose production listening port
EXPOSE 3000

# Start production server
CMD ["node", ".output/server/index.mjs"]
