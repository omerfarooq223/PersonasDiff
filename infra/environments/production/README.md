# Production environment boundary

Day 1 creates this boundary but does not authorize deployment. Production requires immutable image digests, workload identity or managed secrets, encrypted managed data services, default-deny egress, backups, alerting, and all release gates from `docs/plan.md`.
