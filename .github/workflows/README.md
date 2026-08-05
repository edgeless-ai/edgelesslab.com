# CI/CD Workflow Documentation

## Overview
This GitHub Actions workflow implements a comprehensive CI/CD pipeline for the edgelesslab.com project.

## Workflow Name
`CI/CD Pipeline`

## Triggers
- **Push to main branch**: Automatically runs full pipeline
- **Push to test/** branches**: Automatically runs tests
- **Manual dispatch**: Run with environment selection (staging/production)

## Pipeline Jobs

### 1. Test Suite (test-suite)
- **Purpose**: Run full test suite including 132 tests
- **Commands**:
  - `npm ci` - Install dependencies
  - `npx vitest run` - Run unit tests (vitest)
  - `npx playwright install --with-deps chromium` - Install Playwright browsers
  - `npm run build` - Build static export
  - `npx playwright test` - Run Playwright smoke tests
- **Timeout**: 15 minutes
- **Outputs**: Test results and coverage reports (retained 7 days)

### 2. Build Docker Image (build)
- **Purpose**: Build and push Docker image to GitHub Container Registry
- **Commands**:
  - Docker buildx setup
  - Build multi-arch image
  - Push to ghcr.io
- **Timeout**: 20 minutes
- **Artifacts**: Docker image tarball (retained 1 day)

### 3. Deploy (deploy)
- **Purpose**: Deploy application with manual approval gate
- **Requirements**: Passes test-suite and build jobs
- **Environment**: Staging or Production (manual selection)
- **Steps**:
  1. Download Docker image
  2. Run database migrations
  3. Deploy application
  4. Wait for stabilization
- **Timeout**: 10 minutes
- **Manual Approval**: Required for production deployment

### 4. Database Migrations (migrations)
- **Purpose**: Run database migrations safely
- **Requirements**: Passes test-suite and build jobs
- **Environment**: Staging or Production (manual selection)
- **Timeout**: 5 minutes
- **Secret**: Requires DATABASE_URL

### 5. Smoke Test Endpoint (smoke-test)
- **Purpose**: Verify live endpoint is accessible and functional
- **Requirements**: Passes deploy job (runs even if deploy fails)
- **Environment**: Uses deployment URL from deploy job
- **Timeout**: 5 minutes
- **Outputs**: Smoke test logs (retained 7 days)

## Required GitHub Secrets

### Production (manual approval required)
- `DATABASE_URL` - Database connection string
- `GITHUB_TOKEN` - Auto-provided by GitHub

### Optional
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog analytics key
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog host URL
- `NEXT_PUBLIC_INGEST_URL` - Custom ingest URL

## Configuration Notes

### Environment Protection
- Production deployments require manual approval
- Staging deployments can be automated

### Timeout Settings
- Test Suite: 15 minutes
- Build: 20 minutes
- Deploy: 10 minutes
- Migrations: 5 minutes
- Smoke Test: 5 minutes

### Concurrency
- Same branch workflows cancel in-progress runs

## Next Steps

1. **Configure Secrets**: Add required secrets to repository settings
2. **Set Up Environments**: Configure GitHub environments (staging, production)
3. **Add Migration Commands**: Implement actual migration commands in workflow
4. **Add Deployment Commands**: Implement deployment commands for your infrastructure
5. **Update Smoke Tests**: Ensure smoke.spec.ts tests match production endpoints

## Troubleshooting

### Build Fails
- Check Dockerfile exists and is valid
- Verify node version compatibility

### Deployment Fails
- Verify environment secrets are configured
- Check deployment infrastructure is accessible
- Review deployment logs for specific errors

### Tests Fail
- Run tests locally: `npm run test`
- Check coverage reports in artifacts
- Review Playwright test failures in detail
