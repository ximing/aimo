# PRD: Tag Display and Filter Feature

## Introduction

Enhance the memo browsing experience by making tags more visible and actionable. This feature displays tags on memos in a hashtag format and provides a tag list in the sidebar for quick filtering, helping users organize and find their notes more efficiently.

## Goals

- Display tags prominently on memo cards with `#tag` format
- Provide a tag list sidebar with usage counts sorted by frequency
- Enable quick filtering by clicking tags (single and multi-select modes)
- Show clear visual feedback for active filters
- Maintain smooth performance even with many tags

## User Stories

### US-001: Display tags on memo cards

**Description:** As a user, I want to see tags displayed at the beginning of memo content so I can quickly identify categorized notes.

**Acceptance Criteria:**

- [ ] Tags appear at the beginning of memo text content in `#tag-name` format
- [ ] Multiple tags are separated by spaces (e.g., `#工作 #重要 #项目A`)
- [ ] Tags have distinct visual styling (color, hover effect) to differentiate from regular text
- [ ] Clicking a tag in memo content filters by that tag
- [ ] Memos without tags show no tag prefix
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Create tag list component for sidebar

**Description:** As a user, I want to see all available tags in the sidebar below "Today's Recommendations" so I can discover and navigate to tagged content.

**Acceptance Criteria:**

- [ ] Tag list section appears below "Today's Recommendations" in left sidebar
- [ ] Section has header "Tags" with tag icon
- [ ] Each tag displays with usage count in parentheses (e.g., `工作 (12)`)
- [ ] Tags sorted by usage frequency (most used first)
- [ ] Empty state shows when no tags exist: "No tags yet"
- [ ] Component scrolls independently if tag list is long
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Implement single-select tag filtering

**Description:** As a user, I want to click a tag to filter memos so I can focus on one category at a time.

**Acceptance Criteria:**

- [ ] Clicking a tag in sidebar filters memo list to show only matching memos
- [ ] Selected tag visually highlighted in sidebar (different background/border)
- [ ] Clicking same tag again clears the filter
- [ ] Filter state persists in URL query params (e.g., `?tag=工作`)
- [ ] Browser back/forward buttons navigate filter history
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Implement multi-select tag filtering

**Description:** As a user, I want to filter by multiple tags simultaneously so I can find memos that match several criteria.

**Acceptance Criteria:**

- [ ] UI toggle to switch between single-select and multi-select modes
- [ ] In multi-select mode, clicking tags adds/removes them from filter set
- [ ] Multiple selected tags shown as active filters with AND logic (all tags must match)
- [ ] URL params support multiple tags (e.g., `?tags=工作&tags=重要`)
- [ ] Clear all button removes all active tag filters
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Display active filter state

**Description:** As a user, I want to see what filters are active and be able to clear them easily.

**Acceptance Criteria:**

- [ ] Active filter indicator appears at top of memo list when filter is active
- [ ] Shows tag name(s) with "Filtered by:" label
- [ ] Each active tag has an X button to remove it individually
- [ ] "Clear all" button removes all tag filters at once
- [ ] Clicking clear returns to unfiltered view
- [ ] Empty state shows "No memos match the selected tag(s)" when filter yields no results
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Tag filtering performance optimization

**Description:** As a user, I want tag filtering to be responsive even with hundreds of memos.

**Acceptance Criteria:**

- [ ] Tag filtering completes within 100ms for up to 1000 memos
- [ ] Tag counts update efficiently when memos change
- [ ] No unnecessary re-renders when filtering
- [ ] Loading state shown briefly if filter computation takes time
- [ ] Typecheck/lint passes

### US-007: Edit tags in memo editor

**Description:** As a user, I want to edit tags when editing a memo so I can categorize my notes appropriately.

**Acceptance Criteria:**

