# Day 1 responsibility matrix

| Work item                     | Product Owner | Tech Lead | Security/Privacy | SRE | Browser Engineer | Backend Engineer | QA  |
| ----------------------------- | ------------- | --------- | ---------------- | --- | ---------------- | ---------------- | --- |
| Scope and surface approval    | A/R           | C         | C                | C   | I                | I                | I   |
| Acceptance criteria and DoD   | A             | R         | C                | C   | C                | C                | C   |
| Stack and monorepo            | I             | A/R       | C                | C   | C                | C                | C   |
| ADR decisions                 | C             | A/R       | C                | C   | C                | C                | I   |
| Contracts and state machine   | C             | A         | C                | I   | C                | R                | C   |
| Environments and health       | I             | A         | C                | R   | I                | R                | C   |
| Browser spike                 | A             | C         | C                | C   | R                | C                | R   |
| Threat model and traceability | C             | R         | A/R              | C   | C                | C                | C   |

`A` = accountable, `R` = responsible, `C` = consulted, `I` = informed. One person may fill multiple roles, but critical security and policy gates require an independent reviewer.
