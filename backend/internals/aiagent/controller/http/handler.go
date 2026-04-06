package http

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	authDomain "backend/internals/auth/domain"
	bookingDto "backend/internals/booking/controller/dto"
	bookingHttp "backend/internals/booking/controller/http"
	locationDomain "backend/internals/location/domain"
	locationUsecase "backend/internals/location/usecase"
	tripDomain "backend/internals/trip/domain"
	tripUsecase "backend/internals/trip/usecase"
	"backend/pkgs/aiagent"
	pkgErrors "backend/pkgs/errors"
	"backend/pkgs/logger"
	"backend/pkgs/paging"
	"backend/pkgs/response"
	"backend/pkgs/stringutils"

	"github.com/gin-gonic/gin"
)

type ChatHandler struct {
	client       aiagent.Client
	userRepo     authDomain.Repository
	voiceHandler voiceBookingService
	locUC        locationUsecase.LocationUseCase
	tripUC       tripUsecase.ITripUseCase
}

type voiceBookingService interface {
	PlanDirect(ctx context.Context, userID int64, req *bookingDto.VoicePlanRequest) (*bookingDto.VoicePlanResponse, error)
	PlanByRoute(ctx context.Context, req *bookingDto.VoicePlanRequest) (*bookingDto.VoicePlanResponse, error)
	ExecuteDirect(ctx context.Context, userID int64, req *bookingDto.VoiceExecuteRequest) (*bookingDto.VoiceExecuteResponse, error)
}

func NewChatHandler(
	client aiagent.Client,
	userRepo authDomain.Repository,
	voiceHandler *bookingHttp.VoiceBookingHandler,
	locUC locationUsecase.LocationUseCase,
	tripUC tripUsecase.ITripUseCase,
) *ChatHandler {
	var voiceSvc voiceBookingService
	if voiceHandler != nil {
		voiceSvc = voiceHandler
	}
	return &ChatHandler{
		client:       client,
		userRepo:     userRepo,
		voiceHandler: voiceSvc,
		locUC:        locUC,
		tripUC:       tripUC,
	}
}

type ChatRequest struct {
	TenantSlug string `json:"tenant_slug"`
	SessionID  string `json:"session_id"`
	Message    string `json:"message" binding:"required"`
	UserID     string `json:"user_id"`
	Page       int    `json:"page"`
	Limit      int    `json:"limit"`
}

type VoicePipelineResponse struct {
	Transcript string                           `json:"transcript"`
	Parse      interface{}                      `json:"parse"`
	Plan       *bookingDto.VoicePlanResponse    `json:"plan,omitempty"`
	Execute    *bookingDto.VoiceExecuteResponse `json:"execute,omitempty"`
}

var (
	routePatternFromTo    = regexp.MustCompile(`\btu\s+(.+?)\s+(?:den|ve|toi)\s+(.+)$`)
	routePatternToFrom    = regexp.MustCompile(`\b(?:ve|den)\s+(.+?)\s+tu\s+(.+)$`)
	routePatternArrow     = regexp.MustCompile(`\b(.+?)\s*(?:->|=>|→)\s*(.+)$`)
	routePatternDirect    = regexp.MustCompile(`\b(.+?)\s+(?:den|ve)\s+(.+)$`)
	datePatternYMD        = regexp.MustCompile(`\b\d{4}-\d{2}-\d{2}\b`)
	seatCountPattern      = regexp.MustCompile(`\b(\d{1,2})\s*(?:ghe|cho|nguoi|khach|ve)\b`)
	routeNoisePrefixRegex = regexp.MustCompile(`^(?:tim|kiem|tim kiem)?\s*(?:cac\s+)?(?:chuyen\s+)?(?:xe\s+)?(?:toi\s+muon\s+)?(?:di\s+)?(?:tu\s+)?`)
	trailingSeatRegex     = regexp.MustCompile(`\b\d+\s*(?:ghe|cho|nguoi|khach|ve)\b.*$`)
	trailingTimeRegex     = regexp.MustCompile(`\b\d{1,2}(?::\d{1,2}|h\d{0,2})\b.*$`)

	errChatOriginNotFound      = errors.New("chat origin not found")
	errChatDestinationNotFound = errors.New("chat destination not found")
	errChatNoTrips             = errors.New("chat no trips")
)

