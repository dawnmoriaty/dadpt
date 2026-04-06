package stringutils

import (
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

func LevenshteinDistance(left string, right string) int {
	if left == right {
		return 0
	}
	if left == "" {
		return len(right)
	}
	if right == "" {
		return len(left)
	}

	prev := make([]int, len(right)+1)
	for j := 0; j <= len(right); j++ {
		prev[j] = j
	}

	for i := 1; i <= len(left); i++ {
		current := make([]int, len(right)+1)
		current[0] = i
		for j := 1; j <= len(right); j++ {
			cost := 0
			if left[i-1] != right[j-1] {
				cost = 1
			}
			current[j] = MinInt(
				MinInt(current[j-1]+1, prev[j]+1),
				prev[j-1]+cost,
			)
		}
		prev = current
	}

	return prev[len(right)]
}

func MinInt(left int, right int) int {
	if left < right {
		return left
	}
	return right
}

func MaxInt(left int, right int) int {
	if left > right {
		return left
	}
	return right
}

func NormalizeLocationText(text string) string {
	trimmed := strings.TrimSpace(strings.ToLower(text))
	if trimmed == "" {
		return ""
	}

	normValue := norm.NFD.String(trimmed)
	builder := strings.Builder{}
	builder.Grow(len(normValue))
	for _, r := range normValue {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		switch r {
		case 'đ':
			builder.WriteRune('d')
		default:
			builder.WriteRune(r)
		}
	}

	return strings.Join(strings.Fields(builder.String()), " ")
}

func StripLocationNoise(text string) string {
	value := strings.TrimSpace(strings.ToLower(text))
	value = strings.ReplaceAll(value, "ben xe", "")
	value = strings.ReplaceAll(value, "bx", "")
	value = strings.ReplaceAll(value, "tram", "")
	return strings.TrimSpace(strings.Join(strings.Fields(value), " "))
}

func SharesTokenEdge(left string, right string) bool {
	if left == "" || right == "" {
		return false
	}
	return left[0] == right[0] || left[len(left)-1] == right[len(right)-1]
}

func IsApproximateToken(left string, right string) bool {
	distance := LevenshteinDistance(left, right)
	maxLength := MaxInt(len(left), len(right))
	if maxLength <= 3 {
		return distance <= 2 && SharesTokenEdge(left, right)
	}
	return distance <= 1
}

func FuzzyLocationNameScore(target string, name string) int {
	distance := LevenshteinDistance(target, name)
	maxLength := MaxInt(len(target), len(name))
	if maxLength >= 6 && distance <= 2 {
		return 80 - (distance * 5)
	}
	if maxLength >= 4 && distance == 1 {
		return 75
	}
	return 0
}

type LocationCandidate struct {
	Name     string
	City     string
	Keywords string
}

func ScoreLocationMatch(target string, candidate LocationCandidate) int {
	name := StripLocationNoise(NormalizeLocationText(candidate.Name))
	if name == "" {
		return 0
	}

	if name == target {
		return 100
	}

	if strings.Contains(name, target) || strings.Contains(target, name) {
		return 90
	}

	if score := FuzzyLocationNameScore(target, name); score > 0 {
		return score
	}

	targetTokens := strings.Fields(target)
	nameTokens := strings.Fields(name)
	if len(targetTokens) == 0 || len(nameTokens) == 0 {
		return 0
	}

	overlap := 0
	used := make([]bool, len(nameTokens))
	for _, token := range targetTokens {
		for i, c := range nameTokens {
			if used[i] {
				continue
			}
			if token == c {
				overlap += 20
				used[i] = true
				break
			}
			if IsApproximateToken(token, c) {
				overlap += 15
				used[i] = true
				break
			}
		}
	}

	score := overlap
	if strings.Contains(NormalizeLocationText(candidate.City), target) {
		score += 10
	}
	if strings.Contains(NormalizeLocationText(candidate.Keywords), target) {
		score += 20
	}

	return score
}
