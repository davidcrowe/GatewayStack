FROM node:22-slim

WORKDIR /app

# copy workspace manifests
COPY package.json package-lock.json ./
COPY apps/gateway-server/package.json ./apps/gateway-server/
COPY tsconfig.json ./

# install deps for workspace
RUN npm ci

# copy sources
COPY packages ./packages
COPY apps/gateway-server ./apps/gateway-server

# build server
RUN npm run --workspace apps/gateway-server build

EXPOSE 8080
CMD ["npm", "run", "--workspace", "apps/gateway-server", "start"]
