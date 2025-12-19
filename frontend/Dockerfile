FROM node:20-alpine

WORKDIR /app

# Install yarn if not available
RUN corepack enable && corepack prepare yarn@stable --activate

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy application code
COPY . .

# Expose port
EXPOSE 5173

# Run development server
CMD ["yarn", "dev", "--host", "0.0.0.0"]
