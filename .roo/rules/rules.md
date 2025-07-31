Requirement Documents
- `docs/requirements.md` must be consulted before implementing any feature
- Contains: feature specifications, user stories, and acceptance criteria
- Does NOT cover: implementation details, code structure, or technical design

Technical Constraints
- Use Deno 2.4.0 runtime and TypeScript 5.0 compiler
- Import aliases defined in `deno.json` must be used for module resolution
- CLI tools must use [cliffy](https://c4spar.github.io/deno-cliffy/) framework for consistent command handling
- Project structure must follow:
  - `src/` for source code
  - `docs/` for documentation
  - `tests/` for test suites
- ❌ Do not use Deno versions <2.4.0 or TypeScript <5.0 without explicit approval

Context7 Documentation Protocol
1. Always use `resolve-library-id` before `get-library-docs` unless provided with explicit `/org/project` format
2. Valid library IDs:
   - Deno runtime: `/denoland/doc`
   - Cliffy CLI: `/c4spar/deno-cliffy`
   - OpenRouter API: `/openrouter.ai/llmstxt`
3. Usage requirements:
   - Set `tokens=500` for all documentation requests
   - Specify `topic` parameter for focused results (e.g., `topic=command-validation`)
   - Prioritize exact versioned IDs when available (e.g., `/vercel/next.js/v14.3.0`)
4. Fallback procedure:
   - After 3 failed Context7 attempts, use Jina `search_web` with:
     - Max 2 search attempts
     - `return_format=markdown`
     - `retain_images=all` when visual context is needed
