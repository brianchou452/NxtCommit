FROM node:24.19.0-bookworm-slim AS node-runtime
FROM mcr.microsoft.com/playwright:v1.56.1-noble
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY shared ./shared
COPY server ./server
COPY spec/assets ./spec/assets
RUN npm run build
# Browser tests and goldens do not invalidate application compilation.
COPY playwright.config.ts ./
COPY e2e ./e2e
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV npm_config_cache=/tmp/npm-cache
ENV VAR_DIR=/tmp/nxtcommit-state
ENV E2E_OUTPUT_DIRECTORY=/out
CMD ["./node_modules/.bin/playwright", "test", "--project=foundation"]

# Full CI checks run in this same pinned Node/browser environment.
COPY scripts ./scripts
COPY Makefile pyproject.toml ./
COPY docs/CHANGELOG.md docs/CHANGELOG.zh-TW.md ./docs/
COPY k8s/overlays/nonprod/kustomization.yaml ./k8s/overlays/nonprod/kustomization.yaml
