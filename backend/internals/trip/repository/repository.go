package repository

import (
	"backend/db"
)

type ITripRepository interface {
	// Will be implemented with sqlc generated Queries
}

type tripRepository struct {
	db *db.Database
	// queries *generated.Queries // Uncomment after sqlc generate
}

func NewTripRepository(database *db.Database) ITripRepository {
	return &tripRepository{
		db: database,
		// queries: generated.New(database.GetPool()),
	}
}
