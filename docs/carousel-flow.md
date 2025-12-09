# Carousel Flow & Persistence (current contract)

End-to-end reference for how carousels move through Dashboard → SlideBoard → Generate Caption → Publish.

## Overview
- Dashboard creates an empty draft `carousel` row and navigates to SlideBoard with that id.
- SlideBoard is **local-only**: users arrange up to 10 slides without touching Supabase.
- Generate Caption persists slides to Supabase (uploads + `media` + `carousel_slide`), hydrates previews, and passes the carousel to Publish.
- Publish sets status to `ready`, offers schedule-to-calendar UI, and attempts best-effort slide order upserts.

## Lifecycle (happy path)
1) **Create (Dashboard)**
   - Insert `carousel` `{ title: 'Untitled Carousel', status: 'draft', aspect: 'square' }`.
   - Add to local list; set `currentCarousel`; navigate to SlideBoard with `state: { carousel }`.

2) **Arrange (SlideBoard)**
   - Hydration: if arriving with a `carouselId` and empty slots, you may hydrate from `currentCarousel.slides` (signed URLs + metadata) for preview only.
   - Upload/import: all slide placement stays in local arrays (`slotFiles`, `previews`, `uploadedInfos`); no Supabase writes.
   - Reorder/remove: move-or-swap only; clearing a slot affects local state only.
   - Next enabled when any slot has content. On click, build `slideDrafts`:
     - `{ kind: 'file', index, file }` for local uploads.
     - `{ kind: 'existing', index, bucket, path }` for library imports.
   - Navigate to `/generate-caption/:carouselId` with `state: { carousel, slideDrafts }`.

3) **Persist & Caption (Generate Caption)**
   - If `slideDrafts` exist, `persistDraftSlidesToSupabase` uploads files to storage, inserts `media` rows (`is_library` set appropriately), and inserts ordered `carousel_slide` rows.
   - Hydrates ordered slides with signed URLs for preview and drag-to-reorder within Generate Caption.
   - Caption editing is client-side; Publish attempts to set `status` to `ready` and save title/caption (caption column missing in DB—see known issues).

4) **Publish**
   - Uses nav state `{ caption, carousel, aspectRatio }`.
   - Primary CTA arms the retro Next button and sets `status='ready'` client-side (best-effort Supabase update).
   - Schedule mode currently UI-only; “Go to Calendar” links to the calendar page when wired.

## Data Model (tables in play)
- `carousel`: `id`, `user_id`, `title`, `aspect (square|4x5|9x16)`, `status (draft|ready|posted)`, optional `caption_id`.
- `carousel_slide`: `id`, `user_id`, `carousel_id`, `position`, `media_id`, optional `type_code`, `overlay`, `text`.
- `media`: `id`, `user_id`, `bucket`, `path`, `filename`, `mime_type`, `size_bytes`, `media_type`, `visibility`, `is_library`, plus optional width/height/duration/codecs.

## Reopen / Hydration
- Dashboard card click fetches `carousel` + `carousel_slide` + `media` (signed URLs) and sets `currentCarousel`.
- Returning to SlideBoard can hydrate previews/metadata from `currentCarousel.slides`, but SlideBoard still hands fresh `slideDrafts` forward and avoids Supabase writes.
- Generate Caption re-signs URLs on load if needed; Publish consumes hydrated slides from nav/context.

## Troubleshooting Checklist
- Blank SlideBoard after reopen: verify `carouselId` passed in nav state and `fetchCarouselWithSlides` returns signed URLs before hydration.
- Missing images on Publish: confirm `originalMedia.bucket/path` present; re-sign URLs or fall back to `getPublicUrl` if signing fails.
- Navigation without persistence: ensure SlideBoard built `slideDrafts` and Generate Caption ran `persistDraftSlidesToSupabase` before moving to Publish.

## Archived: Edge Function plan (historical)
- Earlier iterations created carousels via an Edge Function (`create-carousel`) directly from SlideBoard uploads. Core steps:
  - Request: `{ title, files[{ bucket:'media', path, mime_type, size_bytes }], aspect:'square', status:'draft' }` with user JWT in `Authorization: Bearer <token>`.
  - Validate 1–10 files, correct bucket/path namespacing (`user_<uid>/...`), positive sizes.
  - Inserts (transactional intent): create `carousel`, then for each file insert `media` (private, `media_type` from MIME) and `carousel_slide` with ordered `position`.
  - Failure handling: if any insert fails, delete inserted `carousel_slide` → `media` → `carousel`.
- This flow was superseded by the current local-only SlideBoard + Generate Caption persistence model.
