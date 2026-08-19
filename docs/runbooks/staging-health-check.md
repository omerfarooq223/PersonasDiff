# Staging health check

## Required inputs

- Staging base URL
- Expected immutable release SHA
- Deployment evidence link

## Checks

```sh
curl --fail --silent --show-error "${STAGING_API_URL}/health/live"
curl --fail --silent --show-error "${STAGING_API_URL}/health/ready"
```

Verify that readiness returns `environment: staging` and the expected `release` value. Record the response, timestamp, commit SHA, and deployment link in the deployment verification log. Do not put tokens or secret headers in the evidence file.
