ARG PARENT_VERSION=3.1.1-node24.18.0
ARG PORT=3007
ARG PORT_DEBUG=9229

FROM defradigital/node-development:${PARENT_VERSION} AS development

ENV TZ="Europe/London"

ARG PORT
ARG PORT_DEBUG
ENV PORT=${PORT}
EXPOSE ${PORT} ${PORT_DEBUG}

COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run build:frontend

CMD [ "npm", "run", "dev" ]

FROM development AS production_build

ENV NODE_ENV=production

RUN npm run build:frontend

FROM defradigital/node:${PARENT_VERSION} AS production

ENV TZ="Europe/London"

# Add curl to template.
# CDP PLATFORM HEALTHCHECK REQUIREMENT
USER root
RUN apk add --no-cache curl

COPY --from=production_build --chown=root:root /home/node/package*.json ./
COPY --from=production_build --chown=root:root /home/node/src ./src/
COPY --from=production_build --chown=root:root /home/node/.public/ ./.public/

RUN npm ci --omit=dev

# Remove write permissions
RUN chmod -R a-w /home/node

USER node

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD [ "node", "src" ]
