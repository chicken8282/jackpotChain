# Goal
Author a readable functional specification for `FE-ssatto` that separates frontend-only behavior from backend-driven behavior and identifies the screen data needed to support API and ERD design.

# Scope
- Review the current FE-ssatto routes, page widgets, shared store, and mock contracts.
- Produce a page-by-page functional specification in `docs/reviews/funtional-spec.md`.
- Classify features into frontend-only vs backend-driven behavior.
- For backend-driven behavior, list the data that must be displayed on screen.

# Reference Specs
- `C:\Users\SSAFY\S14P21E202\AGENTS.md`
- `C:\Users\SSAFY\S14P21E202\.agents\rules\domain.md`
- `C:\Users\SSAFY\S14P21E202\.agents\rules\frontend.md`
- `C:\Users\SSAFY\S14P21E202\.agents\specs\frontend-spec.md`

# Impacted Layers
- Documentation only
- Input sources: routes, page components, wallet store, mock data contracts

# Failure Points
- The current frontend mixes purely local interactions with future backend-bound flows, so the spec must distinguish current mock implementation from recommended production ownership.
- Some UI labels are garbled in the source, so the document must describe intent from structure and data shape rather than mirror every visible string literally.

# Implementation Steps
1. Inspect routes, page sections, shared state, and mock contracts.
2. Map each page’s user-visible modules and actions.
3. Split each page into frontend-only features and backend-driven features.
4. For backend-driven features, capture displayed data fields and API/ERD implications.
5. Review the final document for readability and coverage.

# Test Checklist
- [ ] All core pages are covered
- [ ] Frontend-only and backend-driven features are clearly separated
- [ ] Backend-driven sections include screen data fields
- [ ] The result is readable enough to guide API and ERD design

# Observability Checklist
- [ ] The document makes ownership boundaries explicit
- [ ] Node-owned blockchain truth is not reassigned to frontend-only state

# Done Criteria
- `docs/reviews/funtional-spec.md` exists
- The document is readable and actionable for backend/API/ERD design
- Page-level feature ownership is clearly classified
