FROM node:16.15.1-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn build

FROM node:16.15.1-alpine AS runner
WORKDIR /app
RUN mkdir /app/temp
RUN addgroup --system --gid 1001 webpconverter
RUN adduser --system --uid 1001 webpconverter
USER webpconverter
COPY --from=builder --chown=webpconverter:webpconverter /app/node_modules ./node_modules
COPY --from=builder --chown=webpconverter:webpconverter /app/dist ./dist
COPY --from=builder --chown=webpconverter:webpconverter /app/public ./public
CMD node dist/app 