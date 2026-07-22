# Use the official Node.js 20 LTS lightweight image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install project dependencies
# RUN npm ci --only=production
RUN npm ci

# Copy the rest of your application code
COPY . .

# Start the bot
CMD ["node", "main.js"]