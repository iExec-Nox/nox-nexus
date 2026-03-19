# Nox Nexus

Interactive graph explorer for the Nox Protocol. Visualizes encrypted handle operations, their relationships, and operator activity from the on-chain subgraph.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Graph Rendering**: Sigma.js v3 (WebGL), Graphology
- **Graph Layout**: ForceAtlas2 (server-side, via Graphology)
- **Data Source**: GraphQL subgraph (on-chain handle events), Handle Gateway (resolution status)
- **Deployment**: Vercel (Team plan)

## Architecture

### Problem

The app depends on two external services:

- **Subgraph**: provides handle data (operators, relationships, timestamps). Each paginated fetch is a GraphQL query.
- **Handle Gateway**: checks if a handle is resolvable. One HTTP call per handle.

These services should only be queried when a user actually needs the data. Wasted requests (cron jobs polling when nobody is visiting, every user re-fetching the same data) add unnecessary load and slow down the experience.

### Current: Client-Side Only

```text
Browser
  1. Fetch handles from subgraph       ~2-5s (network, paginated GraphQL)
  2. Build graph (nodes/edges)          ~100ms
  3. ForceAtlas2 layout (positions)     ~1-3s (blocks UI)
  4. Sigma.js WebGL render              ~50ms
  5. Fetch handle statuses from Gateway ~1-3s (1 call per handle)
                                        ─────
                                        ~4-10s total, UI freezes during layout
```

Problems:

- Every user re-fetches the same subgraph data and re-computes the same layout
- ForceAtlas2 runs on the main thread, freezing the UI
- The Gateway gets hit by every visitor independently
- Beyond ~3,000 nodes, the browser struggles

### Target: On-Demand Server-Side Computation with ISR

```text
GET /api/graph/24

  Cache fresh (< 2 min)
  ──────────────────────
  CDN edge responds directly                     ~50ms
  No subgraph query, no Gateway call, no compute


  Cache stale (> 2 min)
  ──────────────────────
  CDN edge responds with stale data              ~50ms
  Background revalidation triggers:
  ┌──────────────────────────────────────────┐
  │ Vercel Function (Node.js, up to 800s)    │
  │  1. Fetch handles from subgraph          │
  │  2. Build graph (nodes/edges)            │
  │  3. ForceAtlas2 layout (500 iterations)  │
  │  4. Fetch handle statuses from Gateway   │
  │  5. Return JSON (cached at CDN edge)     │
  └──────────────────────────────────────────┘
  Next request gets the fresh version


  No cache (first ever request)
  ──────────────────────────────
  Vercel Function computes on-demand             ~10-30s
  Result cached, all subsequent requests instant
```

```text
Browser
  1. fetch('/api/graph/24')             ~50ms (CDN edge)
  2. Sigma.js render (positions ready)  ~50ms
                                        ─────
                                        ~100ms total, no UI freeze
```

### Design Decisions

**On-demand, not cron.** A cron job queries the subgraph and Gateway every N minutes even when nobody is visiting. With ISR (Incremental Static Regeneration), the Vercel Function only runs when a user requests data and the cache is stale. Zero load when zero users.

**One computation serves all users.** The first user after cache expiry triggers the recomputation. All subsequent users within the TTL get the cached result instantly. Instead of N users each fetching the subgraph and computing the layout, the work happens once.

**Layout moves to the server.** ForceAtlas2 (the algorithm that positions nodes in 2D space) runs in the Vercel Function, not the browser. The client receives nodes with pre-computed x/y coordinates and renders them directly. No layout computation, no UI freeze.

**Handle statuses move to the server.** The Gateway is queried once per revalidation cycle from the Vercel Function. The client receives resolution status alongside the graph data, eliminating per-user Gateway calls.

**ISR stale-while-revalidate.** Users always get an instant response. If the cache is stale, they get the previous version while the new one is computed in the background. Only the very first request ever (cold start) has a longer wait.

### Auto-Detect Timeframe

When a user arrives without a `?timeframe` param, the app runs lightweight count queries in parallel against the subgraph for every available timeframe. It picks the largest timeframe that stays under 3,000 nodes, ensuring the graph loads without crashing the browser.

### What Changes Client-Side

Nothing in the rendering or interaction layer. Sigma.js, Graphology, all components (search, filters, detail panel) remain identical. The only change is in the data hook: `useHandleData` calls `/api/graph/24` instead of querying the subgraph directly.

