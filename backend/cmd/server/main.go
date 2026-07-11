package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"drone-v2-backend/internal/app"
)

func main() {
	dsn := getenv("MYSQL_DSN", "drone:drone@tcp(127.0.0.1:3308)/drone_v2?parseTime=true&charset=utf8mb4&loc=Local&multiStatements=true")
	port := getenv("PORT", "8088")
	production := isProductionRuntime()
	corsAllowOrigin := corsAllowOriginFromEnv(production)
	if err := validateRuntimeConfig(production, corsAllowOrigin); err != nil {
		log.Fatalf("invalid runtime configuration: %v", err)
	}

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
	if err := store.SeedIfEmpty(context.Background(), !production); err != nil {
		log.Fatalf("seed: %v", err)
	}

	server := app.NewServerWithOptions(store, app.ServerOptions{
		ResetEnabled:            getenvBool("ENABLE_RESET_ENDPOINT", !production),
		SnapshotWriteEnabled:    getenvBool("ENABLE_SNAPSHOT_WRITE_ENDPOINT", !production),
		CORSAllowOrigin:         corsAllowOrigin,
		RequirePaidPayment:      production,
		RequireProviderReceipts: production,
		Production:              production,
	})
	httpServer := &http.Server{
		Addr:              ":" + port,
		Handler:           server.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	shutdownCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-shutdownCtx.Done()
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(ctx); err != nil {
			log.Printf("graceful shutdown failed: %v", err)
		}
	}()
	log.Printf("drone_v2 backend listening on :%s", port)
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
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

func isProductionRuntime() bool {
	for _, key := range []string{"APP_ENV", "GO_ENV", "DRONE_ENV", "ENV", "NODE_ENV"} {
		value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
		if value == "prod" || value == "production" {
			return true
		}
	}
	return false
}

func corsAllowOriginFromEnv(production bool) string {
	value := strings.TrimSpace(os.Getenv("CORS_ALLOW_ORIGIN"))
	if value != "" {
		return value
	}
	if production {
		return ""
	}
	return "*"
}

func validateRuntimeConfig(production bool, corsAllowOrigin string) error {
	if !production {
		return nil
	}
	origin := strings.TrimSpace(corsAllowOrigin)
	if origin == "" {
		return errors.New("生产环境必须显式设置 CORS_ALLOW_ORIGIN 为 H5/admin 可信域名白名单")
	}
	if origin == "*" {
		return errors.New("生产环境禁止 CORS_ALLOW_ORIGIN=*")
	}
	for _, item := range strings.Split(origin, ",") {
		parsed, err := url.Parse(strings.TrimSpace(item))
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.Path != "" || parsed.RawQuery != "" || parsed.Fragment != "" || parsed.User != nil {
			return errors.New("生产环境 CORS_ALLOW_ORIGIN 必须是逗号分隔的 HTTPS origin，不能包含路径")
		}
	}
	if err := app.ValidateSMSProviderEnv(true); err != nil {
		return err
	}
	if strings.TrimSpace(os.Getenv("SMS_CODE_PEPPER")) == "" {
		return errors.New("生产环境必须设置 SMS_CODE_PEPPER")
	}
	if err := app.ValidateProviderBridgeEnv(true); err != nil {
		return err
	}
	return nil
}
