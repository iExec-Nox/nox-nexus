# Nox Nexus

Interactive graph explorer for the Nox Protocol. Visualizes encrypted handle operations, their relationships, and operator activity.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Graph Rendering**: cosmos.gl (WebGL, GPU-accelerated force layout + rendering)
- **Primary data source**: [nox-observer]([nox-observer](https://github.com/iExec-Nox/nox-observer/tree/main/sql)) Postgres database, read via **Prisma** (handles, relationships, resolution status). Multichain via the `chain_id` column.
- **Secondary data source**: GraphQL subgraph, used on demand only for per-handle fields the observer does not store (`roles`, `plaintext`, `isPubliclyDecryptable`) — fetched when a handle is opened, and for address search.
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

1. **API routes** (server-side): query the nox-observer Postgres database via Prisma, build the graph, cache with ISR. All Prisma access is server-only (`src/lib/handles-repo.ts`).
2. **Client hooks**: call the API routes, manage UI state. The subgraph is queried directly from the client only on demand (handle detail, address search).

```text
GET /api/graph/48?chainId=421614

  Cache fresh (< 2 min)
    CDN edge responds directly                     ~50ms

  Cache stale (> 2 min)
    CDN serves stale data, background revalidation:
    ┌──────────────────────────────────────────┐
    │ Vercel Function                          │
    │  1. Query handles from Postgres (Prisma) │
    │     filtered by chain_id                 │
    │  2. Build graph (nodes/edges + statuses) │
    │  3. Return JSON (cached at CDN edge)     │
    └──────────────────────────────────────────┘
```

### Design Decisions

**Postgres over subgraph for bulk data.** The graph, relationships, and resolution status (`resolved_at`) all come from the nox-observer database. This removes the dependency on the subgraph/gateway for the hot path and serves the resolution status in the same payload as the graph (no separate round-trip).

**Subgraph on demand only.** `roles`, `plaintext`, and `isPubliclyDecryptable` are not stored by the observer. They are fetched from the subgraph when a handle is opened (`src/lib/subgraph.ts`); address search also uses the subgraph (`handleRoles`).

**Multichain.** The observer database is multichain (`handles.chain_id`). Each chain is declared in `CHAINS` (`src/lib/constants.ts`) with its `chainId` and subgraph URL. A chain selector in the header drives `?chainId=`, which scopes every Postgres query and selects the subgraph endpoint.

**Client-side layout.** cosmos.gl handles force-directed layout on the GPU. The server builds the graph (nodes/edges with sizes and colors), the client positions them with WebGL.

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
│       │   └── route.ts              # Graph data endpoint (Postgres, ISR cached)
│       └── handles/
│           └── route.ts              # Postgres handle queries (chain/byIds/byTxHash)
├── generated/prisma/                # Prisma-generated client (gitignored)
├── lib/
│   ├── prisma.ts                    # PrismaClient singleton (PrismaPg adapter)
│   ├── handles-repo.ts              # Server-only Postgres data access (Prisma)
│   ├── handles-client.ts            # Client wrappers around /api/handles
│   ├── subgraph.ts                  # On-demand subgraph: handle detail + address search
│   ├── graph-adapter.ts             # Handle data -> graph nodes/edges
│   ├── handle-decode.ts             # Decode type, chain ID, version from handle bytes
│   ├── types.ts                     # TypeScript interfaces
│   ├── constants.ts                 # Chains, operators, colors, graph sizing
│   ├── search.ts                    # Search query validators (address, tx hash)
│   ├── utils.ts                     # Shared utilities (truncateHex, mixWithRed)
│   ├── use-handle-data.ts           # Hook: graph data fetching (+ statuses)
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

## License

This project is licensed under the [MIT License](./LICENSE) © iExec.

## Getting Started

This app reads from the [nox-observer](../nox-observer) Postgres database. Start it
first (see its README), then point `DATABASE_URL` at it.

```bash
cp .env.example .env       # then edit DATABASE_URL if needed
npm install                # runs `prisma generate` via postinstall
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable       | Description                                                        |
| -------------- | ------------------------------------------------------------------ |
| `DATABASE_URL` | Postgres connection string for the nox-observer database (Prisma). |

### Prisma

`prisma/schema.prisma` is a **read-only mirror** of the tables owned and migrated
by [nox-observer](https://github.com/iExec-Nox/nox-observer/tree/main/sql). nox-nexus never writes to the
database and never runs Prisma migrations. After changing the schema, regenerate
the client:

```bash
npm run prisma generate
```

Keep the models in sync with nox-observer's `schema.sql`.

## Deployment

Deployed on Vercel (Team plan). Push to `main` triggers automatic deployment.
