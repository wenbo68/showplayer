# Use official Node.js image
FROM node:20-slim

# used when you build the image (only if your env vars are needed at build time, which is the case due to env.js)
# these won't be included in the image
ARG AUTH_SECRET
ARG DATABASE_URL
ARG TMDB_API_KEY
ARG VPS_URL
ARG FRONTEND_URL
ARG INNGEST_EVENT_KEY
ARG INNGEST_SIGNING_KEY

# Install Chromium dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgbm1 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  wget \
  xdg-utils \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install deps
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy all project files
COPY . .

# Set environment variable for Puppeteer to find Chromium 
# don't use secret env vars here bc they are visible in the image on docker hub
# instead just inject the secret env vars via docker-compose (either hardcode env vars in docker-compose.yml or use .env file)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Build Next.js app
RUN pnpm build

# Let the container expose whatever port nextjs occupies (default is 3000)
EXPOSE 3000

# Run the built app
CMD ["pnpm", "start"]
