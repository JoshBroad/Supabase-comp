# Frontend Implementation Plan - Vibe-Architect

## 1. Project Initialization

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (optional but recommended)
- **State Management**: React Context + Supabase Realtime
- **3D Visualization**: @react-three/fiber (for 3D schema graph)
- **2D Graph**: reactflow (for 2D schema graph)

### Initialization Steps
```bash
npx create-next-app@latest vibe-architect-frontend --typescript --app --tailwind --eslint
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install reactflow @react-three/fiber @react-three/drei three
npm install clsx tailwind-merge lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-toast
```

## 2. Directory Structure

```
vibe-architect-frontend/
├── app/
│   ├── page.tsx                    # Vibe Intake screen
│   ├── build/[sessionId]/page.tsx  # Build Room screen
│   ├── preview/[sessionId]/page.tsx # Preview screen
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global styles
├── components/
│   ├── ui/                        # shadcn-like components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Tabs.tsx
│   │   ├── Skeleton.tsx
│   │   └── Toast.tsx
│   ├── BuildTimeline.tsx          # Live build event feed
│   ├── PresenceBar.tsx            # Real-time presence indicator
│   ├── SchemaGraph2D.tsx          # 2D schema visualization
│   ├── SchemaGraph3D.tsx          # 3D schema visualization
│   ├── DriftAlerts.tsx            # Drift detection alerts
│   ├── PreviewTabs.tsx            # Preview screen tabs
│   ├── VibeIntakeForm.tsx         # Vibe specification form
│   └── TemplatePicker.tsx         # Template selection
├── lib/
│   ├── supabaseClient.ts          # Supabase client setup
│   ├── types.ts                   # Shared TypeScript types
│   ├── realtime.ts                # Real-time subscription logic
│   ├── api.ts                     # API client functions
│   └── utils.ts                   # Utility functions
├── public/
└── package.json
```

## 3. Component Specifications

### BuildTimeline Component
**Purpose**: Display live build events with real-time updates
**Props**:
```typescript
interface BuildTimelineProps {
  sessionId: string;
  events: BuildEvent[];
  onEventUpdate: (event: BuildEvent) => void;
}
```
**Features**:
- Auto-scroll to latest events
- Timestamp formatting
- Event type badges (success, warning, error)
- Loading skeleton for initial state

### PresenceBar Component
**Purpose**: Show real-time AI presence and current activity
**Props**:
```typescript
interface PresenceBarProps {
  presence: PresenceState[];
  currentFocus?: { type: string; name: string };
}
```
**Features**:
- Animated avatar indicators
- "Architect is doing X" status text
- Progress indicator for current step

### SchemaGraph2D Component
**Purpose**: Visualize database schema as interactive 2D graph
**Props**:
```typescript
interface SchemaGraph2DProps {
  nodes: SchemaNode[];
  edges: SchemaEdge[];
  activeFocus?: { type: string; name: string };
}
```
**Features**:
- reactflow-based implementation
- Animated node addition
- Table/column information on hover
- Zoom and pan controls

### SchemaGraph3D Component
**Purpose**: 3D visualization of database schema
**Props**:
```typescript
interface SchemaGraph3DProps {
  nodes: SchemaNode[];
  edges: SchemaEdge[];
  activeFocus?: { type: string; name: string };
}
```
**Features**:
- @react-three/fiber implementation
- Orbital camera controls
- Sphere nodes with labels
- Animated edge connections

### VibeIntakeForm Component
**Purpose**: Collect project specifications and options
**Props**:
```typescript
interface VibeIntakeFormProps {
  onSubmit: (data: VibeIntakeData) => void;
  loading?: boolean;
}
```
**Features**:
- Textarea for vibe specification
- Template picker dropdown
- Toggle switches for analytics and drift detection
- Form validation

## 4. State Management Architecture

### Global State Structure
```typescript
interface AppState {
  currentSession?: BuildSession;
  buildEvents: BuildEvent[];
  presence: PresenceState[];
  schema: {
    nodes: SchemaNode[];
    edges: SchemaEdge[];
  };
  driftAlerts: DriftAlert[];
  ui: {
    loading: boolean;
    error?: string;
  };
}
```

### Context Providers
1. **SessionContext**: Manages current build session
2. **RealtimeContext**: Handles WebSocket subscriptions
3. **SchemaContext**: Manages schema graph state
4. **UIContext**: Global UI state (loading, errors)

### Real-time Integration
```typescript
// Real-time subscription setup
const channel = supabaseClient
  .channel(`build:${sessionId}`)
  .on('presence', { event: 'sync' }, () => {
    // Update presence state
  })
  .on('broadcast', { event: 'build_event' }, (payload) => {
    // Handle build events
  })
  .subscribe();
```

## 5. Routing Structure