const (
	chatSearchDateWindowDays = 14
	chatMaxLocationIDs       = 40
	chatTripPerPairLimit     = 50
	chatDefaultPage          = 1
	chatDefaultLimit         = 10
	chatMaxLimit             = 10
)

type parsedRoute struct {
	Origin      string
	Destination string
}

func (h *ChatHandler) callPlanDirect(ctx context.Context, userID int64, req *bookingDto.VoicePlanRequest) (*bookingDto.VoicePlanResponse, error) {
	if h.isVoiceHandlerUnavailable() {
		return nil, pkgErrors.Wrap(nil, 500, pkgErrors.ErrCodeInternal)
	}
	return h.voiceHandler.PlanDirect(ctx, userID, req)
}

func (h *ChatHandler) callExecuteDirect(ctx context.Context, userID int64, req *bookingDto.VoiceExecuteRequest) (*bookingDto.VoiceExecuteResponse, error) {
	if h.isVoiceHandlerUnavailable() {
		return nil, pkgErrors.Wrap(nil, 500, pkgErrors.ErrCodeInternal)
	}
	return h.voiceHandler.ExecuteDirect(ctx, userID, req)
}

func (h *ChatHandler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "BAD_REQUEST")
		return
	}

	route, ok := parseRouteFromMessage(req.Message)
	if !ok {
		response.Success(c, buildQuickReplyResponse(req, "Mình chưa tách được điểm đi và điểm đến. Bạn nhập theo mẫu: từ [điểm đi] về/đến [điểm đến]."))
		return
	}

	if h.locUC == nil || h.tripUC == nil {
		response.HandleError(c, pkgErrors.Wrap(errors.New("chat direct dependencies unavailable"), 503, pkgErrors.ErrCodeInternal))
		return
	}

	travelDate := extractTravelDate(req.Message)
	passengers := extractPassengerCount(req.Message)
	page, limit := normalizeChatPagination(req.Page, req.Limit)

	originIDs, err := h.resolveLocationIDs(c.Request.Context(), route.Origin)
	if err != nil {
		response.Success(c, buildNoTripsResponse(req, route, travelDate, passengers, errChatOriginNotFound))
		return
	}

	destinationIDs, err := h.resolveLocationIDs(c.Request.Context(), route.Destination)
	if err != nil {
		response.Success(c, buildNoTripsResponse(req, route, travelDate, passengers, errChatDestinationNotFound))
		return
	}

	originIDs, destinationIDs = h.filterSameCityLocationPairs(c.Request.Context(), originIDs, destinationIDs)
	if len(originIDs) == 0 || len(destinationIDs) == 0 {
		response.Success(c, buildNoTripsResponse(req, route, travelDate, passengers, errChatNoTrips))
		return
	}

	dateCandidates := buildDateCandidates(travelDate)

	trips, resolvedDate, err := h.collectTripsByLocationMatrix(
		c.Request.Context(),
		originIDs,
		destinationIDs,
		dateCandidates,
		passengers,
		page,
		limit,
	)
	if err != nil {
		response.Success(c, buildNoTripsResponse(req, route, travelDate, passengers, err))
		return
	}

	if resolvedDate == "" {
		resolvedDate = travelDate
	}

	response.Success(c, buildTripsResponse(req, route, resolvedDate, passengers, page, limit, trips))
}

