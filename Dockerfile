FROM node:24-alpine AS base

# Create app directory
WORKDIR /usr/src/app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci

# Copy application code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Use non-root node user for container security
USER node

CMD ["node", "main.js"]