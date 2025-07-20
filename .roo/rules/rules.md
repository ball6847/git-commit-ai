Requirement Documents
- `docs/requirements.md` always read this when working with features

Technical Constraints
- Use Deno 2.4 and TypeScript 5
- See `deno.json` for import alias and common script for running project related tasks
- Use cliffy command line interface framework

Context7 LibraryID for Documentation Look up
- For deno, use `denoland/doc` with `tokens=500`
- For cliffy, use `c4spar/deno-cliffy`  with `tokens=500`
- For OpenRouter. use `openrouter.ai/llmstxt` with `tokens=500`
- Try to use specific `topic` as much as possible to get relavant result
- Stop looking up after 3 attempts, then use jina `search_web` tool instead
- You have 2 attempts limit for jina `search_web`, stop the task and wait for further instruction
