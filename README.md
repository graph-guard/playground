# ggproxy Playground

## Development

Install engine dependencies:
```bash
go mod tidy
```

Install frontend dependencies:
```bash
pnpm i
```

### Start dev frontend:

In the directory `engine` build Go by running:
```bash
GOOS=js GOARCH=wasm go build -o ../frontend/public/engine.wasm
```

Then start the frontend:
```bash
pnpm run dev
```