| File | Change |
| --- | --- |
| `src/app/api/graph/[timeframe]/route.ts` | **New**: API route (fetch + build + layout + statuses) |
| `src/lib/use-handle-data.ts` | **Modified**: fetch from API route instead of subgraph |
| `src/lib/subgraph.ts` | Unchanged (reused server-side) |
| `src/lib/graph-adapter.ts` | Unchanged (reused server-side) |
| `src/lib/gateway.ts` | Unchanged (reused server-side) |
| `src/components/*` | Unchanged |

## Technology Choices

### Why Sigma.js + WebGL

Benchmarks from a 2025 PMC study testing 481 graph datasets (100 to 200K nodes):

| Renderer | Practical Limit | FPS at Scale |
| --- | --- | --- |
| SVG | ~1-5K elements | Unusable above 5K (each element = DOM node) |
| Canvas 2D | ~10-50K elements | Drops below 30 FPS around 50K |
| WebGL | ~100K+ elements | 58+ FPS where Canvas drops to 22 |

Sigma.js v3 uses **instanced rendering**: one draw call for all nodes, one for all edges. Combined with viewport culling (only renders visible nodes) and a spatial index, it handles up to ~50K nodes in a browser.

### Why Server-Side Layout (not client-side)

ForceAtlas2 is O(n log n) per tick with Barnes-Hut optimization. For 10K nodes at 500 iterations, that is billions of floating-point operations. Running this on the main thread freezes the UI for 1-10 seconds and every user pays the cost independently.

On the server, the layout runs once per revalidation cycle. The client receives pre-computed positions and renders instantly.

### Why ISR (not cron, not database)

| Approach | Load on subgraph/Gateway | User latency | Complexity |
| --- | --- | --- | --- |
| Client-side (current) | N calls per N users | 4-10s | Low |
| Cron + Blob | Constant (every 5 min, even with 0 users) | ~50ms | Medium |
| **ISR (target)** | Only when cache is stale AND a user visits | ~50ms | Low |

ISR is built into Next.js. One `revalidate = 120` export on the route handler. No cron config, no Blob storage, no separate cache layer. Vercel handles caching at the CDN edge automatically.

## Future Evolution

| Scale | Solution |
| --- | --- |
| 50K-100K nodes | Louvain community detection to cluster nodes at zoom-out |
| 100K+ nodes | Switch Sigma.js to cosmos.gl (GPU layout + rendering, handles 1M+ nodes) |
| Real-time layout manipulation | Rust + WASM ForceAtlas2 in a WebWorker for client-side re-simulation |
| 500K+ nodes | Server-side GPU layout (Graphistry-style) + entity-centric exploration |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```text
src/
├── app/
│   ├── page.tsx                  # Root redirect to /dashboard
│   ├── layout.tsx                # Global layout + metadata
│   ├── dashboard/
│   │   └── page.tsx              # Main dashboard (graph explorer)
│   └── api/
│       ├── handles-status/
│       │   └── route.ts          # Handle resolution status endpoint
│       └── graph/
│           └── [timeframe]/
│               └── route.ts      # Graph data endpoint (ISR cached)
├── lib/
│   ├── subgraph.ts               # GraphQL queries + data fetching
│   ├── gateway.ts                # Handle status checking
│   ├── use-handle-data.ts        # Data hooks (fetch, filter, select)
│   ├── graph-adapter.ts          # Handle data to graph nodes/edges
│   ├── graph-rendering.ts        # Sigma.js rendering utilities
│   ├── graph-layouts.ts          # Layout algorithms
│   ├── handle-decode.ts          # Handle decoding utilities
│   ├── types.ts                  # TypeScript interfaces
│   └── constants.ts              # Operators, colors, API URLs
└── components/
    ├── Header.tsx                # Nav bar, search, timeframe selector
    ├── Sidebar.tsx               # Operator filter panel
    ├── GraphCanvas.tsx           # Sigma.js graph renderer
    ├── GraphStats.tsx            # Node/edge count display
    ├── HandleDetailPanel.tsx     # Selected node detail panel
    ├── LoadingOverlay.tsx        # Loading state overlay
    ├── LayoutSelector.tsx        # Graph layout mode selector
    └── ZoomControls.tsx          # Zoom controls
```

## Deployment

Deployed on Vercel (Team plan). Push to `main` triggers automatic deployment.