func parseRouteFromMessage(message string) (parsedRoute, bool) {
	normalized := normalizeLocationText(message)
	normalized = strings.TrimSpace(normalized)
	if normalized == "" {
		return parsedRoute{}, false
	}
	normalized = strings.ReplaceAll(normalized, "→", "->")
	normalized = strings.ReplaceAll(normalized, "–", "-")
	normalized = strings.ReplaceAll(normalized, "—", "-")

	parseWithMatch := func(match []string, reverse bool) (parsedRoute, bool) {
		if len(match) < 3 {
			return parsedRoute{}, false
		}

		originRaw := match[1]
		destinationRaw := match[2]
		if reverse {
			originRaw, destinationRaw = match[2], match[1]
		}

		left := cleanRouteSegment(originRaw, true)
		right := cleanRouteSegment(destinationRaw, false)
		if left == "" || right == "" {
			return parsedRoute{}, false
		}
		if normalizeLocationText(left) == normalizeLocationText(right) {
			return parsedRoute{}, false
		}
		return parsedRoute{Origin: left, Destination: right}, true
	}

	if route, ok := parseWithMatch(routePatternFromTo.FindStringSubmatch(normalized), false); ok {
		return route, true
	}
	if route, ok := parseWithMatch(routePatternToFrom.FindStringSubmatch(normalized), true); ok {
		return route, true
	}
	if route, ok := parseWithMatch(routePatternArrow.FindStringSubmatch(normalized), false); ok {
		return route, true
	}
	if route, ok := parseWithMatch(routePatternDirect.FindStringSubmatch(normalized), false); ok {
		return route, true
	}

	return parsedRoute{}, false
}

func cleanRouteSegment(value string, isOrigin bool) string {
	segment := strings.TrimSpace(value)
	if segment == "" {
		return ""
	}

	if isOrigin {
		segment = routeNoisePrefixRegex.ReplaceAllString(segment, "")
	}

	for _, marker := range []string{" ngay ", " hom nay", " ngay mai", " ngay kia", " luc ", " gio ", " vao ", " cho "} {
		idx := strings.Index(" "+segment, marker)
		if idx >= 0 {
			segment = strings.TrimSpace(segment[:idx])
			break
		}
	}

	segment = strings.TrimSpace(trailingSeatRegex.ReplaceAllString(segment, ""))
	segment = strings.TrimSpace(trailingTimeRegex.ReplaceAllString(segment, ""))
	segment = strings.Trim(segment, " ,.")
	return segment
}

func extractTravelDate(message string) string {
	normalized := normalizeLocationText(message)
	normalized = strings.TrimSpace(normalized)

	if match := datePatternYMD.FindString(message); match != "" {
		return match
	}

	today := time.Now()
	switch {
	case strings.Contains(normalized, "ngay mai"):
		return today.AddDate(0, 0, 1).Format("2006-01-02")
	case strings.Contains(normalized, "hom nay"):
		return today.Format("2006-01-02")
	case strings.Contains(normalized, "ngay kia"):
		return today.AddDate(0, 0, 2).Format("2006-01-02")
	default:
		return "auto"
	}
}

func extractPassengerCount(message string) int {
	normalized := normalizeLocationText(message)
	match := seatCountPattern.FindStringSubmatch(normalized)
	if len(match) < 2 {
		return 1
	}
	parsed, err := strconv.Atoi(match[1])
	if err != nil || parsed <= 0 {
		return 1
	}
	if parsed > 8 {
		return 8
	}
	return parsed
}

func buildQuickReplyResponse(req ChatRequest, prompt string) *aiagent.ChatResponse {
	return &aiagent.ChatResponse{
		Message:      prompt,
		Status:       "completed",
		SessionID:    req.SessionID,
		WorkflowSlug: "direct.search_trip",
		UiActions: []map[string]any{
			{
				"type":   "quick_replies",
				"prompt": "Bạn muốn tìm tuyến nào?",
				"options": []map[string]string{
					{"label": "Tìm chuyến Ninh Bình → Hà Nội", "value": "Tìm chuyến Ninh Bình → Hà Nội"},
					{"label": "Tìm chuyến Hà Nội → Ninh Bình", "value": "Tìm chuyến Hà Nội → Ninh Bình"},
					{"label": "Tìm chuyến Sài Gòn → Đà Lạt", "value": "Tìm chuyến Sài Gòn → Đà Lạt"},
				},
			},
		},
		ToolCalls: []aiagent.ToolCall{},
	}
}

