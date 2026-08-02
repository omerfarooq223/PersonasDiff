# Database migrations

Day 2 introduces the migration tool and first transactional schema. Migrations must be forward-only in normal CI, backward-compatible during a release window, and tested against an empty database plus the previous schema version.
