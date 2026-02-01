package repository

import (
	"backend/db"
	"backend/sql/models"
)

type ILocationRepository interface {
}

type locationRepository struct {
	db      *db.Database
	queries *models.Queries
}
