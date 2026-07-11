FROM golang:1.26.5-alpine3.23 AS build

WORKDIR /app
ENV GOPROXY=https://goproxy.cn,direct
ENV GOSUMDB=sum.golang.google.cn
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM alpine:3.23

RUN addgroup -S app && adduser -S -D -H -u 10001 -G app app
COPY --from=build --chown=app:app /server /server
USER app
EXPOSE 8088
CMD ["/server"]