### Page Routes
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | VibeIntakePage | Landing page for session creation |
| `/build/[sessionId]` | BuildRoomPage | Real-time build monitoring |
| `/preview/[sessionId]` | PreviewPage | App preview and testing |

### API Routes (if needed)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/proxy/sessions` | POST | Proxy session creation |
| `/api/proxy/sessions/[id]` | GET | Proxy session data |
| `/api/proxy/sessions/[id]/events` | GET | Proxy event history |

## 6. API Integration Points

### Backend API Client
```typescript
// lib/api.ts
export const api = {
  createSession: async (data: VibeIntakeData): Promise<{ sessionId: string }> => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  getSession: async (sessionId: string): Promise<BuildSession> => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/sessions/${sessionId}`);
    return response.json();
  },
  
  getEvents: async (sessionId: string): Promise<BuildEvent[]> => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/sessions/${sessionId}/events`);
    return response.json();
  }
};
```

### Supabase Integration
```typescript
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## 7. Type Definitions

### Core Types (lib/types.ts)
```typescript
export interface BuildSession {
  id: string;
  status: 'pending' | 'building' | 'succeeded' | 'failed';
  template: string;
  vibeText: string;
  environment?: {
    projectRef?: string;
    branchRef?: string;
    dashboardUrl?: string;
    previewConfig?: any;
  };
  options: {
    enableAnalytics: boolean;
    enableDriftSentinel: boolean;
  };
}

export interface BuildEvent {
  id: string;
  ts: string;
  type: 'plan_created' | 'environment_created' | 'table_created' | 'rls_enabled' | 'policy_created' | 'edge_function_deployed' | 'analytics_configured' | 'build_succeeded' | 'build_failed' | 'drift_detected';
  message: string;
  payload?: any;
}

export interface PresenceState {
  actor: 'architect' | 'user';
  step: string;
  focus?: { type: string; name: string };
  progress: number;
}

export interface DriftAlert {
  id: string;
  severity: 'info' | 'warning' | 'error';
  resource: string;
  recommendation: string;
  specChunkId?: string;
}

export interface SchemaNode {
  id: string;
  label: string;
  type: 'table' | 'view' | 'function';
  meta?: any;
}

export interface SchemaEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}
```

## 8. UI/UX Implementation Details

### Color Scheme
- **Background**: `bg-zinc-950` (dark) or `bg-white` (light)
- **Text**: `text-zinc-50` (dark) or `text-zinc-900` (light)
- **Success**: `bg-emerald-500`
- **Warning**: `bg-amber-500`
- **Error**: `bg-rose-500`

### Component Styling Patterns
```typescript
// Card component pattern
const Card = ({ children, className }) => (
  <div className={cn(
    "rounded-2xl shadow-sm border bg-card text-card-foreground",
    className
  )}>
    {children}
  </div>
);
```

### Animation Guidelines
- Event insertion: `transition-all duration-300 ease-in-out`
- Node creation: `animate-pulse` followed by `transition-opacity`
- Presence updates: `transition-transform duration-200`

## 9. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_BACKEND_BASE_URL=https://api.vibe-architect.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_REALTIME_URL=wss://your-project.supabase.co
```

## 10. Testing Strategy

### Manual Acceptance Tests
- [ ] Session creation from landing page
- [ ] Real-time event streaming
- [ ] Presence indicator updates
- [ ] Schema graph visualization
- [ ] Preview authentication flow
- [ ] RLS protection demonstration
- [ ] Drift alert rendering
- [ ] Analytics query execution

### Mock Data Strategy
```typescript
// Mock API responses for development
const mockEvents: BuildEvent[] = [
  { id: '1', ts: new Date().toISOString(), type: 'plan_created', message: 'Build plan created' },
  { id: '2', ts: new Date().toISOString(), type: 'environment_created', message: 'Environment provisioned' }
];
```

## 11. Deployment Considerations

### Build Configuration
- Enable TypeScript strict mode
- Configure ESLint for code quality
- Set up proper environment variable validation
- Optimize bundle size with code splitting

### Performance Optimizations
- Implement virtual scrolling for large event lists
- Use React.memo for expensive components
- Lazy load 3D visualization components
- Implement proper cleanup for WebSocket connections

## 12. Integration Notes

### Backend Integration Points
- REST API endpoints for session management
- WebSocket channels for real-time updates
- Supabase authentication integration
- Environment variable configuration

### Frontend-Backend Contract
- Stable API endpoints (`/sessions`, `/sessions/:id`, `/sessions/:id/events`)
- Real-time channel naming convention (`build:{sessionId}`)
- Event payload structure consistency
- Authentication token handling

This implementation plan provides a complete roadmap for building the Vibe-Architect frontend according to the specifications in frontend.md, with all necessary components, state management, and integration points clearly defined.