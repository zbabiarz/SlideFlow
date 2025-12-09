# SlideBoard Guide & Spec (current behavior)

SlideBoard is the local staging area for building a carousel. It stays **local-only**—no Supabase writes—until you hand off to Generate Caption.

## Intent & Ownership
- Goal: make adding/reordering up to 10 slides fast and predictable without network friction.
- Persistence happens later: Generate Caption uploads files and writes `media` + `carousel_slide` rows using the `slideDrafts` SlideBoard hands off.

## Data Model (local only)
- Three aligned arrays, always length 10 via `ensureSlots`:
  - `slotFiles: (File | undefined)[]` — new local files for this session.
  - `previews: (string | undefined)[]` — blob URLs for local files or remote URLs for imported images.
  - `uploadedInfos: (UploadedFileInfo | undefined)[]` — metadata for existing Supabase images (`bucket`, `path`, `filename`, `mime_type`, `size_bytes`, `is_library`).
- Invariant: per index, only one of `slotFiles[index]` or `uploadedInfos[index]` should be set; `previews[index]` mirrors whichever is present.

## Upload & Import Paths
- **Add files (button):** multi-select PNG/JPG; fills next empty slots left→right, top→bottom; extra selections beyond 10 are ignored.
- **Dropzone:** drag one or many files onto the large drop area or click to multi-select; uses the same placement logic as Add files.
- **Media Library import:** selected library items fill next empty slots; sets `previews` to signed URLs and `uploadedInfos` with bucket/path metadata.
- **Direct slot drop:** drop files starting at a specific slot to place/replace beginning there.
- **Per-slot double-click:** empty slot opens a **single-file** picker restricted to that slot; populated slot opens the full-screen preview lightbox.

## Reordering & Slot Management
- Dragging a populated slot shows a 96×96 ghost with teal border/numbered badge under the cursor.
- Drop rules:
  - If dropping **files**: treat as new upload; places starting at the target slot and bypasses reorder.
  - If dropping an existing slide internally:
    - Empty target → move source there; source clears.
    - Occupied target → swap source and target; no other slots shift.
- Remove via the “X” on a populated slot (clears all three arrays for that index).
- Preview any populated slot by double-clicking (lightbox).

## Next CTA & Handoff
- **Enabled when:** any slot has content (`slotFiles` or `uploadedInfos`/`previews` non-empty). Disabled when all 10 slots are empty.
- **On click:** requires a valid carousel id from nav/context. Builds `slideDrafts`:
  - `{ kind: 'file', index, file }` for local uploads.
  - `{ kind: 'existing', index, bucket, path }` for imported library images.
- Navigates to `/generate-caption/<carouselId>` with `state: { carousel, slideDrafts }`. Generate Caption owns persistence (uploads + DB writes).
- Uses the branded assets: active `/Next Button.png`, disabled `/Deactivated Next Button.png`.

## Edge Cases & UX Expectations
- All slots full: dropzone click/Add files alerts “All 10 slots are filled. Remove a slide to add more.”
- Dragging onto itself: no-op; dragging outside board: ghost disappears with no reorder.
- Returning later: SlideBoard may hydrate from `currentCarousel.slides` for previews/metadata, but remains local-only and will hand fresh `slideDrafts` forward.

## Constraints & Tips
- Formats: PNG or JPG. Limit: **10 images max** across all upload methods.
- SlideBoard never writes to Supabase or auto-adds images to the Media Library; persistence starts at Generate Caption.
- Use Add files/dropzone for bulk placement; use per-slot double-click for precise placement.

## Dev Invariants (do not break)
- SlideBoard must not call `supabase.*`; all persistence belongs to Generate Caption or a dedicated persistence layer.
- Keep `slotFiles`, `previews`, and `uploadedInfos` aligned and length-10; update all three on mutations.
- Reorder semantics are **move or swap only**—no insert-with-shifting unless UX direction changes.
- Navigation contract: SlideBoard → Generate Caption must pass `state: { carousel, slideDrafts }`, and Generate Caption should treat `slideDrafts` as the source of truth for initial persistence.
