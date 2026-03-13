package grpc

import (
	"fmt"

	"google.golang.org/grpc/encoding"
)

type rawCodec struct{}

func (rawCodec) Name() string {
	return "raw"
}

func (rawCodec) Marshal(v any) ([]byte, error) {
	switch value := v.(type) {
	case []byte:
		return value, nil
	case *[]byte:
		return *value, nil
	case string:
		return []byte(value), nil
	case *string:
		return []byte(*value), nil
	default:
		return nil, fmt.Errorf("raw codec expects bytes, got %T", v)
	}
}

func (rawCodec) Unmarshal(data []byte, v any) error {
	switch value := v.(type) {
	case *[]byte:
		*value = append((*value)[:0], data...)
		return nil
	case *string:
		*value = string(data)
		return nil
	default:
		return fmt.Errorf("raw codec expects *[]byte, got %T", v)
	}
}

func registerRawCodec() {
	encoding.RegisterCodec(rawCodec{})
}
