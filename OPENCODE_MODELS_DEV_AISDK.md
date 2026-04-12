# How OpenCode Achieves Dynamic Model Provider Support

This document explains how OpenCode uses **models.dev** as an external model database and the **Vercel AI SDK** to support dynamic providers and models at runtime — without requiring a new compilation or release when a new provider or model is added.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenCode Runtime                         │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐  │
│  │  models.dev │───▶│  Provider    │───▶│  Vercel AI SDK     │  │
│  │  (external  │    │  System      │    │  (bundled + dynamic│  │
│  │   database) │    │  (merge +    │    │   npm install)     │  │
│  │             │    │   resolve)   │    │                    │  │
│  └─────────────┘    └──────┬───────┘    └────────────────────┘  │
│                            │                                    │
│  ┌─────────────┐    ┌──────▼───────┐    ┌────────────────────┐  │
│  │  opencode   │───▶│  Config      │───▶│  Custom Loaders     │  │
│  │  .json      │    │  (user +     │    │  (per-provider      │  │
│  │             │    │   project)   │    │   SDK overrides)   │  │
│  └─────────────┘    └──────────────┘    └────────────────────┘  │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐                            │
│  │  Auth       │───▶│  Env Vars    │                            │
│  │  (OAuth/API │    │  (API keys) │                            │
│  │   keys)     │    │             │                            │
│  └─────────────┘    └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. The External Model Database: models.dev

### What is models.dev?

