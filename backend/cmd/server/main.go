package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"drone-v2-backend/internal/app"
)

func main() {
	dsn := getenv("MYSQL_DSN", "drone:drone@tcp(127.0.0.1:3308)/drone_v2?parseTime=true&charset=utf8mb4&loc=Local&multiStatements=true")
	port := getenv("PORT", "8088")

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("open mysql: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	if err := waitForDB(ctx, db); err != nil {
		log.Fatalf("mysql not ready: %v", err)
	}

	store := app.NewStore(db)
	if err := store.EnsureSchema(context.Background()); err != nil {
		log.Fatalf("ensure schema: %v", err)
	}
	if err := store.SeedIfEmpty(context.Background()); err != nil {
		log.Fatalf("seed: %v", err)
	}

	server := app.NewServerWithOptions(store, app.ServerOptions{
		ResetEnabled:         getenvBool("ENABLE_RESET_ENDPOINT", true),
		SnapshotWriteEnabled: getenvBool("ENABLE_SNAPSHOT_WRITE_ENDPOINT", true),
		CORSAllowOrigin:      getenv("CORS_ALLOW_ORIGIN", "*"),
	})
	log.Printf("drone_v2 backend listening on :%s", port)
	if err := http.ListenAndServe(":"+port, server.Routes()); err != nil {
		log.Fatal(err)
	}
}

func waitForDB(ctx context.Context, db *sql.DB) error {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		if err := db.PingContext(ctx); err == nil {
			return nil
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}

func getenv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getenvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	switch value {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		log.Printf("invalid boolean %s=%q, using %t", key, value, fallback)
		return fallback
	}
}