func buildNoTripsResponse(req ChatRequest, route parsedRoute, travelDate string, passengers int, err error) *aiagent.ChatResponse {
	message := "Không tìm thấy chuyến phù hợp cho tuyến này. Bạn thử đổi ngày hoặc giảm số ghế giúp mình."

	switch {
	case errors.Is(err, errChatOriginNotFound):
		message = "Mình chưa xác định được điểm đi. Bạn nhập lại theo dạng: từ [điểm đi] đến [điểm đến]."
	case errors.Is(err, errChatDestinationNotFound):
		message = "Mình chưa xác định được điểm đến. Bạn nhập lại theo dạng: từ [điểm đi] đến [điểm đến]."
	case errors.Is(err, errChatNoTrips):
		message = "Hiện chưa có chuyến đúng điều kiện bạn yêu cầu. Bạn thử ngày khác giúp mình nhé."
	default:
		if appErr, ok := err.(*pkgErrors.AppError); ok {
			switch string(appErr.Code) {
			case "VOICE_ORIGIN_NOT_FOUND":
				message = "Mình chưa xác định được điểm đi. Bạn nhập lại theo dạng: từ [điểm đi] đến [điểm đến]."
			case "VOICE_DESTINATION_NOT_FOUND":
				message = "Mình chưa xác định được điểm đến. Bạn nhập lại theo dạng: từ [điểm đi] đến [điểm đến]."
			case "VOICE_NO_TRIPS":
				message = "Hiện chưa có chuyến đúng điều kiện bạn yêu cầu. Bạn thử ngày khác giúp mình nhé."
			}
		}
	}

	inputs := map[string]any{
		"origin":      route.Origin,
		"destination": route.Destination,
		"date":        travelDate,
		"passengers":  passengers,
	}
	rawInputs, _ := json.Marshal(inputs)

	return &aiagent.ChatResponse{
		Message:      message,
		Status:       "completed",
		SessionID:    req.SessionID,
		WorkflowSlug: "direct.search_trip",
		ToolCalls: []aiagent.ToolCall{
			{
				ToolName:  "search_trips",
				Inputs:    string(rawInputs),
				Output:    fmt.Sprintf("{'error': '%s'}", strings.TrimSpace(err.Error())),
				Timestamp: time.Now().UTC().Format(time.RFC3339),
			},
		},
		UiActions: []map[string]any{
			{
				"type":   "quick_replies",
				"prompt": "Bạn muốn thử tuyến/ngày khác không?",
				"meta": map[string]any{
					"origin":      route.Origin,
					"destination": route.Destination,
					"date":        travelDate,
					"passengers":  passengers,
				},
				"options": []map[string]string{
					{"label": "Thử ngày mai", "value": fmt.Sprintf("Tìm chuyến từ %s về %s ngày mai", route.Origin, route.Destination)},
					{"label": "Thử 2 ngày nữa", "value": fmt.Sprintf("Tìm chuyến từ %s về %s ngày kia", route.Origin, route.Destination)},
				},
			},
		},
	}
}

