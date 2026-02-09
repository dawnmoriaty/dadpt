// Package paging provides a minimal pagination toolkit.
//
// Usage in handler:
//
//	var pg paging.Paging
//	_ = c.ShouldBindQuery(&pg)
//	pg.Process()
//	items, total, _ := uc.List(ctx, &pg)
//	response.Success(c, paging.Of(items, total, pg.Page))
package paging

const (
	defaultPage = 1
	defaultSize = 20
	maxPageSize = 100
)

// Paging carries page + pageSize from query string and is used
// throughout usecase/repository layers to compute LIMIT/OFFSET.
type Paging struct {
	Page     int   `json:"page"     form:"page"`
	PageSize int   `json:"pageSize" form:"pageSize"`
	Total    int64 `json:"total"    form:"-"`
}

// Process clamps Page and PageSize to safe defaults.
func (p *Paging) Process() {
	if p.Page < 1 {
		p.Page = defaultPage
	}
	if p.PageSize < 1 || p.PageSize > maxPageSize {
		p.PageSize = defaultSize
	}
}

// Offset returns the SQL-style offset for the current page.
func (p *Paging) Offset() int {
	return (p.Page - 1) * p.PageSize
}

// TotalPages returns the number of pages rounded up.
func (p *Paging) TotalPages() int {
	if p.Total <= 0 || p.PageSize <= 0 {
		return 0
	}
	return int((p.Total + int64(p.PageSize) - 1) / int64(p.PageSize))
}

// ---------------------------------------------------------------------------
// Page — generic paginated response
// ---------------------------------------------------------------------------

// Page is the JSON response envelope for any paginated list.
type Page[T any] struct {
	Total int64 `json:"total"`
	Page  int   `json:"page"`
	Items []T   `json:"items"`
}

func Of[T any](items []T, total int64, page int) *Page[T] {
	if items == nil {
		items = []T{}
	}
	return &Page[T]{
		Total: total,
		Page:  page,
		Items: items,
	}
}
