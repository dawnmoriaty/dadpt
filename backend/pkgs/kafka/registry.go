package kafka

import "sync"

// Registry is a centralized catalog of Kafka topic definitions.
// Modules register their topics at startup; the client uses the registry to
// ensure all topics exist before producing or consuming.
type Registry struct {
	mu     sync.RWMutex
	topics map[string]TopicDefinition
}

// NewRegistry creates an empty topic registry.
func NewRegistry() *Registry {
	return &Registry{
		topics: make(map[string]TopicDefinition),
	}
}

// Register adds or replaces a topic definition in the registry.
// Duplicate names overwrite the previous definition (last-write-wins).
func (r *Registry) Register(td TopicDefinition) {
	if !td.Validate() {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.topics[td.Name] = td
}

// Get returns the definition for a topic name, or false if not found.
func (r *Registry) Get(name string) (TopicDefinition, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	td, ok := r.topics[name]
	return td, ok
}

// All returns all registered topic definitions as a slice.
func (r *Registry) All() []TopicDefinition {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]TopicDefinition, 0, len(r.topics))
	for _, td := range r.topics {
		result = append(result, td)
	}
	return result
}

// Names returns all registered topic names.
func (r *Registry) Names() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	names := make([]string, 0, len(r.topics))
	for name := range r.topics {
		names = append(names, name)
	}
	return names
}

// Len returns the number of registered topics.
func (r *Registry) Len() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.topics)
}
