# Nox Nexus

Interactive graph explorer for the Nox Protocol. Visualizes encrypted handle operations, their relationships, and operator activity from the on-chain subgraph.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Graph Rendering**: cosmos.gl (WebGL, GPU-accelerated force layout + rendering)
- **Data Source**: GraphQL subgraph (on-chain handle events), Handle Gateway (resolution status)
- **Deployment**: Vercel (Team plan)

## Pages

### Dashboard (`/dashboard`)

Graph explorer with real-time visualization of handle operations. Features:

- **Graph canvas**: force-directed layout rendered via cosmos.gl (WebGL)
- **Search**: by handle ID, Ethereum address, or transaction hash
- **Operator filters**: toggle visibility per operator type (sidebar)
- **Timeframe selector**: 1h, 2h, 6h, 24h, 48h (default), 7d, 30d, All
- **Handle detail panel**: click a node to see type, operator, resolution status, parents, children, roles
- **Unresolved highlighting**: toggle to visually flag unresolved handles

### Trace (`/trace`)

Handle computation tracer. Enter a handle ID to trace its ancestry back to the "patient zero": the first resolved handle(s) in the computation chain (typically encrypted inputs).

- **BFS upward traversal**: walks parent handles level by level
- **Early termination**: stops a branch when a resolved handle is found
- **Streaming UI**: ancestor levels appear progressively as they're discovered
- **Visual chain**: vertical layout with patient zeros (green) at top, queried handle (accent) in middle, children below

## Architecture

### Data Flow

The app uses a two-layer data architecture:

1. **API routes** (server-side): fetch from the subgraph and gateway, build the graph, cache with ISR
2. **Client hooks**: call the API routes, manage UI state

```text
GET /api/graph/48

  Cache fresh (< 2 min)
    CDN edge responds directly                     ~50ms

  Cache stale (> 2 min)
    CDN serves stale data, background revalidation:
    ┌──────────────────────────────────────────┐
    │ Vercel Function                          │
    │  1. Fetch handles from subgraph          │
    │  2. Build graph (nodes/edges)            │
    │  3. Return JSON (cached at CDN edge)     │
    └──────────────────────────────────────────┘

  No cache (first request)
    Vercel Function computes on-demand             ~5-15s
    Result cached, subsequent requests instant
```

### Design Decisions

**On-demand, not cron.** ISR only triggers when a user visits and the cache is stale. Zero load when zero users.

**One computation serves all users.** The first request after cache expiry triggers recomputation. All subsequent users within the TTL get the cached result.

**Client-side layout.** cosmos.gl handles force-directed layout on the GPU. The server builds the graph (nodes/edges with sizes and colors), the client positions them with WebGL.

**Handle statuses fetched client-side.** After the graph loads, statuses are batch-fetched from the gateway proxy (`/api/handles-status`) in the background without blocking the initial render.

**ISR with `revalidate = 120`.** Built into Next.js. One export on the route handler. No cron, no blob storage, no separate cache layer.

## Project Structure

```text
src/
├── app/
│   ├── page.tsx                       # Root redirect to /dashboard
│   ├── layout.tsx                     # Global layout + metadata
│   ├── globals.css                    # Theme, custom properties, utilities
│   ├── dashboard/
│   │   ├── page.tsx                   # Graph explorer page
│   │   └── opengraph-image.tsx        # OG image generation
│   ├── trace/
│   │   └── page.tsx                   # Handle trace page
│   └── api/
│       ├── graph/[timeframe]/
│       │   └── route.ts              # Graph data endpoint (ISR cached)
│       └── handles-status/
│           └── route.ts              # Gateway proxy for handle resolution
├── lib/
│   ├── subgraph.ts                   # GraphQL queries + paginated fetching
│   ├── gateway.ts                    # Handle status batch checking
│   ├── graph-adapter.ts             # Handle data -> graph nodes/edges
│   ├── handle-decode.ts             # Decode type, chain ID, version from handle bytes
│   ├── types.ts                     # TypeScript interfaces
│   ├── constants.ts                 # Operators, colors, API URLs, graph sizing
│   ├── search.ts                    # Search query validators (address, tx hash)
│   ├── utils.ts                     # Shared utilities (truncateHex, mixWithRed)
│   ├── use-handle-data.ts           # Hook: graph data fetching + status resolution
│   ├── use-handle-filtering.ts      # Hook: search, operator filtering, chain traversal
│   ├── use-node-selection.ts        # Hook: selected node detail panel state
│   └── use-trace.ts                 # Hook: BFS upward traversal for trace page
└── components/
    ├── Header.tsx                    # Nav bar, search, timeframe selector
    ├── Sidebar.tsx                   # Operator filter panel
    ├── GraphCanvas.tsx               # cosmos.gl graph renderer
    ├── GraphStats.tsx                # Node/edge count display
    ├── HandleDetailPanel.tsx         # Selected node detail panel
    ├── TraceChain.tsx                # Vertical trace chain visualization
    ├── LoadingOverlay.tsx            # Loading state overlay
    └── ZoomControls.tsx              # Zoom in/out/reset controls
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deployed on Vercel (Team plan). Push to `main` triggers automatic deployment.
