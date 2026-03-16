# AI Coding Rules

These rules must always be followed when generating or modifying code in this repository.
------------------------------------------------

# Project Stack

This is a **React + Vite project with Supabase**.

The project must always prioritize:

- fast builds
- optimized bundle size
- minimal runtime overhead
- scalable architecture

------------------------------------------------

# Code Quality Rules

1. Always write **modular, clean, and optimized code**.

2. Break large logic into reusable modules.
   - Avoid large files and long functions.
   - Prefer small, focused functions.

3. Always **remove dead, unused, or redundant code**.

4. Avoid duplicated logic.
   - If logic appears in multiple places, extract it into a reusable function or service.

5. Always detect and **fix code smells**.

A code smell is a characteristic in source code that indicates a deeper design problem even if the program still works. These smells signal poor design choices that may increase maintenance cost or introduce bugs later.

Common code smells that must be fixed:

- duplicate code
- unused variables
- dead code
- overly complex logic
- large functions
- magic numbers
- deeply nested conditions
- tight coupling between modules

6. Prefer **readable code over clever code**.

7. Always use meaningful variable and function names.

------------------------------------------------

# Architecture Rules

## Supabase Integration

All Supabase operations must go through **Supabase Edge Functions**.

Supabase Edge Functions are server-side functions that run globally on Supabase infrastructure and allow secure backend logic and API handling close to users. :contentReference[oaicite:1]{index=1}

Direct Supabase database access from the frontend is **NOT allowed**.

Frontend must NOT directly call:

- supabase.from()
- supabase.rpc()
- supabase.auth.admin()

Instead use this flow:

Frontend → Edge Function → Supabase

------------------------------------------------

# Edge Function Responsibilities

Edge functions must handle:

- database queries
- business logic
- data validation
- authorization and role checks
- external API calls
- secure operations

------------------------------------------------

# Frontend Integration Rules

Frontend must call APIs only through:

```
services/api.ts
```

This file acts as the **single integration layer** between frontend and backend.

Responsibilities of `services/api.ts`:

- call Supabase Edge Functions
- format API requests
- handle responses
- centralize all backend communication

Components should **never directly call edge functions**.

------------------------------------------------

# Separation of Concerns

Follow this structure:

```
components → UI rendering only
hooks      → state and reusable logic
services   → API communication
edge fn    → backend logic
```

------------------------------------------------


# React + Vite Performance Rules

Because this project uses **React + Vite**, the code must always be optimized for fast builds and small bundles.

Follow these rules:

1. Use **code splitting** for large components.

Example:

```js
const Dashboard = React.lazy(() => import("./pages/Dashboard"))
```

2. Lazy load heavy components, charts, or editors.

3. Avoid importing large libraries globally.

4. Use **dynamic imports** for rarely used features.

5. Avoid barrel files that slow module resolution.

6. Use **alias paths** in vite.config.js for cleaner imports.

Example:

```
resolve: {
  alias: {
    "@": "/src"
  }
}
```

7. Minimize dependencies and avoid unnecessary packages.

8. Analyze bundle size when builds grow large.

9. Avoid unnecessary re-renders in React.

10. Use memoization when needed:

```
React.memo
useMemo
useCallback
```

11. Optimize assets:

- compress images
- use WebP or AVIF formats
- lazy load images

12. Keep build output small by removing unused code and enabling tree shaking.

------------------------------------------------

# Performance Rules

Always ensure:

- minimal API calls
- optimized data fetching
- avoid unnecessary re-renders
- reuse cached data where possible

------------------------------------------------

# Security Rules

Never expose:

- Supabase service role keys
- database logic
- admin operations

All sensitive logic must run inside **Edge Functions**.

------------------------------------------------

# Final Principle

Every change must improve:

- readability
- modularity
- maintainability
- performance
- security
- bundle size
- build speed
- runtime performance