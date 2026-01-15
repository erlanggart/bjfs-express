FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create upload directories
RUN mkdir -p uploads/avatars uploads/documents uploads/hero uploads/content uploads/articles uploads/matches uploads/proofs uploads/signatures

EXPOSE 3000

CMD ["npm", "start"]
