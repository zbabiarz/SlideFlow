# SlideFlow — Kirk’s Update Log

Purpose: running, date-stamped notes for changes made locally after cloning the partner’s GitHub repo. Audience is internal engineering (you and partner + AI assistants). Keep it concise but specific enough to reconstruct what changed and why.

## Collaboration & Git hygiene
- Default workflow: create a feature branch (`git checkout -b kirk/<short-topic>`), commit locally, then open a PR into your partner’s main branch. Avoid force-push to main.
- If your partner prefers, you can fork the repo and PR back to their origin; same branching rules apply.
- Keep secrets out of commits; `.env` and `.env.local` stay untracked (already gitignored).

## Baseline (GitHub import)
- Source: https://github.com/zbabiarz/SlideFlow
- Cloned: 2025-11-25
- Commit at clone: `b2c41dd` (default branch)
- Notes: Supabase env vars were missing locally; media library persisted only in component state; no docs folder in repo.

## 2025-11-25
- Added environment files locally (`.env`, `.env.local`) with Supabase URL/anon key; `src/lib/supabase.ts` now guards missing env vars to prevent blank-screen errors.
- Fixed storage path to match RLS (`<userId>/<date>/...`); `Generator` uploads now auto-add uploaded files into the media library after Supabase upload.
- `ContentLibraryContext`: fetches existing storage objects from Supabase (handles both `<userId>/...` and legacy `user_<userId>/...`), signs URLs, dedupes, and removes from storage when deleted in UI.
- `ImportLibraryModal`: importing remote library items now fetches and rehydrates them as `File` objects; added select-all toggle (with slate styling) in the Content Library header.
- Created this log under `docs/kirk-updates.md` for ongoing updates.

## How to extend this log
- Add new sections by date (`YYYY-MM-DD`) with bullets for changes, rationale, and any follow-up/TODOs.
- If you change collaboration workflow (branching, PR rules), append to the “Collaboration & Git hygiene” section rather than overwriting.