[models.dev](https://models.dev) is an open-source (MIT-licensed) database of AI model specifications, pricing, and capabilities, maintained by the same team behind OpenCode (anomalyco/SST). It stores provider and model metadata as TOML files in a GitHub repo and exposes them via a public JSON API.

**Repository:** https://github.com/anomalyco/models.dev\
**License:** MIT\
**API endpoint:** `https://models.dev/api.json`

### Data Structure

Each provider entry in the API contains:

```jsonc
{
  "anthropic": {
    "id": "anthropic",
    "name": "Anthropic",
    "env": ["ANTHROPIC_API_KEY"], // env vars for auth
    "npm": "@ai-sdk/anthropic", // AI SDK package to use
    "api": "https://api.anthropic.com", // (optional) base URL for openai-compatible
    "models": {
      "claude-sonnet-4-5": {
        "id": "claude-sonnet-4-5",
        "name": "Claude Sonnet 4.5",
        "attachment": true,
        "reasoning": true,
        "tool_call": true,
        "temperature": true,
        "release_date": "2025-09-29",
        "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
        "cost": {
          "input": 3,
          "output": 15,
          "cache_read": 0.3,
          "cache_write": 3.75
        },
        "limit": { "context": 200000, "output": 64000 }
        // ... more fields
      }
    }
  }
}
```

Key fields that enable dynamic behavior:

| Field                 | Purpose                                                                        |
| --------------------- | ------------------------------------------------------------------------------ |
| `env`                 | Which environment variables hold the API key — used for auto-discovery         |
| `npm`                 | Which Vercel AI SDK package to instantiate — **this is the bridge to the SDK** |
| `api`                 | Base URL (for `@ai-sdk/openai-compatible` providers)                           |
| `models.*.cost`       | Pricing data used for cost tracking                                            |
| `models.*.limit`      | Context/output token limits used for overflow detection                        |
| `models.*.modalities` | Input/output capabilities used for message transformation                      |

### How OpenCode Fetches the Database

Source: `packages/opencode/src/provider/models.ts`

```typescript
// Three-tier loading strategy:
export const Data = lazy(async () => {
  // 1. Try local cache file first
  const result = await Filesystem.readJson(
    Flag.OPENCODE_MODELS_PATH ?? filepath,
  ).catch(() => {});
  if (result) return result;

  // 2. Try bundled snapshot (generated at build time)
  const snapshot = await import('./models-snapshot')
    .then((m) => m.snapshot)
    .catch(() => undefined);
  if (snapshot) return snapshot;

  // 3. Fetch from models.dev API at runtime
  if (Flag.OPENCODE_DISABLE_MODELS_FETCH) return {};
  const json = await fetch(`${url()}/api.json`).then((x) => x.text());
  return JSON.parse(json);
});
```

**Caching and refresh strategy:**

- The fetched data is written to `~/.opencode/cache/models.json`
- A background refresh runs every **60 minutes** via `setInterval`
- The URL is configurable via `OPENCODE_MODELS_URL` env var
- Fetching can be disabled via `OPENCODE_DISABLE_MODELS_FETCH`

```typescript
// Auto-refresh in background
if (!Flag.OPENCODE_DISABLE_MODELS_FETCH) {
  ModelsDev.refresh();
  setInterval(
    async () => {
      await ModelsDev.refresh();
    },
    60 * 1000 * 60,
  ).unref();
}
```

**Why this matters for dynamic providers:** When a new provider or model is added to the models.dev repo, it automatically appears in OpenCode after the next refresh cycle — **no code change, no recompile, no new release needed**.

---

## 2. The Provider Resolution Pipeline

Source: `packages/opencode/src/provider/provider.ts`

Once the models.dev data is loaded, OpenCode runs a multi-step pipeline to resolve which providers are available and how to configure them:

### Step 1: Initialize Database from models.dev

```typescript
const modelsDev = await ModelsDev.get();
const database = mapValues(modelsDev, fromModelsDevProvider);
```

Each entry from models.dev is transformed into an internal `Provider.Info` object with resolved model schemas.

### Step 2: Merge User Config (opencode.json)

Users can override or extend the database in their config file:

```jsonc
// opencode.json
{
  "provider": {
    "my-custom-provider": {
      "name": "My Custom Provider",
      "npm": "@ai-sdk/openai-compatible",
      "api": "https://my-api.example.com/v1",
      "env": ["MY_API_KEY"],
      "models": {
        "my-model": {
          "name": "My Model",
          "attachment": true,
          "reasoning": false,
          "tool_call": true,
          "cost": { "input": 0, "output": 0 },
          "limit": { "context": 128000, "output": 8192 }
        }
      }
    }
  }
}
```

This merges with the models.dev database using `mergeDeep`, so user config extends but doesn't replace the external database.

### Step 3: Auto-Discover Credentials from Environment

```typescript
// Load env vars — if any of the provider's env vars are set, the provider is available
const env = Env.all();
for (const [providerID, provider] of Object.entries(database)) {
  const apiKey = provider.env.map((item) => env[item]).find(Boolean);
  if (!apiKey) continue;
  mergeProvider(providerID, { source: 'env', key: apiKey });
}
```

This means: if `ANTHROPIC_API_KEY` is set in the environment, the Anthropic provider is automatically activated. No config file needed.

### Step 4: Load Auth (OAuth / API keys)

OpenCode also supports stored auth credentials (from `opencode auth <provider>`):

```typescript
for (const [providerID, provider] of Object.entries(await Auth.all())) {
  if (provider.type === 'api') {
    mergeProvider(providerID, { source: 'api', key: provider.key });
  }
}
```

### Step 5: Apply Custom Loaders

Some providers need special handling beyond the default SDK setup. Custom loaders are functions that return provider-specific options and optional model construction overrides:

```typescript
const CUSTOM_LOADERS: Record<string, CustomLoader> = {
  async anthropic() {
    return {
      autoload: false,
      options: {
        headers: {
          'anthropic-beta': 'claude-code-20250219,interleaved-thinking-2025-05-14,...',
        },
      },
    };
  },
  async 'amazon-bedrock'(input) {
    // Complex AWS credential chain resolution
    return { autoload: true, options: { region, credentialProvider } };
  },
  async 'github-copilot'(input) {
    return {
      autoload: false,
      async getModel(sdk, modelID, options) {
        // Special: use responses API for GPT-5+, chat API otherwise
        return shouldUseCopilotResponsesApi(modelID) ? sdk.responses(modelID) : sdk.chat(modelID);
      },
    };
  },
  // ... more loaders for openrouter, vertex, gitlab, cloudflare, etc.
};
```

### Step 6: Filter by Enabled/Disabled Providers

```typescript
for (const [providerID, provider] of Object.entries(providers)) {
  if (!isProviderAllowed(providerID)) {
    delete providers[providerID];
    continue;
  }
  // Also filter out alpha/deprecated models, apply blacklist/whitelist
}
```

---

## 3. The Vercel AI SDK Integration

### Bundled Providers vs Dynamic npm Packages

OpenCode uses the **Vercel AI SDK** (also known as `ai` package) as the abstraction layer for all LLM interactions. The SDK provides a unified `LanguageModelV2` interface regardless of the underlying provider.

There are two ways OpenCode loads a provider SDK:

#### A. Bundled Providers (most common, zero-install)

The most popular providers are bundled directly into OpenCode's binary:

```typescript
const BUNDLED_PROVIDERS: Record<string, (options: any) => SDK> = {
  '@ai-sdk/amazon-bedrock': createAmazonBedrock,
  '@ai-sdk/anthropic': createAnthropic,
  '@ai-sdk/azure': createAzure,
  '@ai-sdk/google': createGoogleGenerativeAI,
  '@ai-sdk/google-vertex': createVertex,
  '@ai-sdk/openai': createOpenAI,
  '@ai-sdk/openai-compatible': createOpenAICompatible,
  '@openrouter/ai-sdk-provider': createOpenRouter,
  '@ai-sdk/xai': createXai,
  '@ai-sdk/mistral': createMistral,
  '@ai-sdk/groq': createGroq,
  '@ai-sdk/deepinfra': createDeepInfra,
  '@ai-sdk/cerebras': createCerebras,
  '@ai-sdk/cohere': createCohere,
  '@ai-sdk/gateway': createGateway,
  '@ai-sdk/togetherai': createTogetherAI,
  '@ai-sdk/perplexity': createPerplexity,
  '@ai-sdk/vercel': createVercel,
  '@gitlab/gitlab-ai-provider': createGitLab,
  '@ai-sdk/github-copilot': createGitHubCopilotOpenAICompatible,
};
```

#### B. Dynamic npm Install (for new/uncommon providers)

If a provider's npm package is not bundled, OpenCode **installs it at runtime** using Bun:

```typescript
// From getSDK() in provider.ts:
const bundledFn = BUNDLED_PROVIDERS[model.api.npm];
if (bundledFn) {
  // Use bundled version
  const loaded = bundledFn({ name: model.providerID, ...options });
  return loaded;
}

// Not bundled? Install it dynamically!
let installedPath: string;
if (!model.api.npm.startsWith('file://')) {
  installedPath = await BunProc.install(model.api.npm, 'latest');
} else {
  installedPath = model.api.npm; // local file:// path
}

const mod = await import(installedPath);
const fn = mod[Object.keys(mod).find((key) => key.startsWith('create'))!];
const loaded = fn({ name: model.providerID, ...options });
```

The `BunProc.install()` function (source: `packages/opencode/src/bun/index.ts`):

- Installs the npm package to `~/.opencode/cache/node_modules/<pkg>/`
- Uses Bun's package manager (`bun add`)
- Caches the installed version and checks for updates
- Returns the path for dynamic `import()`

**This is the key mechanism that enables zero-release dynamic providers.** When models.dev adds a new provider that uses an npm package not bundled with OpenCode, the runtime automatically installs and loads it.

### SDK Instance Caching

SDK instances are cached by a hash of `{ providerID, npm, options }` so the same provider configuration is only created once:

```typescript
const key = Bun.hash.xxHash32(
  JSON.stringify({
    providerID: model.providerID,
    npm: model.api.npm,
    options,
  }),
);
const existing = s.sdk.get(key);
if (existing) return existing;
```

---

## 4. The Complete Flow: From models.dev to Model Call

Here's the end-to-end flow when a user selects a model like `anthropic/claude-sonnet-4-5`:

```
1. Startup: models.dev/api.json → cache → Provider database

2. Provider resolution:
   models.dev data
   + opencode.json user overrides (merge)
   + env var detection (ANTHROPIC_API_KEY set? → activate anthropic)
   + stored auth credentials
   + custom loaders (anthropic → add beta headers)
   → Final list of active providers with models

3. User selects: anthropic/claude-sonnet-4-5

4. Provider.getModel("anthropic", "claude-sonnet-4-5")
   → Returns Model object with api.npm = "@ai-sdk/anthropic"

5. Provider.getLanguage(model)
   → getSDK(model):
     → model.api.npm = "@ai-sdk/anthropic"
     → BUNDLED_PROVIDERS["@ai-sdk/anthropic"] exists? YES
     → createAnthropic({ name: "anthropic", apiKey: "...", headers: {...} })
     → SDK instance cached
   → custom loader? YES (anthropic has one)
     → sdk.languageModel("claude-sonnet-4-5")
   → Returns LanguageModelV2 (Vercel AI SDK interface)

6. AI SDK handles the actual API call to Anthropic
```

For a **new provider not yet bundled**:

```
1. models.dev adds "newprovider" with npm: "@ai-sdk/newprovider"

2. Next refresh cycle (60 min), OpenCode fetches updated api.json

3. User sets NEWPROVIDER_API_KEY env var

4. User selects: newprovider/some-model

5. getSDK(model):
   → model.api.npm = "@ai-sdk/newprovider"
   → BUNDLED_PROVIDERS["@ai-sdk/newprovider"] exists? NO
   → BunProc.install("@ai-sdk/newprovider", "latest")
     → bun add @ai-sdk/newprovider@latest --cwd ~/.opencode/cache
   → import(installedPath)
   → Find create* function, call it with options
   → SDK instance cached

6. sdk.languageModel("some-model")
   → Returns LanguageModelV2
```

**No recompile. No new release. No code change.**

---

## 5. The `npm` Field: The Bridge Between Database and SDK

The `npm` field in the models.dev database is the critical link. It tells OpenCode **which Vercel AI SDK provider package** to use for a given provider. This enables:

### Provider-Level npm (default for all models)

```toml
# providers/anthropic/provider.toml
name = "Anthropic"
npm = "@ai-sdk/anthropic"
env = ["ANTHROPIC_API_KEY"]
```

### Model-Level npm Override

Individual models can override the npm package:

```toml
# If a specific model uses a different SDK
[provider]
npm = "@ai-sdk/openai-compatible"
api = "https://custom-endpoint.example.com/v1"
```

This means when models.dev adds a new provider, they just need to specify:

- Which npm package implements it (usually `@ai-sdk/openai-compatible` for OpenAI-compatible APIs)
- The base URL
- The environment variable for the API key

And it works automatically in OpenCode.

---

## 6. Configuration Overrides

Users can add or override anything from models.dev in their `opencode.json`:

### Adding a completely custom provider

```jsonc
{
  "provider": {
    "my-local-llm": {
      "name": "My Local LLM",
      "npm": "@ai-sdk/openai-compatible",
      "api": "http://localhost:8080/v1",
      "env": ["LOCAL_LLM_KEY"],
      "models": {
        "llama-3": {
          "name": "Llama 3",
          "attachment": false,
          "reasoning": false,
          "tool_call": true,
          "cost": { "input": 0, "output": 0 },
          "limit": { "context": 8192, "output": 4096 }
        }
      }
    }
  }
}
```

### Overriding a provider from models.dev

```jsonc
{
  "provider": {
    "anthropic": {
      "options": {
        "baseURL": "https://my-proxy.example.com",
        "apiKey": "sk-xxx"
      }
    }
  }
}
```

### Filtering models with whitelist/blacklist

```jsonc
{
  "provider": {
    "openai": {
      "whitelist": ["gpt-5", "gpt-5-mini", "gpt-5-nano"]
    }
  }
}
```

### Disabling/enabling providers globally

```jsonc
{
  "disabled_providers": ["openrouter"],
  "enabled_providers": ["anthropic", "openai"]
}
```

---

## 7. Message Transformation Layer

Source: `packages/opencode/src/provider/transform.ts`

Different providers have different quirks (message format requirements, caching headers, reasoning effort, etc.). OpenCode handles this with a transformation layer that takes the model's metadata from models.dev and applies provider-specific adjustments:

### Capabilities-Driven Transforms

```typescript
// Filter unsupported modalities based on model capabilities from models.dev
function unsupportedParts(msgs, model) {
  // If model.capabilities.input.image is false, replace image parts with text errors
}
```

### Provider-Specific Message Normalization

```typescript
// Anthropic: reject empty content messages
// Mistral: tool call IDs must be exactly 9 alphanumeric characters
// Claude: sanitize tool call IDs to alphanumeric + underscore
// Interleaved reasoning: move reasoning parts to providerOptions
```

### Caching Headers

Anthropic, Bedrock, and OpenRouter support prompt caching. The transform layer adds the appropriate cache control headers based on the provider ID:

```typescript
if (model.providerID === 'anthropic' || model.providerID.includes('bedrock')) {
  // Apply cacheControl: { type: "ephemeral" } to system and final messages
}
```

### Reasoning Effort / Variants

The `variants` system generates reasoning effort configurations per-model based on the npm package and model ID. This is entirely driven by the model metadata — when a new reasoning model is added to models.dev, the variant system automatically generates the correct reasoning configuration.

---

## 8. Summary: Why No Recompile Is Needed

| Layer                            | Mechanism                                                               | Dynamic?  |
| -------------------------------- | ----------------------------------------------------------------------- | --------- |
| **Model catalog**                | Fetched from models.dev at runtime, cached, auto-refreshed every 60 min | Yes       |
| **Provider credentials**         | Auto-discovered from env vars + stored auth                             | Yes       |
| **SDK loading (bundled)**        | Statically imported but resolved by npm string from database            | Partially |
| **SDK loading (unbundled)**      | Dynamically installed via `bun add` and `import()` at runtime           | Yes       |
| **User overrides**               | Merged from opencode.json at startup                                    | Yes       |
| **Provider-specific transforms** | Custom loaders resolved by provider ID at runtime                       | Yes       |
| **Message transformation**       | Driven by model capabilities from database                              | Yes       |

The combination of:

1. **External model database** (models.dev) for catalog data
2. **`npm` field** as the bridge to Vercel AI SDK provider packages
3. **Dynamic npm install + import** for unbundled providers
4. **Config merging** for user customization

means that when a new AI provider or model launches, it only needs to be added to the models.dev TOML files. OpenCode will automatically discover it, load the correct SDK, and make it available — **without a single line of code change or a new release**.

---

## Appendix: Key Source Files

| File                                          | Purpose                                                       |
| --------------------------------------------- | ------------------------------------------------------------- |
| `packages/opencode/src/provider/models.ts`    | Fetches and caches the models.dev database                    |
| `packages/opencode/src/provider/provider.ts`  | Provider resolution pipeline, SDK loading, model construction |
| `packages/opencode/src/provider/transform.ts` | Message normalization, caching, reasoning variants            |
| `packages/opencode/src/provider/auth.ts`      | OAuth/API key authentication for providers                    |
| `packages/opencode/src/provider/error.ts`     | Provider error parsing (overflow detection, retry logic)      |
| `packages/opencode/src/config/config.ts`      | Config loading, merging, schema definitions                   |
| `packages/opencode/src/bun/index.ts`          | Dynamic npm package installation                              |
| `packages/ui/vite.config.ts`                  | Provider icon fetching from models.dev                        |
