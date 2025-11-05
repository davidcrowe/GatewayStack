FROM node:22-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/admin-ui/package.json ./apps/admin-ui/
RUN npm ci

COPY apps/admin-ui ./apps/admin-ui
RUN npm run --workspace apps/admin-ui build

# Option 1: serve with a tiny Node server (static)
FROM node:22-slim
WORKDIR /srv
COPY --from=build /app/apps/admin-ui/dist ./dist
# Simple static server
RUN npm i -g serve
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
