package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	bookingDto "backend/internals/booking/controller/dto"
	locationDomain "backend/internals/location/domain"
	tripDomain "backend/internals/trip/domain"
	"backend/pkgs/paging"

	"github.com/gin-gonic/gin"
)

type fakeVoiceBookingPlanner struct {
	planner func(ctx context.Context, req *bookingDto.VoicePlanRequest) (*bookingDto.VoicePlanResponse, error)
}

func (f *fakeVoiceBookingPlanner) PlanByRoute(ctx context.Context, req *bookingDto.VoicePlanRequest) (*bookingDto.VoicePlanResponse, error) {
	if f.planner != nil {
		return f.planner(ctx, req)
	}
	return nil, nil
}

func (f *fakeVoiceBookingPlanner) PlanDirect(ctx context.Context, userID int64, req *bookingDto.VoicePlanRequest) (*bookingDto.VoicePlanResponse, error) {
	_ = userID
	return f.PlanByRoute(ctx, req)
}

func (f *fakeVoiceBookingPlanner) ExecuteDirect(ctx context.Context, userID int64, req *bookingDto.VoiceExecuteRequest) (*bookingDto.VoiceExecuteResponse, error) {
	_ = ctx
	_ = userID
	_ = req
	return nil, nil
}

type fakeLocationUC struct {
	result []*locationDomain.Location
	err    error
}

func (f *fakeLocationUC) Create(ctx context.Context, input *locationDomain.CreateLocationInput) (*locationDomain.Location, error) {
	_ = ctx
	_ = input
	return nil, errors.New("not implemented")
}

func (f *fakeLocationUC) GetByID(ctx context.Context, id int32) (*locationDomain.Location, error) {
	_ = ctx
	_ = id
	return nil, errors.New("not implemented")
}

func (f *fakeLocationUC) Update(ctx context.Context, id int32, input *locationDomain.UpdateLocationInput) (*locationDomain.Location, error) {
	_ = ctx
	_ = id
	_ = input
	return nil, errors.New("not implemented")
}

func (f *fakeLocationUC) Delete(ctx context.Context, id int32) error {
	_ = ctx
	_ = id
	return errors.New("not implemented")
}

func (f *fakeLocationUC) List(ctx context.Context, filter *locationDomain.LocationFilter) ([]*locationDomain.Location, int64, error) {
	_ = ctx
	_ = filter
	return nil, 0, errors.New("not implemented")
}

func (f *fakeLocationUC) Search(ctx context.Context, query string, limit int32) ([]*locationDomain.Location, error) {
	_ = ctx
	_ = query
	_ = limit
	if f.err != nil {
		return nil, f.err
	}
	return f.result, nil
}

type fakeTripUC struct {
	result []*tripDomain.Trip
	err    error
}

func (f *fakeTripUC) Create(ctx context.Context, input *tripDomain.CreateTripInput) (*tripDomain.Trip, error) {
	_ = ctx
	_ = input
	return nil, errors.New("not implemented")
}

func (f *fakeTripUC) GetByID(ctx context.Context, id int64) (*tripDomain.Trip, error) {
	_ = ctx
	_ = id
	return nil, errors.New("not implemented")
}

func (f *fakeTripUC) Update(ctx context.Context, id int64, input *tripDomain.UpdateTripInput) (*tripDomain.Trip, error) {
	_ = ctx
	_ = id
	_ = input
	return nil, errors.New("not implemented")
}

func (f *fakeTripUC) UpdateStatus(ctx context.Context, id int64, newStatus string) (*tripDomain.Trip, error) {
	_ = ctx
	_ = id
	_ = newStatus
	return nil, errors.New("not implemented")
}

func (f *fakeTripUC) Delete(ctx context.Context, id int64) error {
	_ = ctx
	_ = id
	return errors.New("not implemented")
}

func (f *fakeTripUC) List(ctx context.Context, pg *paging.Paging, input *tripDomain.AdminListInput) ([]*tripDomain.Trip, int64, error) {
	_ = ctx
	_ = pg
	_ = input
	return nil, 0, errors.New("not implemented")
}

