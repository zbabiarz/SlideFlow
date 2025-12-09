# Progress Log

## 2025-02-03
- Wired Dashboard “Create New Carousel” to insert a draft carousel, add it to the local list, set `currentCarousel`, and navigate to SlideBoard immediately.
- SlideBoard now hydrates existing carousels from Supabase (`carousel_slide` + `media`), restoring previews/order without a refresh.
- Uploads on SlideBoard persist to Supabase: insert `media` (`is_library: true`) then `carousel_slide` for the slot; local state and `currentCarousel` stay in sync.
- Reordering slides now updates `carousel_slide.position`; deletions remove slide/media rows.
- Generate reuses the existing carousel id instead of creating a new one; ensures slide rows/positions exist before navigating to Results.
- Added documentation: `docs/carousel-flow.md` (end-to-end flow) and `docs/sop-carousel-persistence.md` (SOP/troubleshooting).

## 2025-02-04
- SlideBoard “Slide” button restyled with provided active/deactivated assets, persistent shadow, hover shift right, resized arrow, larger label, and hint text when inactive; position nudged down for alignment.
- Results page “Review” button now mirrors SlideBoard styling (active/disabled images, shadow, hint on inactive, arrow stays aligned) with placeholder navigation for the future review page.
- Added “Generate” button to the prompt card on Results: disabled until prompt has text; clicking currently copies the prompt text into the caption as a pre-AI placeholder.
- Media Library bulk delete flow updated to refresh session, await deletes, show deleting state; documented persistent bulk-delete failure and multi-import-to-SlideBoard issue in `docs/known_issues.md`.
- Updated static assets with latest `Next Button.png` and `Deactivated Next Button.png`.

## 2025-02-05
- Added Brand Profile CTA on Dashboard and built the Brand Profile page shell with style/palette/font controls; added “Back to Dashboard” header link to match Media Library.
- Renamed Results to Generate Caption: route path now `/generate-caption/:carouselId`, component/file renamed, and legacy `/results/:carouselId` redirects preserved.
- Updated active slide CTA label on SlideBoard and Generate Caption to read “Click”; refreshed the deactivated slide button asset per latest provided image.
- Replaced the app logo asset with the updated retro logo file; refreshed again with the latest provided versions.

## 2025-02-06
- Built the new Publish page and wired navigation from Generate Caption “Click” CTA, passing caption + slides; added `/publish/:carouselId` route and a future `/studio` placeholder.
- Publish page includes preview carousel, caption handoff box, readiness checklist (slides only), destinations/timing controls, and SlideFlow Studio CTA card.
- Preview on Publish is slightly larger with square corners; caption textarea height tightened; SlideFlow Studio card repositioned to right column footer; readiness list trimmed per latest request.

## 2025-02-07
- SlideBoard: reverted to visual-first slots (no Supabase during editing), fixed drag/drop (drop-only moves, shift-on-occupied, blob previews maintained), and enabled Next CTA based on any local image. Added forced upload of pending files on save to avoid “add an image” false alerts.
- Removed Supabase polling/refresh loops on SlideBoard and Dashboard that were causing infinite network requests and flicker; Dashboard no longer eager-fetches slides for every carousel.
- Adjusted SlideBoard CTA/header visuals: accent clipped within card, CTA/hint/arrow float above without clipping; cleaned slot rendering to avoid “Preview unavailable” for local files.
- Dashboard create buttons: both create a draft carousel in Supabase, set currentCarousel, and navigate straight to SlideBoard with the new ID.

## 2025-02-08
- SlideBoard UX: made SlideBoard fully local-only; removed all Supabase writes while arranging slides and shifted persistence responsibility to Generate Caption via `slideDrafts` (file/existing variants).
- Drag & drop redesign on SlideBoard:
  - Uses a fixed-size ghost (96x96) similar to the mini board.
  - Reorders only on drop: if target slot is empty, the slide moves; if occupied, the two slots swap; no other slides shift.
  - Drag-over dropEffect now reflects intent (`move` for internal drags, `copy` for file drops).
- Upload UX on SlideBoard:
  - Dropzone click now supports multi-file selection (bulk-fills next empty slots).
  - Per-slot double-click uses a separate single-file input, ensuring only one image can be picked for that specific slot.
  - All upload paths (Add files, dropzone, per-slot, Media Library) converge into the same slot arrays with a hard cap of 10 slides.
- Generate Caption:
  - Tightened Next-button logic so it only activates when slides are fully loaded (no loading state in the preview) **and** the caption textarea has content.
  - Preview card now shows a card-only spinner with “Loading...” while slides are uploading or hydrating; the rest of the page remains interactive.
- Carousel persistence SOP/docs:
  - Updated `docs/sop-carousel-persistence.md` to reflect the new local-only SlideBoard and the Generate Caption–based persistence flow.
  - Updated `docs/slideboard_usage.md` to describe the current upload, reordering, and Next-button behavior.
  - Added `docs/slideboard_ux_spec.md` as a detailed UX + behavior reference for the SlideBoard, including data model, drag rules, and edge cases.
  - Synced `docs/backlog.md` with current work (marked inline dashboard preview + SlideBoard persistence issue as done) and added a “Dev quick-start & invariants” section to the SlideBoard UX spec for future engineers/Bolt.

