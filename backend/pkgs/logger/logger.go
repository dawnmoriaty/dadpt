package logger

import (
	"fmt"
	"os"
	"runtime"
	"strings"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func Initialize(env string) {
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	if env == "development" {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
		log.Logger = log.Output(zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: "15:04:05",
		})
	} else {
		log.Logger = zerolog.New(os.Stdout).With().Timestamp().Logger()
	}
}

func Info(msg string, args ...interface{}) {
	log.Info().Msgf(msg, args...)
}

func Debug(msg string, args ...interface{}) {
	log.Debug().Msgf(msg, args...)
}

func Warn(msg string, args ...interface{}) {
	log.Warn().Msgf(msg, args...)
}

func Error(msg string, args ...interface{}) {
	log.Error().Msgf(msg, args...)
}

func ErrorWithStack(err error, msg string) {
	if err == nil {
		return
	}

	var stackLines []string
	for i := 1; i < 15; i++ { // Skip this function, capture up to 15 frames
		pc, file, line, ok := runtime.Caller(i)
		if !ok {
			break
		}
		fn := runtime.FuncForPC(pc)
		fnName := "unknown"
		if fn != nil {
			fnName = fn.Name()
			if idx := strings.LastIndex(fnName, "/"); idx >= 0 {
				fnName = fnName[idx+1:]
			}
		}
		stackLines = append(stackLines, fmt.Sprintf("\tat %s(%s:%d)", fnName, file, line))
	}

	log.Error().
		Err(err).
		Str("stack", "\n"+strings.Join(stackLines, "\n")).
		Msg(msg)
}

func ErrorWithCaller(err error, msg string) {
	if err == nil {
		return
	}

	_, file, line, ok := runtime.Caller(1)
	if !ok {
		log.Error().Err(err).Msg(msg)
		return
	}

	log.Error().
		Err(err).
		Str("location", fmt.Sprintf("%s:%d", file, line)).
		Msg(msg)
}

type AppErrorInterface interface {
	Error() string
	GetStack() string
	GetRaw() error
}

func LogAppError(err interface{}) {
	if err == nil {
		return
	}

	type stackedError interface {
		Error() string
	}
	type rawError interface {
		Unwrap() error
	}

	errStr := fmt.Sprintf("%v", err)

	var rawErr error
	if re, ok := err.(rawError); ok {
		rawErr = re.Unwrap()
	}

	type hasStack interface {
		GetStackTrace() string
	}

	event := log.Error()

	if rawErr != nil {
		event = event.Err(rawErr)
	}

	var stackLines []string
	for i := 2; i < 15; i++ {
		pc, file, line, ok := runtime.Caller(i)
		if !ok {
			break
		}
		fn := runtime.FuncForPC(pc)
		fnName := "unknown"
		if fn != nil {
			fnName = fn.Name()
			if idx := strings.LastIndex(fnName, "/"); idx >= 0 {
				fnName = fnName[idx+1:]
			}
		}
		stackLines = append(stackLines, fmt.Sprintf("\tat %s(%s:%d)", fnName, file, line))
	}

	event.
		Str("stack", "\n"+strings.Join(stackLines, "\n")).
		Msg(errStr)
}

func Fatal(args ...interface{}) {
	log.Fatal().Msgf("%v", args...)
}

func Fatalf(msg string, args ...interface{}) {
	log.Fatal().Msgf(msg, args...)
}
