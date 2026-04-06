package http

import (
	"sort"
	"strings"

	locationDomain "backend/internals/location/domain"
	"backend/pkgs/stringutils"
)

type locationResult struct {
	ID   int
	Name string
}

func buildLocationQueries(text string) []string {
	raw := strings.TrimSpace(text)
	if raw == "" {
		return nil
	}

	normalized := normalizeLocationText(raw)
	stripped := stripLocationNoise(normalized)

	queries := []string{raw}
	if stripped != "" && !strings.EqualFold(stripped, raw) {
		queries = append(queries, stripped)
	}
	if normalized != "" && !strings.EqualFold(normalized, raw) && !strings.EqualFold(normalized, stripped) {
		queries = append(queries, normalized)
	}

	out := make([]string, 0, len(queries))
	seen := make(map[string]bool)
	for _, item := range queries {
		key := strings.ToLower(strings.TrimSpace(item))
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, strings.TrimSpace(item))
	}

	return out
}

func pickTopLocationMatches(target string, candidates []*locationDomain.Location, topN int) []*locationDomain.Location {
	normTarget := stripLocationNoise(normalizeLocationText(target))
	if normTarget == "" {
		return nil
	}

	type scored struct {
		loc   *locationDomain.Location
		score int
	}
	scoredCandidates := make([]scored, 0, len(candidates))

	for _, loc := range candidates {
		if loc == nil {
			continue
		}
		score := scoreLocationMatch(normTarget, loc)
		if score > 0 {
			scoredCandidates = append(scoredCandidates, scored{loc: loc, score: score})
		}
	}

	if len(scoredCandidates) == 0 {
		return nil
	}

	sort.Slice(scoredCandidates, func(i, j int) bool {
		if scoredCandidates[i].score == scoredCandidates[j].score {
			return scoredCandidates[i].loc.ID < scoredCandidates[j].loc.ID
		}
		return scoredCandidates[i].score > scoredCandidates[j].score
	})

	var results []*locationDomain.Location
	for i, sc := range scoredCandidates {
		if i >= topN || sc.score < 30 {
			break
		}
		results = append(results, sc.loc)
	}

	return results
}

func scoreLocationMatch(target string, location *locationDomain.Location) int {
	return stringutils.ScoreLocationMatch(target, stringutils.LocationCandidate{
		Name:     location.Name,
		City:     location.City,
		Keywords: location.Keywords,
	})
}

func normalizeLocationText(text string) string {
	return stringutils.NormalizeLocationText(text)
}

func stripLocationNoise(text string) string {
	return stringutils.StripLocationNoise(text)
}
