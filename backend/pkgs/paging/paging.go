package paging

const (
	defaultPage = 1
	defaultSize = 10
	maxPageSize = 10
)

type Paging struct {
	Page     int   `json:"page"     form:"page"`
	PageSize int   `json:"pageSize" form:"pageSize"`
	Limit    int   `json:"-"        form:"limit"`
	Total    int64 `json:"total"    form:"-"`
}

func (p *Paging) Process() {
	if p.Page < 1 {
		p.Page = defaultPage
	}
	if p.PageSize <= 0 && p.Limit > 0 {
		p.PageSize = p.Limit
	}
	if p.PageSize < 1 || p.PageSize > maxPageSize {
		p.PageSize = defaultSize
	}
}

func (p *Paging) Offset() int {
	return (p.Page - 1) * p.PageSize
}

func (p *Paging) TotalPages() int {
	if p.Total <= 0 || p.PageSize <= 0 {
		return 0
	}
	return int((p.Total + int64(p.PageSize) - 1) / int64(p.PageSize))
}


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
