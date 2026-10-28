# Development image. shortlist.stack.md names Docker Compose as the local
# development environment and Vite as the dev server, so this runs the dev
# server rather than building a bundle — S3 hosting is deliberately unbuilt.
FROM node:24-slim

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# pnpm refuses to run a dependency's build script it was not told about, and
# keeping that refusal is the point. esbuild is the one exception: its install
# script puts a prebuilt binary in place.
RUN pnpm install --frozen-lockfile --allow-build=esbuild

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev"]
