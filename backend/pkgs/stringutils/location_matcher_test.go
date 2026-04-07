package stringutils

import "testing"

func TestLevenshteinDistance_ExactMatch(t *testing.T) {
	if d := LevenshteinDistance("hello", "hello"); d != 0 {
		t.Fatalf("expected 0, got %d", d)
	}
}

func TestLevenshteinDistance_EmptyStrings(t *testing.T) {
	if d := LevenshteinDistance("", "abc"); d != 3 {
		t.Fatalf("expected 3, got %d", d)
	}
	if d := LevenshteinDistance("abc", ""); d != 3 {
		t.Fatalf("expected 3, got %d", d)
	}
}

func TestLevenshteinDistance_SingleEdit(t *testing.T) {
	if d := LevenshteinDistance("kitten", "sitten"); d != 1 {
		t.Fatalf("expected 1, got %d", d)
	}
}

func TestNormalizeLocationText_StripsAccents(t *testing.T) {
	result := NormalizeLocationText("Bến Xe Gia Lâm")
	if result != "ben xe gia lam" {
		t.Fatalf("unexpected: %q", result)
	}
}

func TestNormalizeLocationText_HandlesDBar(t *testing.T) {
	result := NormalizeLocationText("Đà Nẵng")
	if result != "da nang" {
		t.Fatalf("unexpected: %q", result)
	}
}

func TestStripLocationNoise_RemovesBenXe(t *testing.T) {
	result := StripLocationNoise("ben xe gia lam")
	if result != "gia lam" {
		t.Fatalf("unexpected: %q", result)
	}
}

func TestScoreLocationMatch_ExactMatch(t *testing.T) {
	score := ScoreLocationMatch("gia lam", LocationCandidate{Name: "Gia Lâm", City: "Hà Nội"})
	if score < 80 {
		t.Fatalf("expected high score, got %d", score)
	}
}

func TestScoreLocationMatch_FuzzyTypo(t *testing.T) {
	score := ScoreLocationMatch("gia lan", LocationCandidate{Name: "Gia Lâm"})
	if score <= 0 {
		t.Fatalf("expected positive score for typo, got %d", score)
	}
}

func TestScoreLocationMatch_NoMatch(t *testing.T) {
	score := ScoreLocationMatch("tokyo", LocationCandidate{Name: "Sài Gòn"})
	if score > 30 {
		t.Fatalf("expected low score, got %d", score)
	}
}

func TestIsApproximateToken_CloseMatch(t *testing.T) {
	if !IsApproximateToken("lam", "lan") {
		t.Fatal("expected approximate match")
	}
}

func TestSharesTokenEdge_SameFirstChar(t *testing.T) {
	if !SharesTokenEdge("abc", "axyz") {
		t.Fatal("expected shared edge")
	}
}

func TestFuzzyLocationNameScore_CloseNames(t *testing.T) {
	score := FuzzyLocationNameScore("gia lam", "gia lan")
	if score <= 0 {
		t.Fatalf("expected positive score, got %d", score)
	}
}

func TestScoreLocationMatch_CityBoostForExactCity(t *testing.T) {
	score := ScoreLocationMatch("ha noi", LocationCandidate{Name: "Ben xe Gia Lam", City: "Ha Noi"})
	if score < 80 {
		t.Fatalf("expected strong city score, got %d", score)
	}
}

func TestScoreLocationMatch_KeywordBoostForSlugStyle(t *testing.T) {
	score := ScoreLocationMatch("ha noi", LocationCandidate{Name: "Ben xe Tay Phuong", Keywords: "kcntt,ha-noi"})
	if score < 40 {
		t.Fatalf("expected keyword score boost, got %d", score)
	}
}
