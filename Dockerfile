FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (leverage Docker layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose API port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start Station Master Node
CMD ["node", "src/server.js"]