func buildTripsResponse(req ChatRequest, route parsedRoute, travelDate string, passengers, page, limit int, trips []*tripDomain.Trip) *aiagent.ChatResponse {
	inputs := map[string]any{
		"origin":      route.Origin,
		"destination": route.Destination,
		"date":        travelDate,
		"passengers":  passengers,
	}
	rawInputs, _ := json.Marshal(inputs)

	items := make([]map[string]any, 0, len(trips))
	for _, candidate := range trips {
		item := map[string]any{
			"trip_id":          candidate.ID,
			"provider_name":    candidate.ProviderName,
			"origin_name":      candidate.OriginName,
			"destination_name": candidate.DestinationName,
			"departure_time":   candidate.DepartureTime.Format(time.RFC3339),
			"arrival_time":     candidate.ArrivalTime.Format(time.RFC3339),
			"price":            candidate.FinalPrice(),
			"available_seats":  candidate.AvailableSeats,
			"status":           candidate.Status.String(),
			"score_explain": map[string]any{
				"reasons": []string{"Khớp tuyến và điều kiện bạn yêu cầu"},
			},
			"book_now": map[string]any{
				"trip_id":        candidate.ID,
				"passengers":     passengers,
				"payment_method": "cod",
			},
		}
		items = append(items, item)
	}

	originDisplay := route.Origin
	destinationDisplay := route.Destination
	if len(trips) > 0 {
		if strings.TrimSpace(trips[0].OriginName) != "" {
			originDisplay = trips[0].OriginName
		}
		if strings.TrimSpace(trips[0].DestinationName) != "" {
			destinationDisplay = trips[0].DestinationName
		}
	}

	uiActions := []map[string]any{
		{
			"type":   "trip_recommendations",
			"title":  "Chuyến xe gợi ý cho bạn",
			"prompt": "Chọn chuyến phù hợp rồi bấm Đặt vé.",
			"meta": map[string]any{
				"origin":               originDisplay,
				"destination":          destinationDisplay,
				"origin_province":      route.Origin,
				"destination_province": route.Destination,
				"date":                 travelDate,
				"passengers":           passengers,
				"page":                 page,
				"limit":                limit,
				"count":                len(items),
			},
			"items": items,
		},
	}

	return &aiagent.ChatResponse{
		Message:      "Mình đã tìm được các chuyến phù hợp theo toàn bộ bến xe trên tuyến bạn yêu cầu. Bạn chọn chuyến bên dưới nhé.",
		Status:       "completed",
		SessionID:    req.SessionID,
		WorkflowSlug: "direct.search_trip",
		ToolCalls: []aiagent.ToolCall{
			{
				ToolName:  "search_trips",
				Inputs:    string(rawInputs),
				Output:    fmt.Sprintf("{'trips': %d}", len(items)),
				Timestamp: time.Now().UTC().Format(time.RFC3339),
			},
		},
		UiActions: uiActions,
	}
}

func buildDateCandidates(rawDate string) []string {
	trimmed := strings.TrimSpace(rawDate)
	today := time.Now()

	startDate := today
	if trimmed != "" && !strings.EqualFold(trimmed, "auto") {
		parsed, err := time.Parse("2006-01-02", trimmed)
		if err == nil {
			startDate = parsed
			if startDate.Before(today) {
				startDate = today
			}
		}
	}

	result := make([]string, 0, chatSearchDateWindowDays+1)
	for i := 0; i <= chatSearchDateWindowDays; i++ {
		result = append(result, startDate.AddDate(0, 0, i).Format("2006-01-02"))
	}

	return result
}

func normalizeChatPagination(page, limit int) (int, int) {
	pg := paging.Paging{Page: page, Limit: limit}
	pg.Process()

	normalizedPage := pg.Page
	normalizedLimit := pg.PageSize

	if normalizedPage < chatDefaultPage {
		normalizedPage = chatDefaultPage
	}

	if normalizedLimit <= 0 {
		normalizedLimit = chatDefaultLimit
	}
	if normalizedLimit > chatMaxLimit {
		normalizedLimit = chatMaxLimit
	}

	return normalizedPage, normalizedLimit
}

