# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy package configuration files
COPY package*.json ./

# Install dependencies including devDependencies (needed to run build)
RUN npm ci --legacy-peer-deps

# Copy the rest of the frontend source files
COPY . .

# Build-time environment variables (Vite bakes these into the static files at build-time)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_SOCKET_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Execute the production build
RUN npm run build

# Stage 2: Serve the build static files using Nginx
FROM nginx:alpine

# Copy built files from the build stage to Nginx default document root
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# Copy custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
