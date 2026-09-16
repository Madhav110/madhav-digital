FROM alpine:latest

ARG PB_VERSION=0.40.4

RUN apk add --no-cache ca-certificates unzip wget

RUN wget -O /tmp/pocketbase.zip \
    https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip /tmp/pocketbase.zip -d /pb \
    && rm /tmp/pocketbase.zip

RUN mkdir -p /pb/pb_public

COPY index.html /pb/pb_public/index.html
COPY app.js /pb/pb_public/app.js
COPY app.css /pb/pb_public/app.css

COPY pb_migrations /pb/pb_migrations
COPY pb_migpb_hooks /pb/pb_hooks

EXPOSE 8080

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