func (h *ChatHandler) resolveLocationIDs(ctx context.Context, locationText string) ([]int32, error) {
	query := strings.TrimSpace(locationText)
	if query == "" {
		return nil, errChatOriginNotFound
	}

	candidates, err := h.locUC.Search(ctx, query, locationDomain.MaxSearchLimit)
	if err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return nil, errChatOriginNotFound
	}

	target := stringutils.StripLocationNoise(stringutils.NormalizeLocationText(query))
	type scoredLocation struct {
		id    int32
		score int
		city  string
	}
	scored := make([]scoredLocation, 0, len(candidates))
	for _, candidate := range candidates {
		if candidate == nil {
			continue
		}
		score := stringutils.ScoreLocationMatch(target, stringutils.LocationCandidate{
			Name:     candidate.Name,
			City:     candidate.City,
			Keywords: candidate.Keywords,
		})
		if score <= 0 {
			continue
		}
		scored = append(scored, scoredLocation{
			id:    candidate.ID,
			score: score,
			city:  normalizeLocationText(candidate.City),
		})
	}

	if len(scored) == 0 {
		return nil, errChatOriginNotFound
	}

	sort.Slice(scored, func(i, j int) bool {
		if scored[i].score == scored[j].score {
			return scored[i].id < scored[j].id
		}
		return scored[i].score > scored[j].score
	})

	highConfidence := make([]int32, 0, len(scored))
	for _, item := range scored {
		if len(highConfidence) >= chatMaxLocationIDs {
			break
		}
		if item.score < 30 {
			continue
		}
		highConfidence = append(highConfidence, item.id)
	}

	cityTokens := make([]string, 0, 3)
	for _, token := range strings.Fields(target) {
		if len(token) < 2 {
			continue
		}
		cityTokens = append(cityTokens, token)
		if len(cityTokens) == 3 {
			break
		}
	}

	cityMatched := make([]int32, 0, len(scored))
	for _, item := range scored {
		if len(cityMatched) >= chatMaxLocationIDs {
			break
		}
		if len(cityTokens) == 0 {
			cityMatched = append(cityMatched, item.id)
			continue
		}
		matchesCity := false
		for _, token := range cityTokens {
			if strings.Contains(item.city, token) {
				matchesCity = true
				break
			}
		}
		if matchesCity {
			cityMatched = append(cityMatched, item.id)
		}
	}

	result := make([]int32, 0, chatMaxLocationIDs)
	seen := make(map[int32]struct{})
	appendUnique := func(values []int32) {
		for _, id := range values {
			if len(result) >= chatMaxLocationIDs {
				return
			}
			if _, ok := seen[id]; ok {
				continue
			}
			seen[id] = struct{}{}
			result = append(result, id)
		}
	}

	appendUnique(highConfidence)
	appendUnique(cityMatched)

	if len(result) == 0 {
		for _, item := range scored {
			if len(result) >= chatMaxLocationIDs {
				break
			}
			if _, ok := seen[item.id]; ok {
				continue
			}
			seen[item.id] = struct{}{}
			result = append(result, item.id)
		}
	}

	if len(result) == 0 {
		return nil, errChatOriginNotFound
	}

	return result, nil
}

func (h *ChatHandler) collectTripsByLocationMatrix(
	ctx context.Context,
	originIDs []int32,
	destinationIDs []int32,
	dateCandidates []string,
	passengers int,
	page int,
	limit int,
) ([]*tripDomain.Trip, string, error) {
	if len(originIDs) == 0 {
		return nil, "", errChatOriginNotFound
	}
	if len(destinationIDs) == 0 {
		return nil, "", errChatDestinationNotFound
	}

	if passengers <= 0 {
		passengers = 1
	}

	seenTrip := make(map[int64]struct{})
	offset := (page - 1) * limit

	for _, departureDate := range dateCandidates {
		allTrips := make([]*tripDomain.Trip, 0)
		for _, originID := range originIDs {
			for _, destinationID := range destinationIDs {
				if originID == destinationID {
					continue
				}

				result, _, err := h.tripUC.Search(ctx, &tripDomain.SearchTripsInput{
					OriginID:      originID,
					DestinationID: destinationID,
					DepartureDate: departureDate,
					MinSeats:      passengers,
					Page:          1,
					Limit:         chatTripPerPairLimit,
				})
				if err != nil {
					continue
				}

				for _, item := range result {
					if item == nil {
						continue
					}
					if _, exists := seenTrip[item.ID]; exists {
						continue
					}
					seenTrip[item.ID] = struct{}{}
					allTrips = append(allTrips, item)
				}
			}
		}

		if len(allTrips) > 0 {
			sort.Slice(allTrips, func(i, j int) bool {
				if allTrips[i].DepartureTime.Equal(allTrips[j].DepartureTime) {
					if allTrips[i].FinalPrice() == allTrips[j].FinalPrice() {
						return allTrips[i].ID < allTrips[j].ID
					}
					return allTrips[i].FinalPrice() < allTrips[j].FinalPrice()
				}
				return allTrips[i].DepartureTime.Before(allTrips[j].DepartureTime)
			})

			if offset >= len(allTrips) {
				continue
			}

			end := offset + limit
			if end > len(allTrips) {
				end = len(allTrips)
			}

			pageTrips := allTrips[offset:end]
			if len(pageTrips) > 0 {
				return pageTrips, departureDate, nil
			}
		}
	}

	return nil, "", errChatNoTrips
}

