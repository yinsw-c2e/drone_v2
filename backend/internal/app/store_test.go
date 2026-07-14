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

func TestValidateProductionStateRejectsDemoSeed(t *testing.T) {
	state := buildSeed()
	if err := validateProductionState(&state); err == nil {
		t.Fatal("expected production demo seed rejection")
	}
}

func TestReadyDataAllowsDemoSeedOnlyWithExplicitClosedBetaOption(t *testing.T) {
	state := buildSeed()
	strict := &Server{production: true}
	if err := strict.validateReadyData(&state); err == nil {
		t.Fatal("expected strict production readiness to reject demo seed")
	}
	demo := &Server{production: true, allowProductionDemoData: true}
	if err := demo.validateReadyData(&state); err != nil {
		t.Fatalf("explicit closed-beta mode should allow demo seed: %v", err)
	}
}

func TestBootstrapAdminStateCreatesExplicitAdministrator(t *testing.T) {
	state := DBShape{}
	user, err := bootstrapAdminState(&state, "13800138000")
	if err != nil {
		t.Fatalf("bootstrap admin: %v", err)
	}
	if user.Phone != "13800138000" || !roleProfileActive(&state, user.ID, RoleAdmin) {
		t.Fatalf("expected active administrator, got %#v", user)
	}
	if err := validateProductionState(&state); err != nil {
		t.Fatalf("bootstrapped state should pass production validation: %v", err)
	}
}

func TestBootstrapAdminStateRequiresUniqueExplicitBootstrap(t *testing.T) {
	state := DBShape{}
	if _, err := bootstrapAdminState(&state, "13800138000"); err != nil {
		t.Fatalf("first bootstrap: %v", err)
	}
	if _, err := bootstrapAdminState(&state, "13900139000"); err == nil {
		t.Fatal("expected second bootstrap to be rejected")
	}
}
