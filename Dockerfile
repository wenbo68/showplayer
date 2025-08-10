# Use official Node.js image
FROM node:20-slim

# ==> Add these ARG declarations at the top
ARG AUTH_SECRET
ARG DATABASE_URL
ARG TMDB_API_KEY

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

# ==> Add these ENV declarations before your build command
ENV AUTH_SECRET=$AUTH_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV TMDB_API_KEY=$TMDB_API_KEY

# Set environment variable for Puppeteer to find Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Build Next.js app
RUN pnpm build

# Expose port and run
EXPOSE 3000

CMD ["pnpm", "start"]