- [ ] Tag input field appears in memo edit modal/form
- [ ] Current tags are displayed when opening edit mode
- [ ] Tags shown as removable pills/chips with X button to delete
- [ ] Typing in input shows tag suggestions from existing tags
- [ ] Pressing Enter or comma adds the tag
- [ ] Duplicate tags are prevented (case-insensitive comparison)
- [ ] Empty tags are not allowed
- [ ] Tags save correctly when memo is saved
- [ ] Canceling edit discards tag changes
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-008: Return tags in public/share API and display on share page

**Description:** As a visitor viewing a shared memo, I want to see the memo's tags so I can understand how it's categorized.

**Acceptance Criteria:**

- [ ] Backend: `/memos/public/:uid` endpoint includes `tags` field in response
- [ ] Backend: `/memos/public/memo/:memoId` endpoint includes `tags` field in response
- [ ] Backend: `/memos/public/:uid/random` endpoint includes `tags` field in response
- [ ] Frontend: Share page displays tags in `#tag-name` format at the beginning of memo content
- [ ] Tags on share page have same visual styling as main app (pill/badge style)
- [ ] Clicking tags on share page navigates to public memos list filtered by that tag
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- **FR-1:** Tags on memo cards display as clickable `#tag-name` elements at the beginning of content
- **FR-2:** Tag list component displays in sidebar below "Today's Recommendations"
- **FR-3:** Each tag in sidebar shows usage count: `tag-name (count)`
- **FR-4:** Tags in sidebar sorted by count descending (most frequent first)
- **FR-5:** Single-click on tag toggles filter (on if not active, off if active)
- **FR-6:** Multi-select mode allows combining multiple tags (AND logic)
- **FR-7:** Filter state synchronized with URL query parameters
- **FR-8:** Active filter indicator displays above memo list with clear option
- **FR-9:** Selected tags highlighted in sidebar with distinct visual state
- **FR-10:** Empty state displays when no memos match current filters

## Non-Goals

- Tag creation/editing from sidebar (only filtering from sidebar)
- Tag color customization
- Nested or hierarchical tags
- Bulk tag operations (add/remove tags from multiple memos)
- Tag cloud visualization
- Tag-based search (only filtering existing list)

## Design Considerations

### Visual Design

- Tags displayed with pill/badge styling using Tailwind's `rounded-full` and `bg-blue-100 text-blue-700`
- Tag list section styled consistently with "Today's Recommendations"
- Selected tag state uses `ring-2 ring-blue-500 bg-blue-50`
- Active filter bar uses subtle background with close buttons
- Smooth transitions (150ms) for hover and selection states

### UX Patterns

- Hover on tag shows cursor pointer and slight brightness change
- Selected tags have clear visual distinction (border, background)
- Long tag lists scroll within fixed-height container
- Tag names truncated with ellipsis if too long (max-width)

### Component Reuse

- Reuse existing sidebar section styling
- Use existing button components for clear filters
- Leverage current memo list container for filter bar placement

## Technical Considerations

### State Management

```typescript
// Tag filter state in MemoService
interface TagFilterState {
  selectedTags: string[];
  mode: 'single' | 'multi';
}
```

- Store selected tags in URL query params for shareable links
- Sync filter state with @rabjs/react observable
- Derive tag counts from memo list data (computed, not stored separately)

### URL Schema

- Single tag: `?tag=工作`
- Multiple tags: `?tags=工作&tags=重要`
- Mode toggle: `?mode=multi&tags=工作&tags=重要`

### Performance

- Compute tag counts using `useMemo` from memo list data
- Debounce filter updates if needed
- Virtualize long tag lists if exceeding 50 tags

### Integration Points

- Tag data already available in memo API response
- No backend changes required
- Filter applied client-side on existing memo data

## Success Metrics

- Users can filter to any tag in 2 clicks or less
- Tag filtering feels instant (<100ms perceived delay)
- Filtered view clearly communicates what is being shown
- No performance degradation with 500+ memos

## Open Questions

- Should tag filtering persist across page refreshes (beyond URL)?
- Maximum number of tags to display in sidebar before "show more"?
- Should we support OR logic for multi-select (memos matching ANY selected tag)?
- Internationalization needed for tag-related labels?
