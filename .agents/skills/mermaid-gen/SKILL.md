---
name: mermaid-gen
description: Generates syntactically correct Mermaid diagrams (flowcharts, sequence, state) while avoiding syntax errors and nested quote issues.
---

### Diagramming Instructions
- Analyze the project scope and identify nodes, entities, and relationships before building the diagram.
- Determine the correct diagram type (e.g., `flowchart TD`, `sequenceDiagram`, `stateDiagram-v2`).
- Follow these Syntax Rules:
  1. Remove nested quotes from all node labels.
  2. Wrap multi-line labels in double quotes.
  3. Separate node IDs from labels using the syntax: NodeID[Display Label]
- Wrap all Mermaid code blocks in standard markdown format:
  ```mermaid
  [Diagram Syntax Here]
  ```
- Before finalizing, validate the diagram to ensure all node IDs are unique and subgraph IDs match style references.
