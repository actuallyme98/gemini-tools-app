# Deploy frontend trên server EziHubb

Pipeline có sẵn tại `.github/workflows/ci.yml` và `docker-publish.yml`: lint, Playwright, build, production-container smoke test, publish GHCR và deploy qua SSH. Push `main` tự deploy khi `DEPLOY_ENABLED=true`; có thể dùng Run workflow với `deploy=true` để deploy thủ công.

Stack dùng chung với API ở `/home/ubuntu/gemini-tools`, project Compose `gemini-tools`. Frontend ở `127.0.0.1:3020`, gọi API qua `/api` trên cùng domain. Domain mẫu là `tools.ezihubb.com`.

API repo sở hữu Compose/deployment engine và các script thiết lập server/GitHub cho cả hai repo. **Deploy API trước lần frontend đầu tiên.** Xem [hướng dẫn đầy đủ trong API repo](https://github.com/actuallyme98/gemini-tools-api/blob/main/docs/deployment.md), gồm secrets, GHCR, Nginx, DNS, Cloudflare và rollback.

Để deploy thủ công giống EziHubb, chạy trong Git Bash từ repo frontend:

```bash
cp scripts/.deploy-config.example scripts/.deploy-config
# Điền key SSH và kiểm tra server/path. Host key phải được xác minh sẵn.
bash scripts/deploy.sh ghcr.io/actuallyme98/gemini-tools-app:FULL_40_CHARACTER_COMMIT_SHA
# Hoặc image@sha256:DIGEST.
```

Script chỉ đổi image frontend, giữ image API hiện tại và chờ health check. Nếu lỗi, tự khôi phục image cũ; rollback thủ công:

```bash
bash scripts/deploy.sh --rollback
```

CI cần `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`; variables `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_ENABLED`. Chạy `scripts/configure-github.sh` từ API repo để cấu hình cả hai repo. API/R2 credentials ở `.env` API trên server; frontend build mặc định để `VITE_API_BASE_URL` trống và không nhận secrets.

Kiểm tra local:

```bash
npm run lint
npm run build
npm run test:e2e
docker build -t gemini-tools-app:ci .
bash scripts/container-smoke.sh gemini-tools-app:ci
```

Container smoke test kiểm tra trang SPA, API query string và việc Nginx nối lại sau khi IP API thay đổi. Trước khi public domain, kiểm tra `/healthz` và `/api/health`; tham khảo giới hạn request dài/upload của Cloudflare trong hướng dẫn API.
