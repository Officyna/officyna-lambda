# ----------------------------------------------------
# Stage 1: Build & Dependencies
# ----------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
COPY certs/ ./certs/

RUN npm run build

# ----------------------------------------------------
# Stage 2: Runtime image (compatible with AWS Lambda Runtime Interface Client or standalone)
# ----------------------------------------------------
FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=builder /usr/src/app/dist/index.js ./index.js
COPY --from=builder /usr/src/app/certs/global-bundle.pem ./certs/global-bundle.pem

CMD ["index.handler"]
