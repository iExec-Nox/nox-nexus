# Nox Nexus

Interactive graph explorer for the Nox Protocol. Visualizes encrypted handle operations, their relationships, and operator activity across supported networks (Arbitrum Sepolia, Ethereum Sepolia).

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Graph Rendering**: cosmos.gl (WebGL, GPU-accelerated force layout + rendering)
- **Data Source**: Hasura GraphQL API over the nox-observer database (handles, relationships, resolution status), subgraph (ACL roles only)
- **Deployment**: Vercel (Team plan)

## Pages

### Dashboard (`/dashboard`)

Graph explorer with real-time visualization of handle operations. Features:

- **Graph canvas**: force-directed layout rendered via cosmos.gl (WebGL)
- **Network selector**: switch between Arbitrum Sepolia and Ethereum Sepolia
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

1. **API routes** (server-side): fetch handles from Hasura, build the graph, cache with ISR
2. **Client hooks**: call the API routes (graph) and Hasura/subgraph directly (search, detail, trace), manage UI state

```text
GET /api/graph/421614/48

  Cache fresh (< 2 min)
    CDN edge responds directly                     ~50ms

  Cache stale (> 2 min)
    CDN serves stale data, background revalidation:
    ┌──────────────────────────────────────────┐
    │ Vercel Function                          │
    │  1. Fetch handles from Hasura            │
    │  2. Build graph (nodes/edges)            │
    │  3. Return JSON (cached at CDN edge)     │
    └──────────────────────────────────────────┘

  No cache (first request)
    Vercel Function computes on-demand
    Result cached, subsequent requests instant
```

### Design Decisions

**On-demand, not cron.** ISR only triggers when a user visits and the cache is stale. Zero load when zero users.

**One computation serves all users.** The first request after cache expiry triggers recomputation. All subsequent users within the TTL get the cached result.

**Client-side layout.** cosmos.gl handles force-directed layout on the GPU. The server builds the graph (nodes/edges with sizes and colors), the client positions them with WebGL.

**Resolution status ships with the graph.** The observer database stores `resolved_at` per handle, so each node carries its resolution status. No separate status round-trip.

**Subgraph for ACL only.** Handle roles (ADMIN/VIEWER) and address search come from the per-chain subgraph, which is the only place ACL data is indexed. The detail panel loads it as a non-blocking enrichment.

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
│       └── graph/[chainId]/[timeframe]/
│           └── route.ts              # Graph data endpoint (ISR cached)
├── lib/
│   ├── chains.ts                     # Supported networks, Hasura + subgraph URLs, explorers
│   ├── hasura.ts                     # Hasura GraphQL queries + paginated fetching
│   ├── subgraph.ts                   # Subgraph queries (ACL roles, address search)
│   ├── graph-adapter.ts             # Handle data -> graph nodes/edges
│   ├── handle-decode.ts             # Decode type, chain ID, version from handle bytes
│   ├── types.ts                     # TypeScript interfaces
│   ├── constants.ts                 # Operators, colors, graph sizing
│   ├── search.ts                    # Search query validators (address, tx hash)
│   ├── utils.ts                     # Shared utilities (truncateHex, mixWithRed)
│   ├── use-handle-data.ts           # Hook: graph data fetching + status resolution
│   ├── use-handle-filtering.ts      # Hook: search, operator filtering, chain traversal
│   ├── use-node-selection.ts        # Hook: selected node detail panel state
│   └── use-trace.ts                 # Hook: BFS upward traversal for trace page
└── components/
    ├── Header.tsx                    # Nav bar, network selector, search, timeframe selector
    ├── Sidebar.tsx                   # Operator filter panel
    ├── GraphCanvas.tsx               # cosmos.gl graph renderer
    ├── GraphStats.tsx                # Node/edge count display
    ├── HandleDetailPanel.tsx         # Selected node detail panel
    ├── TraceChain.tsx                # Vertical trace chain visualization
    ├── LoadingOverlay.tsx            # Loading state overlay
    └── ZoomControls.tsx              # Zoom in/out/reset controls
```

## License

This project is licensed under the [MIT License](./LICENSE) © iExec.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deployed on Vercel (Team plan). Push to `main` triggers automatic deployment.
