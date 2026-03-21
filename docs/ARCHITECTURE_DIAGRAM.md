# Architecture Diagram

```mermaid
flowchart TD
  A[User enters URL] --> B[Next.js Frontend]
  B --> C[/api/audit route]
  C --> D[Playwright desktop render]
  C --> E[Playwright mobile checks]
  C --> F[axe-core scan]
  C --> G[Lighthouse CLI]
  C --> H[Cheerio DOM parser]
  D --> I[Deterministic Scoring Engine]
  E --> I
  F --> I
  G --> I
  H --> I
  I --> J[Issues + Prioritized Recommendations]
  J --> K[Optional Ollama summary]
  I --> L[Structured Report JSON]
  K --> L
  L --> B
```