func (h *ChatHandler) filterSameCityLocationPairs(ctx context.Context, originIDs, destinationIDs []int32) ([]int32, []int32) {
	if len(originIDs) == 0 || len(destinationIDs) == 0 {
		return originIDs, destinationIDs
	}

	originByCity := make(map[string][]int32)
	for _, originID := range originIDs {
		loc, err := h.locUC.GetByID(ctx, originID)
		if err != nil || loc == nil {
			continue
		}
		city := normalizeLocationText(loc.City)
		if city == "" {
			city = normalizeLocationText(loc.Name)
		}
		originByCity[city] = append(originByCity[city], originID)
		cityTokens := strings.Fields(city)
		for _, token := range cityTokens {
			if len(token) < 2 {
				continue
			}
			originByCity[token] = append(originByCity[token], originID)
		}
	}

	destinationByCity := make(map[string][]int32)
	for _, destinationID := range destinationIDs {
		loc, err := h.locUC.GetByID(ctx, destinationID)
		if err != nil || loc == nil {
			continue
		}
		city := normalizeLocationText(loc.City)
		if city == "" {
			city = normalizeLocationText(loc.Name)
		}
		destinationByCity[city] = append(destinationByCity[city], destinationID)
		cityTokens := strings.Fields(city)
		for _, token := range cityTokens {
			if len(token) < 2 {
				continue
			}
			destinationByCity[token] = append(destinationByCity[token], destinationID)
		}
	}

	intersection := make(map[int32]struct{})
	for city := range originByCity {
		if _, ok := destinationByCity[city]; !ok {
			continue
		}
		for _, id := range originByCity[city] {
			intersection[id] = struct{}{}
		}
	}

	if len(intersection) == 0 {
		return originIDs, destinationIDs
	}

	filteredOrigins := make([]int32, 0, len(originIDs))
	for _, id := range originIDs {
		if _, ok := intersection[id]; ok {
			filteredOrigins = append(filteredOrigins, id)
		}
	}

	filteredDestinations := make([]int32, 0, len(destinationIDs))
	for _, id := range destinationIDs {
		if _, ok := intersection[id]; ok {
			filteredDestinations = append(filteredDestinations, id)
		}
	}

	if len(filteredOrigins) == 0 || len(filteredDestinations) == 0 {
		return originIDs, destinationIDs
	}

	return filteredOrigins, filteredDestinations
}

func (h *ChatHandler) isVoiceHandlerUnavailable() bool {
	if h.voiceHandler == nil {
		return true
	}

	value := reflect.ValueOf(h.voiceHandler)
	return value.Kind() == reflect.Ptr && value.IsNil()
}

func normalizeLocationText(value string) string {
	return stringutils.NormalizeLocationText(value)
}

type SyncDataRequest struct {
	TenantSlug string `json:"tenant_slug" binding:"required"`
	Collection string `json:"collection" binding:"required"`
	DataJSON   string `json:"data_json" binding:"required"`
}

func (h *ChatHandler) SyncData(c *gin.Context) {
	var req SyncDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "BAD_REQUEST")
		return
	}

	if h.client == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code":    http.StatusServiceUnavailable,
			"status":  "error",
			"message": "AI agent service not available",
		})
		return
	}

	resp, err := h.client.SyncData(c.Request.Context(), &aiagent.SyncDataRequest{
		TenantSlug: req.TenantSlug,
		Collection: req.Collection,
		DataJSON:   req.DataJSON,
	})
	if err != nil {
		logger.Error("AI Agent sync failed: %v", err)
		response.InternalServerError(c)
		return
	}

	response.Success(c, resp)
}
