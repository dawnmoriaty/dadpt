package usecase

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"backend/internals/location/domain"
	"backend/pkgs/stringutils"
	"golang.org/x/sync/errgroup"
)

type LocationUseCase interface {
	Create(ctx context.Context, input *domain.CreateLocationInput) (*domain.Location, error)
	GetByID(ctx context.Context, id int32) (*domain.Location, error)
	Update(ctx context.Context, id int32, input *domain.UpdateLocationInput) (*domain.Location, error)
	Delete(ctx context.Context, id int32) error
	List(ctx context.Context, filter *domain.LocationFilter) ([]*domain.Location, int64, error)
	Search(ctx context.Context, query string, limit int32) ([]*domain.Location, error)
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

func (uc *locationUseCase) Search(ctx context.Context, query string, limit int32) ([]*domain.Location, error) {
	rawQuery := strings.TrimSpace(query)
	if rawQuery == "" {
		return nil, domain.ErrLocationNameRequired
	}

	normalizedLimit := limit
	if normalizedLimit <= 0 {
		normalizedLimit = domain.DefaultSearchLimit
	}
	if normalizedLimit > domain.MaxSearchLimit {
		normalizedLimit = domain.MaxSearchLimit
	}

	fallbackLimit := normalizedLimit
	if fallbackLimit < 1000 {
		fallbackLimit = 1000
	}

	queries := buildSearchQueries(rawQuery)
	resultByID := make(map[int32]*domain.Location)

	for _, item := range queries {
		result, err := uc.repo.Search(ctx, item, normalizedLimit)
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
		allLocations, err := uc.repo.List(ctx, &domain.LocationFilter{Limit: fallbackLimit, Offset: 0})
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
		left := stringutils.NormalizeLocationText(results[i].Name)
		right := stringutils.NormalizeLocationText(results[j].Name)
		if left == right {
			return results[i].ID < results[j].ID
		}
		return left < right
	})

	if int32(len(results)) > normalizedLimit {
		results = results[:normalizedLimit]
	}

	return results, nil
}

func buildSearchQueries(query string) []string {
	raw := strings.TrimSpace(query)
	if raw == "" {
		return nil
	}

	normalized := stringutils.NormalizeLocationText(raw)
	stripped := stringutils.StripLocationNoise(normalized)
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
	normTarget := stringutils.StripLocationNoise(stringutils.NormalizeLocationText(query))
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
		score := stringutils.ScoreLocationMatch(normTarget, stringutils.LocationCandidate{
			Name:     loc.Name,
			City:     loc.City,
			Keywords: loc.Keywords,
		})
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