## 2025-02-09
- Generate Caption: added IG aspect selector (4:5 default, 1:1), Instagram-style dots, resized preview, lighter arrows; aspect choice passes to Publish for matching preview sizing/arrows/dots.
- Publish: preview card now mirrors Generate (aspect ratio sync, dots, arrow styling); readiness label reflects chosen aspect ratio.
- Prompt/Captions UX: double-click opens a large editor modal; added Save Prompt/Save Caption + teal Media Library buttons (aligned across cards); caption textarea now 2200-char limited with counter; helper text prefixed with “Hint”; placeholder colors adjusted.
- Studio CTA: title tinted to brand blue; helper copy updated; Go to Studio button gains inactive brown state and active teal state (click to activate, then navigate).
- Tooling: added Sparkles hover tooltip about monthly credits; aligned caption card header buttons with the camera icon.
- Copy: SlideFlow Studio card helper updated to “Need to crop your images better?” on Generate Caption.
- Docs: Added `docs/generate_caption_sop.md` (full SOP for Generate Caption, including aspect/preview behavior, buttons, modals, limits, tooltips, and a Next-button handoff flow to Publish).

## 2025-02-10
- Publish page polish: repositioned badges/icons, aligned header hint text (conditional when Schedule selected), brightened active states for Instagram/Facebook/Publish now/Schedule buttons, and added the mini weekly calendar under Schedule with disabled past days.
- Destinations guard: at least one platform must stay selected; inline helper surfaces when both are off.
- Actions: primary CTA label flips to “Go to calendar” when scheduling; Next button disables while Schedule is selected.
- Save Draft flow: added name-your-carousel modal (title required), best-effort slide-order upsert, Supabase update for title/caption/status draft flag, and navigation to Dashboard on success. Still failing with Supabase update/slide persistence (tracked in backlog/known issues).
- Docs: Added `docs/publish_page_sop.md` describing Publish page data flow, UI behaviors, scheduling calendar, CTA states, and draft save flow (with current caveats). Logged bug in backlog known issues.

## 2025-02-11
- Publish page: rebuilt the SlideFlow Studio card (square icon badge, bullet grid of features, toned copy, concise footer), refreshed Go to Studio CTA with dark default + glowing hover, tweaked Publish CTA to match that styling, and tightened padding around the action row.
- Publish page copy: updated Studio bullets to reflect actual capabilities (crop/resize, AI background swap/remove, on-brand text overlays, save/export PNGs); footer now reads “Slides and captions carry over.”
- Generate page: trimmed and resized the Studio tagline, tightened spacing, moved the helper + Go to Studio CTA to the right, and added a spinner overlay to the disabled Next button while slides load.

## 2025-02-12
- Calendar page: built persistent scheduling against Supabase (`calendar_event` table + RPCs), added drag/drop + click-to-schedule, timezone-aware storage/display, 15-minute slot picker, collision toasts, and status updates (“Scheduled”) on Dashboard cards.
- Calendar UI tweaks: tightened padding/gaps, widened calendar column, moved event time beside thumbnail, restyled header to “Back to Dashboard”; added toast overlay for errors.
- Dashboard cards: “Scheduled” pill now uses bright pacific blue; removed Export; Copy renamed to Duplicate; duplicate now performs a deep Supabase clone as draft with “copy” appended; trash retained.
- Known issues logged: calendar time mismatch (display vs. modal) and dashboard duplicate alert failure; also noted Supabase duplication error and time-slot ordering fix for 15-minute selector.

## 2025-02-13
- Dashboard actions/buttons restyled: unified dark buttons with pacific hover, Studio CTA enlarged with upward hover; Ready status pill now green for `ready` carousels; inline Publish button added to cards (UI-only) and trash icon moved to top-right hover area. Publish Ready on Publish page now sets carousel status `ready` and hides Ready when “Schedule” is selected (shows Go to Calendar instead).
- Publish CTA: green “Ready?” (sets status ready, arms Next) vs. blue “Go to Calendar” when scheduling; check icon simplified; caption persistence documented as client-only due to missing DB column.
- Brand Profile: removed secondary font selector, cleaned preset copy to remove Supabase wiring notes, simplified preset save card; preview text updated (headline/body) with selected font applied; Supabase/wiring copy scrubbed.
- Profile page: widened layout, reduced gaps, set email field read-only to silence warnings, disabled Connect Instagram button (no-op for now), updated Premium upsell copy to generic benefits.
- Calendar page: fixed duplicate-key warnings on weekday headers.
- Docs: updated `publish_page_sop.md` for new Ready/Go-to-Calendar behavior and caption persistence gap; updated `backlog.md` (trash relocation done; new items for wiring dashboard publish button, caption column, Instagram connect), `known_issues.md` (caption not persisted), and this progress log.
