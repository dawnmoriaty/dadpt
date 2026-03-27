package usecase

import (
	"testing"

	"backend/internals/location/domain"
)

func TestScoreLocationCandidates_MatchesTranscriptTypos(t *testing.T) {
	candidates := []*domain.Location{
		{ID: 1, Name: "Bến xe Gia Lâm", City: "Hà Nội", Keywords: "gia lam"},
		{ID: 2, Name: "Bến xe Yên Nghĩa", City: "Hà Nội", Keywords: "yen nghia"},
	}

	results := scoreLocationCandidates("ben xe ra lam", candidates)
	if len(results) == 0 {
		t.Fatalf("expected at least one fuzzy match")
	}
	if results[0].ID != 1 {
		t.Fatalf("expected fuzzy match to location id=1, got %d", results[0].ID)
	}
}
