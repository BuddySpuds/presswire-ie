FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy API files
COPY api/ ./api/
COPY server.js ./

# Expose port
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]