# Use official Node.js image
FROM node:20-slim

# used when you build the image (only if your env vars are needed at build time, which is the case due to env.js)
# these won't be included in the image
ARG AUTH_SECRET
ARG AUTH_URL
ARG AUTH_TRUST_HOST
ARG AUTH_GOOGLE_ID
ARG AUTH_GOOGLE_SECRET
ARG CRON_SECRET
ARG DATABASE_URL
ARG TMDB_API_KEY
ARG VPS_URL
ARG BUNNY_URL
ARG FRONTEND_URL
ARG HEADLESS
ARG FIRST_CLICK
ARG LONG_CLICK
ARG MID_CLICK
ARG SHORT_CLICK
ARG M3U8_WAIT_JOY
ARG M3U8_WAIT_EASY
ARG M3U8_WAIT_LINK
ARG M3U8_WAIT_FAST

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

# may look redundant but package.json and pnpm-lock.yaml are copied 1st to a separate layer for caching reasons
# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# everything in project file (/showplayer) is copied to working dir (excluding files specified in .dockerignore)
# Copy all project files
COPY . .

# possibly redundant (unless tsconfig.scripts.json is in .dockerignore)
# Also copy the new tsconfig file for scripts
# COPY tsconfig.scripts.json ./

# Set environment variable for Puppeteer to find Chromium 
# don't use secret env vars here bc they are visible in the image on docker hub
# instead just inject the secret env vars via docker-compose (either hardcode env vars in docker-compose.yml or use .env file)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Build Next.js app && the cron script
RUN pnpm build
# RUN pnpm run build:scripts

# Let the container expose whatever port nextjs occupies (default is 3000)
EXPOSE 3000

# Run the built app
CMD ["pnpm", "start"]
