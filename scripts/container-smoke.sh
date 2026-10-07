#!/usr/bin/env bash
# Validate SPA serving, API URI forwarding, and DNS after API replacement.
set -euo pipefail
IMAGE="${1:?Image required}"
SUFFIX="${GITHUB_RUN_ID:-$$}"
NETWORK="gemini-smoke-$SUFFIX"
APP="gemini-app-smoke-$SUFFIX"
API="gemini-api-smoke-$SUFFIX"
# shellcheck disable=SC2329 # Called by the EXIT trap.
cleanup() {
  docker rm -f "$APP" "$API" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker network create --subnet 172.30.42.0/24 "$NETWORK" >/dev/null
start_api() {
  docker run -d --name "$API" --network "$NETWORK" --network-alias api --ip "$1" \
    node:22-alpine node -e 'require("http").createServer((req,res)=>{res.setHeader("Content-Type","application/json");res.end(JSON.stringify({status:"ok",uri:req.url}))}).listen(5177,"0.0.0.0")' >/dev/null
}
start_api 172.30.42.21
docker run -d --name "$APP" --network "$NETWORK" -p 127.0.0.1:5180:80 "$IMAGE" >/dev/null
curl --fail --silent --show-error --max-time 5 --retry 20 --retry-delay 1 --retry-all-errors \
  http://127.0.0.1:5180/healthz
curl --fail --silent --show-error --max-time 5 http://127.0.0.1:5180/client-route | grep -q '<div id="root">'
check_proxy() {
  curl --fail --silent --show-error --max-time 5 --retry 20 --retry-delay 1 --retry-all-errors \
    'http://127.0.0.1:5180/api/health?smoke=1' | grep -q '"uri":"/api/health?smoke=1"'
}
check_proxy
healthy=false
for _ in {1..30}; do
  if [[ "$(docker inspect --format '{{.State.Health.Status}}' "$APP")" == healthy ]]; then
    healthy=true
    break
  fi
  sleep 1
done
[[ "$healthy" == true ]]
docker rm -f "$API" >/dev/null
start_api 172.30.42.22
check_proxy
echo "Production frontend and API reconnection are healthy."
