package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	authDomain "backend/internals/auth/domain"

	"github.com/gin-gonic/gin"
)

type fakeUserRepo struct {
	getByID func(ctx context.Context, id int64) (*authDomain.User, error)
}

func (f *fakeUserRepo) Create(ctx context.Context, user *authDomain.User) (*authDomain.User, error) {
	return nil, errors.New("not implemented")
}

func (f *fakeUserRepo) GetByID(ctx context.Context, id int64) (*authDomain.User, error) {
	if f.getByID != nil {
		return f.getByID(ctx, id)
	}
	return nil, authDomain.ErrUserNotFound
}

func (f *fakeUserRepo) GetByPhone(ctx context.Context, phone authDomain.Phone) (*authDomain.User, error) {
	return nil, errors.New("not implemented")
}

func (f *fakeUserRepo) GetByIdentifier(ctx context.Context, identifier string) (*authDomain.User, error) {
	return nil, errors.New("not implemented")
}

func (f *fakeUserRepo) PhoneExists(ctx context.Context, phone authDomain.Phone) (bool, error) {
	return false, errors.New("not implemented")
}

func (f *fakeUserRepo) Update(ctx context.Context, user *authDomain.User) (*authDomain.User, error) {
	return nil, errors.New("not implemented")
}

func (f *fakeUserRepo) UpdatePassword(ctx context.Context, userID int64, passwordHash string) error {
	return errors.New("not implemented")
}

type voiceRespEnvelope struct {
	Code   int                    `json:"code"`
	Status string                 `json:"status"`
	Data   voiceValidationPayload `json:"data"`
}

type voiceValidationPayload struct {
	Accepted   bool   `json:"accepted"`
	ReasonCode string `json:"reasonCode"`
}

func TestValidateVoiceBookingCommand_Accepted(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &fakeUserRepo{getByID: func(ctx context.Context, id int64) (*authDomain.User, error) {
		phone, _ := authDomain.NewPhone("0912345678")
		email, _ := authDomain.NewEmail("demo@example.com")
		return &authDomain.User{
			ID:       id,
			Phone:    phone,
			Email:    email,
			FullName: "Demo User",
			IsActive: true,
		}, nil
	}}

	h := &ChatHandler{userRepo: repo}
	body := map[string]any{
		"origin":              "Hà Nội",
		"destination":         "Đà Nẵng",
		"travelDate":          "2026-03-20",
		"seatCount":           2,
		"seatPreferenceOrder": []string{"A1", "A2"},
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	payload, _ := json.Marshal(body)
	c.Request = httptest.NewRequest("POST", "/api/v1/ai/voice/booking/validate", bytes.NewReader(payload))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("userID", int64(101))

	h.ValidateVoiceBookingCommand(c)

	if w.Code != 200 {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp voiceRespEnvelope
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if !resp.Data.Accepted {
		t.Fatalf("expected accepted=true, got false")
	}
	if resp.Data.ReasonCode != voiceReasonAccepted {
		t.Fatalf("unexpected reason code: %s", resp.Data.ReasonCode)
	}
}

func TestValidateVoiceBookingCommand_RejectsProfileFieldsFromAI(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &ChatHandler{userRepo: &fakeUserRepo{}}
	body := map[string]any{
		"origin":      "HCM",
		"destination": "Nha Trang",
		"travelDate":  "2026-03-20",
		"seatCount":   1,
		"guestName":   "Injected",
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	payload, _ := json.Marshal(body)
	c.Request = httptest.NewRequest("POST", "/api/v1/ai/voice/booking/validate", bytes.NewReader(payload))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("userID", int64(101))

	h.ValidateVoiceBookingCommand(c)

	var resp voiceRespEnvelope
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Data.Accepted {
		t.Fatalf("expected accepted=false")
	}
	if resp.Data.ReasonCode != voiceReasonProfileFieldsForbidden {
		t.Fatalf("unexpected reason code: %s", resp.Data.ReasonCode)
	}
}

func TestNormalizeSeatPreference_DedupAndUppercase(t *testing.T) {
	result := normalizeSeatPreference([]string{" a1 ", "A1", "b2", ""})
	if len(result) != 2 {
		t.Fatalf("expected 2 seats, got %d", len(result))
	}
	if result[0] != "A1" || result[1] != "B2" {
		t.Fatalf("unexpected normalized result: %v", result)
	}
}
