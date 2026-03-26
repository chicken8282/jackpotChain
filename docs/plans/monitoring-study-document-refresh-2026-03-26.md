# Goal

Refresh the monitoring study document so the top-level architecture diagram is easier to read and first-time readers can understand the proper nouns that appear in the diagram without scanning the entire file.

# Scope

- Replace the top Mermaid architecture block in `docs/studies/monitoring.md` with a cleaner, render-friendly version.
- Add a glossary-style section near the top of the study document for project-specific and monitoring-specific terms such as `MDC`, `cAdvisor`, `Promtail`, `TSDB`, `HikariCP`, and `LogstashEncoder`.
- Keep the change documentation-only. No runtime configuration, monitoring pipeline, or application code changes are included.

# Reference Specs

- User request on 2026-03-26:
  - Replace the top architecture block with the cleaner Mermaid diagram.
  - Add explanations for non-obvious proper nouns and supporting technologies in `monitoring.md`.
- Existing study document: `docs/studies/monitoring.md`
- Existing monitoring plan: `docs/plans/monitoring_logging_implementation.md`

# Impacted Layers

- Documentation:
  - `docs/studies/monitoring.md`
  - `docs/plans/monitoring-study-document-refresh-2026-03-26.md`

# Failure Points

- Mermaid syntax regressions can break rendering at the top of the study document.
- Glossary entries can drift from the actual configuration if definitions are too broad or too tool-generic.
- Adding explanations too deep in the document would not solve the user’s discoverability problem.
- Over-expanding the scope into architecture or configuration changes would make the change less reviewable and less reversible.

# Implementation Steps

1. Create a focused documentation plan with bounded scope and validation criteria.
2. Replace the current top Mermaid block with a cleaner version that uses explicit labels and stable Mermaid formatting.
3. Add a quick glossary section immediately after the diagram so unfamiliar readers can understand key proper nouns before reading the detailed sections.
4. Keep definitions tied to the current project usage, not just generic vendor descriptions.
5. Review the final Markdown for readability, Mermaid syntax safety, and consistency with existing sections.

# Test Checklist

- Confirm the Mermaid block is still fenced with ` ```mermaid ` and has valid flowchart syntax.
- Confirm the glossary terms match the tools and concepts used elsewhere in the document.
- Confirm no existing explanation sections are contradicted by the new summary definitions.
- Confirm the edit stays documentation-only and introduces no configuration drift.

# Observability Checklist

- No runtime observability behavior changes are introduced.
- No metrics, logs, dashboards, alerts, or scrape targets are changed.
- The documentation should make the observability pipeline easier to understand and operate safely.

# Done Criteria

- The top architecture section uses the cleaner Mermaid diagram.
- The document contains a glossary-style explanation section for the key proper nouns in the diagram.
- The new wording is consistent with the current monitoring stack and existing detailed sections.
- The document remains easy to review, easy to revert, and safe to merge as a docs-only update.
