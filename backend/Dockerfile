# [auto] Backend Node.js Dockerfile
# Use Node.js 20 Alpine image for security and small footprint
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install production-only dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy the rest of the application files
COPY . .

# Expose backend port
EXPOSE 5000

# Define environmental variable defaults
ENV NODE_ENV=production
ENV PORT=5000

# Start the application using node directly to handle SIGTERM/SIGINT signals properly
CMD ["node", "server.js"]
