# Development image. shortlist.stack.md names Docker Compose as the local
# development environment and Vite as the dev server, so this runs the dev
# server rather than building a bundle — S3 hosting is deliberately unbuilt.
FROM node:24-slim

RUN corepack enable

WORKDIR /app

# pnpm-workspace.yaml carries the one dependency allowed to run a build script.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev"]
