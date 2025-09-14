# Stage 1: Build stage
FROM node:22 AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Development stage
FROM node:22 AS development

# Set the working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Install global dependencies for development
RUN npm install -g @nestjs/cli

# Default command for development
CMD ["npm", "run", "start:dev"]

# Stage 3: Production stage (default)
FROM node:22 AS production

# Set the working directory
WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the environment file
#COPY .env ./

# copy the account abstraction secret
#COPY ./account-secrets.json ./

# Copy the build artifacts from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 3000

# Default command
CMD ["node", "dist/src/main"]
