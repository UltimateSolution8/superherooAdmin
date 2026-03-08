#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://api.mysuperhero.xyz}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@helpinminutes.app}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@12345}"
RUN_MUTATING="${RUN_MUTATING:-0}"

if ! command -v jq >/dev/null; then
  echo "jq is required for this test suite" >&2
  exit 1
fi

echo "Using API_BASE_URL=$API_BASE_URL"

LOGIN=$(curl -s -X POST "$API_BASE_URL/api/v1/auth/password/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN" | jq -r '.accessToken // empty')
if [ -z "$TOKEN" ]; then
  echo "Admin login failed: $LOGIN" >&2
  exit 1
fi

auth_get() {
  local path=$1
  curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE_URL$path"
}

echo "admin_summary:"; auth_get "/api/v1/admin/summary" | jq '.pendingHelpers' >/dev/null
echo "admin_tasks_recent:"; auth_get "/api/v1/admin/tasks/recent?limit=5" | jq 'length' >/dev/null
echo "admin_helpers:"; auth_get "/api/v1/admin/helpers" | jq 'length' >/dev/null
echo "admin_helpers_pending:"; auth_get "/api/v1/admin/helpers/pending" | jq 'length' >/dev/null
echo "admin_buyers:"; auth_get "/api/v1/admin/buyers" | jq 'length' >/dev/null
echo "admin_tasks:"; auth_get "/api/v1/admin/tasks" | jq 'length' >/dev/null
echo "admin_support_tickets:"; auth_get "/api/v1/admin/support/tickets" | jq 'length' >/dev/null

TASK_ID=$(auth_get "/api/v1/admin/tasks/recent?limit=1" | jq -r '.[0].id // empty')
if [ -n "$TASK_ID" ]; then
  echo "admin_task_detail:"; auth_get "/api/v1/admin/tasks/$TASK_ID" | jq '.id' >/dev/null
fi

TICKET_ID=$(auth_get "/api/v1/admin/support/tickets" | jq -r '.[0].id // empty')
if [ -n "$TICKET_ID" ]; then
  echo "admin_ticket_detail:"; auth_get "/api/v1/admin/support/tickets/$TICKET_ID" | jq '.id' >/dev/null
  echo "admin_ticket_messages:"; auth_get "/api/v1/admin/support/tickets/$TICKET_ID/messages" | jq 'length' >/dev/null
fi

if [ "$RUN_MUTATING" = "1" ]; then
  echo "Running mutating admin API checks"
  ts=$(date +%s)
  buyer_payload=$(jq -nc --arg phone "900009$ts" --arg email "buyer.$ts@superheroo.app" --arg name "QA Buyer $ts" '{phone:$phone,email:$email,displayName:$name,status:"ACTIVE"}')
  buyer=$(curl -s -X POST "$API_BASE_URL/api/v1/admin/buyers" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$buyer_payload")
  buyer_id=$(echo "$buyer" | jq -r '.id // empty')
  if [ -n "$buyer_id" ]; then
    curl -s -X POST "$API_BASE_URL/api/v1/admin/buyers/$buyer_id/delete" -H "Authorization: Bearer $TOKEN" >/dev/null
  fi

  helper_payload=$(jq -nc --arg phone "900008$ts" --arg email "helper.$ts@superheroo.app" --arg name "QA Helper $ts" --arg pass "Helper@123" '{phone:$phone,email:$email,displayName:$name,password:$pass}')
  helper=$(curl -s -X POST "$API_BASE_URL/api/v1/admin/helpers" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$helper_payload")
  helper_id=$(echo "$helper" | jq -r '.id // empty')
  if [ -n "$helper_id" ]; then
    curl -s -X POST "$API_BASE_URL/api/v1/admin/helpers/$helper_id/delete" -H "Authorization: Bearer $TOKEN" >/dev/null
  fi
fi

echo "Admin API suite completed."
