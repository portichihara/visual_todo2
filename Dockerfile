FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY . .

RUN apk add --no-cache git netcat-openbsd
RUN go mod tidy
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o app

FROM alpine:latest

RUN apk add --no-cache netcat-openbsd

WORKDIR /app
COPY --from=builder /app/app .
COPY templates/ templates/
COPY static/ static/
COPY entrypoint.sh .

RUN chmod +x entrypoint.sh

EXPOSE 8080
CMD ["./entrypoint.sh"]