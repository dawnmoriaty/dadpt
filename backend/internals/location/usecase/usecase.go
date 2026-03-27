package usecase

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"unicode"

	"backend/internals/location/domain"
	"golang.org/x/sync/errgroup"
	"golang.org/x/text/unicode/norm"
)

type LocationUseCase interface {
	Create(ctx context.Context, input *domain.CreateLocationInput) (*domain.Location, error)
	GetByID(ctx context.Context, id int32) (*domain.Location, error)
	Update(ctx context.Context, id int32, input *domain.UpdateLocationInput) (*domain.Location, error)
	Delete(ctx context.Context, id int32) error
	List(ctx context.Context, filter *domain.LocationFilter) ([]*domain.Location, int64, error)
	Search(ctx context.Context, query string) ([]*domain.Location, error)
}

type locationUseCase struct {
	repo domain.Repository
}

func NewLocationUseCase(repo domain.Repository) LocationUseCase {
	return &locationUseCase{repo: repo}
}

func (uc *locationUseCase) Create(ctx context.Context, input *domain.CreateLocationInput) (*domain.Location, error) {
	loc := &domain.Location{
		Name:     input.Name,
		City:     input.City,
		Address:  input.Address,
		Keywords: input.Keywords,
		ImageURL: input.ImageURL,
	}

	if err := loc.Validate(); err != nil {
		return nil, fmt.Errorf("locationUseCase.Create.Validate: %w", err)
	}

	result, err := uc.repo.Create(ctx, loc)
	if err != nil {
		return nil, fmt.Errorf("locationUseCase.Create: %w", err)
	}
	return result, nil
}

func (uc *locationUseCase) GetByID(ctx context.Context, id int32) (*domain.Location, error) {
	result, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("locationUseCase.GetByID: %w", err)
	}
	return result, nil
}

func (uc *locationUseCase) Update(ctx context.Context, id int32, input *domain.UpdateLocationInput) (*domain.Location, error) {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("locationUseCase.Update.GetByID: %w", err)
	}

	if input.Name != nil {
		existing.Name = *input.Name
	}
	if input.City != nil {
		existing.City = *input.City
	}
	if input.Address != nil {
		existing.Address = *input.Address
	}
	if input.Keywords != nil {
		existing.Keywords = *input.Keywords
	}
	if input.ImageURL != nil {
		existing.ImageURL = *input.ImageURL
	}

	if err := existing.Validate(); err != nil {
		return nil, fmt.Errorf("locationUseCase.Update.Validate: %w", err)
	}

	result, err := uc.repo.Update(ctx, existing)
	if err != nil {
		return nil, fmt.Errorf("locationUseCase.Update: %w", err)
	}
	return result, nil
}

func (uc *locationUseCase) Delete(ctx context.Context, id int32) error {
	_, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("locationUseCase.Delete.GetByID: %w", err)
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("locationUseCase.Delete: %w", err)
	}
	return nil
}