func (f *fakeTripUC) Search(ctx context.Context, input *tripDomain.SearchTripsInput) ([]*tripDomain.Trip, int64, error) {
	_ = ctx
	_ = input
	if f.err != nil {
		return nil, 0, f.err
	}
	return f.result, int64(len(f.result)), nil
}

func (f *fakeTripUC) Browse(ctx context.Context, input *tripDomain.BrowseTripsInput) ([]*tripDomain.Trip, int64, error) {
	_ = ctx
	_ = input
	return nil, 0, errors.New("not implemented")
}

func TestParseRouteFromMessage(t *testing.T) {
	cases := []struct {
		name        string
		input       string
		wantOrigin  string
		wantDest    string
		shouldMatch bool
	}{
		{name: "from to", input: "tim cac chuyen tu ninh binh ve ha noi", wantOrigin: "ninh binh", wantDest: "ha noi", shouldMatch: true},
		{name: "direct ve", input: "ninh binh ve ha noi", wantOrigin: "ninh binh", wantDest: "ha noi", shouldMatch: true},
		{name: "direct den", input: "ninh binh den ha noi", wantOrigin: "ninh binh", wantDest: "ha noi", shouldMatch: true},
		{name: "reverse", input: "ve ha noi tu ninh binh", wantOrigin: "ninh binh", wantDest: "ha noi", shouldMatch: true},
		{name: "missing route", input: "kiem tra booking cua toi", shouldMatch: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			route, ok := parseRouteFromMessage(tc.input)
			if ok != tc.shouldMatch {
				t.Fatalf("expected match=%v got=%v", tc.shouldMatch, ok)
			}
			if !tc.shouldMatch {
				return
			}
			if route.Origin != tc.wantOrigin {
				t.Fatalf("origin mismatch: want=%q got=%q", tc.wantOrigin, route.Origin)
			}
			if route.Destination != tc.wantDest {
				t.Fatalf("destination mismatch: want=%q got=%q", tc.wantDest, route.Destination)
			}
		})
	}
}

func TestChat_DirectRouteResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ChatHandler{
		locUC: &fakeLocationUC{result: []*locationDomain.Location{
			{ID: 1, Name: "Bến xe Ninh Bình", City: "Ninh Bình", Keywords: "ninh binh"},
			{ID: 2, Name: "Bến xe Giáp Bát", City: "Hà Nội", Keywords: "ha noi"},
		}},
		tripUC: &fakeTripUC{result: []*tripDomain.Trip{
			{
				ID:              11,
				OriginID:        1,
				DestinationID:   2,
				ProviderName:    "Ninh Binh Express",
				OriginName:      "Bến xe Ninh Bình",
				DestinationName: "Bến xe Giáp Bát",
				DepartureTime:   time.Date(2026, 4, 7, 8, 0, 0, 0, time.FixedZone("+7", 7*3600)),
				ArrivalTime:     time.Date(2026, 4, 7, 10, 0, 0, 0, time.FixedZone("+7", 7*3600)),
				BasePrice:       180000,
				PriceModifier:   1,
				AvailableSeats:  8,
				Status:          tripDomain.TripStatusScheduled,
			},
		}},
	}

	payload := `{"message":"tim cac chuyen tu ninh binh ve ha noi"}`
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/ai/chat", strings.NewReader(payload))
	ctx.Request.Header.Set("Content-Type", "application/json")

	handler.Chat(ctx)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", rec.Code, rec.Body.String())
	}

	var envelope struct {
		Data struct {
			WorkflowSlug string                   `json:"workflow_slug"`
			ToolCalls    []map[string]interface{} `json:"tool_calls"`
			UIActions    []map[string]interface{} `json:"ui_actions"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if envelope.Data.WorkflowSlug != "direct.search_trip" {
		t.Fatalf("unexpected workflow slug: %s", envelope.Data.WorkflowSlug)
	}
	if len(envelope.Data.ToolCalls) == 0 {
		t.Fatalf("expected tool_calls")
	}
	if len(envelope.Data.UIActions) == 0 {
		t.Fatalf("expected ui_actions")
	}
}
