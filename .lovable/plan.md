

# Plan: Hide the Projects Module

## Summary

The Projects module is self-contained and only referenced from two integration points outside its own files. Hiding it requires changes in just **2 files** with no impact on other modules.

## Changes Required

### 1. Remove Projects nav item from Navbar (`src/components/Navbar.tsx`)
- Remove or comment out the line that pushes the `projects` nav item (line ~131):
  ```
  { id: 'projects', icon: FolderKanban, label: 'Projects', href: "/projects", ... }
  ```
- Remove the `FolderKanban` import if no longer used.

### 2. Comment out Project Management routes in `src/App.tsx`
- Comment out the 5 route definitions (lines ~519-523): `/projects`, `/projects/:id`, `/projects/:id/resources/:resourceId`, `/templates`, `/templates/:id`
- Comment out the corresponding lazy imports (~lines 193-197) for `ProjectsPage`, `ProjectDetailPage`, `ResourceDetailPage`, `TemplatesPage`, `TemplateBuilderPage`

## Impact Analysis

- **No other modules depend on the Projects module.** All PM-related code (`src/pages/pm/*`, `src/components/pm/*`, `src/hooks/useProjects.ts`, `src/hooks/usePMAI.ts`) is entirely self-contained.
- The dashboard (`Index.tsx`) has no references to projects.
- The feature flags system has no `projects` entry, so no DB changes needed.
- All PM files remain in the codebase (archived in place) and can be re-enabled by uncommenting the routes and nav item.

