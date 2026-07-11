package app

import "testing"

func TestSeedForEmptyStoreRejectsProductionDemoSeed(t *testing.T) {
	state, err := seedForEmptyStore(false)
	if err == nil {
		t.Fatal("expected production empty database to require explicit bootstrap")
	}
	if state != nil {
		t.Fatal("production empty database must not receive demo data")
	}
}

func TestSeedForEmptyStoreAllowsDevelopmentDemoSeed(t *testing.T) {
	state, err := seedForEmptyStore(true)
	if err != nil {
		t.Fatalf("expected development seed, got %v", err)
	}
	if state == nil || len(state.Users) == 0 {
		t.Fatal("expected development demo users")
	}
}
