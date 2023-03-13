package main

import (
	"fmt"
	"runtime/debug"
	"syscall/js"

	"github.com/graph-guard/ggproxy/pkg/config"
	"github.com/graph-guard/ggproxy/pkg/engine/playmon"
	"github.com/graph-guard/ggproxy/pkg/gqlparse"
	"github.com/graph-guard/gqt/v4"
	"github.com/vektah/gqlparser/v2"
	"github.com/vektah/gqlparser/v2/ast"
)

var engine *playmon.Engine

type Template struct{ ID, Source string }

func Init(this js.Value, args []js.Value) (errors any) {
	defer handlePanic()

	schemaSrc := args[0].String()
	templates := make([]Template, args[1].Length())
	for i := 0; i < args[1].Length(); i++ {
		o := args[1].Index(i)
		templates[i].ID = o.Get("id").String()
		templates[i].Source = o.Get("source").String()
	}

	schema, err := gqlparser.LoadSchema(&ast.Source{
		Name:  "schema.graphqls",
		Input: schemaSrc,
	})
	if err != nil {
		return map[string]any{
			"code":   "SCHEMA_ERR",
			"errors": []any{fmt.Sprintf("parsing schema: %v", err)},
		}
	}

	templateDefinitions := make(map[string]*config.Template, len(templates))
	templatesEnabled := make([]*config.Template, len(templates))
	p, err := gqt.NewParser([]gqt.Source{{
		Name:    "schema.graphqls",
		Content: schemaSrc,
	}})
	if err != nil {
		return map[string]any{
			"code":   "INIT_GQT_PARSER",
			"errors": []any{fmt.Sprintf("initializing GQT parser: %v", err)},
		}
	}

	for i, tm := range templates {
		opr, _, errs := p.Parse([]byte(tm.Source))
		if errs != nil {
			errors := make([]any, len(errs))
			for i, e := range errs {
				errors[i] = js.ValueOf(fmt.Sprintf(
					"%d:%d: %s", e.Line, e.Column, e.Msg,
				))
			}
			return map[string]any{
				"code":   "TEMPLATE_ERR",
				"errors": errors,
			}
		}

		t := &config.Template{
			ID:          tm.ID,
			GQTTemplate: opr,
			Source:      []byte(tm.Source),
			Enabled:     true,
			FilePath:    tm.ID,
		}
		templateDefinitions[tm.ID] = t
		templatesEnabled[i] = t
	}

	engine = playmon.New(&config.Service{
		ID:               "playground",
		Templates:        templateDefinitions,
		TemplatesEnabled: templatesEnabled,
		Enabled:          true,
		Schema:           schema,
	})
	return nil
}

func MatchAll(
	this js.Value,
	args []js.Value,
) any {
	defer handlePanic()

	if engine == nil {
		return nil
	}

	query := args[0].String()
	operationName := args[1].String()
	variablesJSON := args[2].String()

	var oprName []byte
	if operationName != "" {
		oprName = []byte(operationName)
	}
	var varsJSON []byte
	if variablesJSON != "" {
		varsJSON = []byte(variablesJSON)
	}

	result := map[string]any{}
	matchedTemplateIDs := []any{}
	engine.Match(
		[]byte(query), oprName, varsJSON,
		func(operation, selectionSet []gqlparse.Token) (stop bool) {
			return false
		},
		func(t *config.Template) (stop bool) {
			matchedTemplateIDs = append(matchedTemplateIDs, t.ID)
			return false
		},
		func(err error) {
			result["error"] = err.Error()
		},
	)
	result["matched"] = matchedTemplateIDs
	return result
}

func handlePanic() {
	if err := recover(); err != nil {
		event := js.Global().Get("CustomEvent").New("panic", map[string]any{
			"detail": map[string]any{
				"error":      fmt.Sprintf("%v", err),
				"stackTrace": string(debug.Stack()),
			},
		})
		js.Global().Call("dispatchEvent", event)
	}
}

// TODO: remove say()
func say(this js.Value, inputs []js.Value) any {
	defer handlePanic()
	panic("test")
	return "Engine says: " + inputs[0].String()
}

func main() {
	api := js.Global().Get("engine")
	if api.IsUndefined() {
		api = js.Global().Get("Object").New()
		js.Global().Set("engine", api)
	}

	// API endpoints should also be defined in the frontend in "src/stores/engine.ts" in the "EngineAPI" interface
	api.Set("say", js.FuncOf(say))
	api.Set("init", js.FuncOf(Init))
	api.Set("matchAll", js.FuncOf(MatchAll))

	select {}
}
