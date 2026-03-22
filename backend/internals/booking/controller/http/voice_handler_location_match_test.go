package http

import (
	"testing"

	locationDomain "backend/internals/location/domain"
)

func TestBuildLocationQueries_NormalizesBenXe(t *testing.T) {
	queries := buildLocationQueries("bến xe gia lâm")
	if len(queries) < 2 {
		t.Fatalf("expected at least 2 query variants, got %d", len(queries))
	}
}

func TestPickBestLocationMatch_NoiseAndAccentInsensitive(t *testing.T) {
	candidates := []*locationDomain.Location{
		{ID: 1, Name: "Bến xe Gia Lâm", City: "Hà Nội", Keywords: "gia lam"},
		{ID: 2, Name: "Bến xe Yên Nghĩa", City: "Hà Nội", Keywords: "yen nghia"},
	}

	best := pickBestLocationMatch("ben xe gia lam", candidates)
	if best == nil {
		t.Fatalf("expected a best match")
	}
	if best.ID != 1 {
		t.Fatalf("expected location id=1, got %d", best.ID)
	}
}

func TestPickBestLocationMatch_ReturnsNilOnWeakMatch(t *testing.T) {
	candidates := []*locationDomain.Location{
		{ID: 1, Name: "Bến xe Gia Lâm", City: "Hà Nội", Keywords: "gia lam"},
	}

	best := pickBestLocationMatch("sai gon center", candidates)
	if best != nil {
		t.Fatalf("expected nil for weak match, got id=%d", best.ID)
	}
}
