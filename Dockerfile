FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Enable Corepack and prepare Yarn
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Optional: Verify Yarn is working
RUN yarn --version

# Copy package.json, package-lock.json, and yarn.lock to the working directory
COPY package.json yarn.lock ./

# Install the application dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN yarn build

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["sh", "-c", "${@}"]