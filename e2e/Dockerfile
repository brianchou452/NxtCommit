FROM node:24.19.0-bookworm-slim AS node-runtime
FROM mcr.microsoft.com/playwright:v1.56.1-noble
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV npm_config_cache=/tmp/npm-cache
ENV VAR_DIR=/tmp/nxtcommit-state
ENV E2E_OUTPUT_DIRECTORY=/out
CMD ["./node_modules/.bin/playwright", "test", "--project=foundation"]
