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

	best := pickTopLocationMatches("ben xe gia lam", candidates, 4)
	if len(best) == 0 {
		t.Fatalf("expected a best match")
	}
	if best[0].ID != 1 {
		t.Fatalf("expected location id=1, got %d", best[0].ID)
	}
}

func TestPickBestLocationMatch_ReturnsNilOnWeakMatch(t *testing.T) {
	candidates := []*locationDomain.Location{
		{ID: 1, Name: "Bến xe Gia Lâm", City: "Hà Nội", Keywords: "gia lam"},
	}

	best := pickTopLocationMatches("sai gon center", candidates, 4)
	if len(best) != 0 {
		t.Fatalf("expected nil for weak match, got id=%d", best[0].ID)
	}
}

func TestPickBestLocationMatch_HandlesTranscriptTypos(t *testing.T) {
	candidates := []*locationDomain.Location{
		{ID: 1, Name: "Bến xe Gia Lâm", City: "Hà Nội", Keywords: "gia lam"},
		{ID: 2, Name: "Bến xe Yên Nghĩa", City: "Hà Nội", Keywords: "yen nghia"},
	}

	best := pickTopLocationMatches("ben xe ra lam", candidates, 4)
	if len(best) == 0 {
		t.Fatalf("expected robust edge matching to find id=1")
	}
	if best[0].ID != 1 {
		t.Fatalf("expected location id=1, got %d", best[0].ID)
	}
}