func (uc *locationUseCase) List(ctx context.Context, filter *domain.LocationFilter) ([]*domain.Location, int64, error) {
	var (
		items []*domain.Location
		total int64
	)

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		result, err := uc.repo.List(gctx, filter)
		if err != nil {
			return fmt.Errorf("locationUseCase.List.List: %w", err)
		}
		items = result
		return nil
	})
	g.Go(func() error {
		count, err := uc.repo.Count(gctx, filter)
		if err != nil {
			return fmt.Errorf("locationUseCase.List.Count: %w", err)
		}
		total = count
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (uc *locationUseCase) Search(ctx context.Context, query string) ([]*domain.Location, error) {
	rawQuery := strings.TrimSpace(query)
	if rawQuery == "" {
		return nil, domain.ErrLocationNameRequired
	}

	queries := buildSearchQueries(rawQuery)
	resultByID := make(map[int32]*domain.Location)

	for _, item := range queries {
		result, err := uc.repo.Search(ctx, item)
		if err != nil {
			return nil, fmt.Errorf("locationUseCase.Search: %w", err)
		}
		for _, loc := range result {
			if loc == nil {
				continue
			}
			if _, exists := resultByID[loc.ID]; !exists {
				resultByID[loc.ID] = loc
			}
		}
	}

	if len(resultByID) == 0 {
		allLocations, err := uc.repo.List(ctx, &domain.LocationFilter{Limit: 1000, Offset: 0})
		if err != nil {
			return nil, fmt.Errorf("locationUseCase.Search.List: %w", err)
		}

		for _, loc := range scoreLocationCandidates(rawQuery, allLocations) {
			resultByID[loc.ID] = loc
		}
	}

	results := make([]*domain.Location, 0, len(resultByID))
	for _, loc := range resultByID {
		results = append(results, loc)
	}

	sort.Slice(results, func(i, j int) bool {
		left := normalizeSearchText(results[i].Name)
		right := normalizeSearchText(results[j].Name)
		if left == right {
			return results[i].ID < results[j].ID
		}
		return left < right
	})

	return results, nil
}

func buildSearchQueries(query string) []string {
	raw := strings.TrimSpace(query)
	if raw == "" {
		return nil
	}

	normalized := normalizeSearchText(raw)
	stripped := stripLocationNoise(normalized)
	bxQuery := buildBXVariant(stripped)

	queries := []string{raw}
	if stripped != "" && !strings.EqualFold(stripped, raw) {
		queries = append(queries, stripped)
	}
	if normalized != "" && !strings.EqualFold(normalized, raw) && !strings.EqualFold(normalized, stripped) {
		queries = append(queries, normalized)
	}
	if bxQuery != "" && !strings.EqualFold(bxQuery, raw) && !strings.EqualFold(bxQuery, stripped) && !strings.EqualFold(bxQuery, normalized) {
		queries = append(queries, bxQuery)
	}

	result := make([]string, 0, len(queries))
	seen := make(map[string]bool)
	for _, item := range queries {
		key := strings.ToLower(strings.TrimSpace(item))
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		result = append(result, strings.TrimSpace(item))
	}

	return result
}

func scoreLocationCandidates(query string, candidates []*domain.Location) []*domain.Location {
	normTarget := stripLocationNoise(normalizeSearchText(query))
	if normTarget == "" {
		return nil
	}

	type scoredLocation struct {
		location *domain.Location
		score    int
	}

	scored := make([]scoredLocation, 0, len(candidates))
	for _, loc := range candidates {
		if loc == nil {
			continue
		}
		score := scoreLocationMatch(normTarget, loc)
		if score > 0 {
			scored = append(scored, scoredLocation{location: loc, score: score})
		}
	}

	sort.Slice(scored, func(i, j int) bool {
		if scored[i].score == scored[j].score {
			return scored[i].location.ID < scored[j].location.ID
		}
		return scored[i].score > scored[j].score
	})

	results := make([]*domain.Location, 0, len(scored))
	for _, item := range scored {
		if item.score < 30 {
			continue
		}
		results = append(results, item.location)
	}

	return results
}

func scoreLocationMatch(target string, location *domain.Location) int {
	name := stripLocationNoise(normalizeSearchText(location.Name))
	if name == "" {
		return 0
	}

	if name == target {
		return 100
	}

	if strings.Contains(name, target) || strings.Contains(target, name) {
		return 90
	}

	if score := fuzzyLocationNameScore(target, name); score > 0 {
		return score
	}

	targetTokens := strings.Fields(target)
	nameTokens := strings.Fields(name)
	if len(targetTokens) == 0 || len(nameTokens) == 0 {
		return 0
	}

	overlap := 0
	used := make([]bool, len(nameTokens))
	for _, token := range targetTokens {
		for i, candidate := range nameTokens {
			if used[i] {
				continue
			}
			if token == candidate {
				overlap += 20
				used[i] = true
				break
			}
			if isApproximateLocationToken(token, candidate) {
				overlap += 15
				used[i] = true
				break
			}
		}
	}

	score := overlap
	if strings.Contains(normalizeSearchText(location.City), target) {
		score += 10
	}
	if strings.Contains(normalizeSearchText(location.Keywords), target) {
		score += 20
	}

	return score
}

func fuzzyLocationNameScore(target string, name string) int {
	distance := levenshteinDistance(target, name)
	maxLength := maxInt(len(target), len(name))
	if maxLength >= 6 && distance <= 2 {
		return 80 - (distance * 5)
	}
	if maxLength >= 4 && distance == 1 {
		return 75
	}
	return 0
}

func isApproximateLocationToken(left string, right string) bool {
	distance := levenshteinDistance(left, right)
	maxLength := maxInt(len(left), len(right))
	if maxLength <= 3 {
		return distance <= 2 && sharesTokenEdge(left, right)
	}
	return distance <= 1
}

func sharesTokenEdge(left string, right string) bool {
	if left == "" || right == "" {
		return false
	}
	return left[0] == right[0] || left[len(left)-1] == right[len(right)-1]
}

func levenshteinDistance(left string, right string) int {
	if left == right {
		return 0
	}
	if left == "" {
		return len(right)
	}
	if right == "" {
		return len(left)
	}

	prev := make([]int, len(right)+1)
	for j := 0; j <= len(right); j++ {
		prev[j] = j
	}

	for i := 1; i <= len(left); i++ {
		current := make([]int, len(right)+1)
		current[0] = i
		for j := 1; j <= len(right); j++ {
			cost := 0
			if left[i-1] != right[j-1] {
				cost = 1
			}
			current[j] = minInt(
				minInt(current[j-1]+1, prev[j]+1),
				prev[j-1]+cost,
			)
		}
		prev = current
	}

	return prev[len(right)]
}

func minInt(left int, right int) int {
	if left < right {
		return left
	}
	return right
}

func maxInt(left int, right int) int {
	if left > right {
		return left
	}
	return right
}

func buildBXVariant(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "bx ") {
		return trimmed
	}
	return strings.TrimSpace("bx " + trimmed)
}

func stripLocationNoise(text string) string {
	value := strings.TrimSpace(strings.ToLower(text))
	value = strings.ReplaceAll(value, "ben xe", "")
	value = strings.ReplaceAll(value, "bx", "")
	value = strings.ReplaceAll(value, "tram", "")
	return strings.TrimSpace(strings.Join(strings.Fields(value), " "))
}

func normalizeSearchText(text string) string {
	trimmed := strings.TrimSpace(strings.ToLower(text))
	if trimmed == "" {
		return ""
	}

	normValue := norm.NFD.String(trimmed)
	builder := strings.Builder{}
	builder.Grow(len(normValue))
	for _, r := range normValue {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		switch r {
		case 'đ':
			builder.WriteRune('d')
		default:
			builder.WriteRune(r)
		}
	}

	return strings.Join(strings.Fields(builder.String()), " ")
}
