FROM node:24.19.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY shared ./shared
COPY server ./server
COPY spec/assets ./spec/assets
RUN npm run build && npm prune --omit=dev --ignore-scripts

FROM node:24.19.0-bookworm-slim
WORKDIR /app
ARG COMMIT_SHA=local
ARG GITHUB_RUN_URL=local
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 VAR_DIR=/tmp/nxtcommit-state EXECUTION_MODE=demo
ENV COMMIT_SHA=$COMMIT_SHA GITHUB_RUN_URL=$GITHUB_RUN_URL
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY deploy/node/entry.mjs ./entry.mjs
COPY deploy/node/openai-check.mjs ./openai-check.mjs
COPY deploy/shutdown-policy.mjs ./shutdown-policy.mjs
USER node
EXPOSE 8080
CMD ["node", "entry.mjs"]
