# Superheroo QA Test Plan (Mobile + Backend + Admin)

## Scope
- Mobile app (buyer + helper flows, OTP/email login, location, KYC, tasks, payments, ratings)
- Backend APIs (auth, tasks, support, payments, realtime)
- Admin portal (KYC approvals, tasks, support)
- Realtime service (helper location + task offers)

## Test Data
- Buyer (email/pass): `buyer@demo.test` / `buyer123`
- Helper (email/pass): `helper@demo.test` / `helper123`
- OTP (dev): Use OTP returned by `/api/v1/auth/otp/start` (OTP_RETURN_IN_RESPONSE=true)
- Backend URL: `http://159.89.167.248:8081`
- Realtime URL: `https://superheroorealtime.onrender.com`

## Pre-checks
1. Backend health: `GET /actuator/health` returns `UP`.
2. Realtime health: `GET /health` returns `OK`.
3. Mobile Diagnostics screen:
   - API_BASE_URL correct
   - Socket URL correct
   - Ping `/actuator/health` succeeds

## Mobile – Auth
1. OTP login (buyer)
   - Start OTP → verify OTP → lands on buyer home.
2. OTP login (helper)
   - Start OTP → verify OTP → lands on helper home.
3. Email login (buyer/helper)
   - Valid email/pass → login success
   - Invalid email/pass → error shown
4. Sign up (buyer)
   - Create account → login success
5. Sign up (helper)
   - Create account → KYC prompted

## Mobile – KYC
1. Upload ID front/back + selfie
2. Camera opens by default, gallery optional
3. Upload succeeds and shows pending status

## Mobile – Buyer Task Flow
1. Create task with title/description/budget/time
2. Location search:
   - Type ≥3 chars → suggestions appear
   - Select suggestion → map updates → full address visible
3. Create task → confirmation shown → navigates to task details
4. Buyer sees helper live tracking once accepted
5. Buyer sees arrival OTP + completion OTP

## Mobile – Helper Flow
1. Go online (location permission granted)
2. Task offers appear (sorted by distance/time/budget)
3. Accept task → navigation to task details
4. Helper sees buyer phone and can call
5. Open in Maps launches navigation app
6. Arrive → upload selfie → enter arrival OTP → Start
7. Complete → upload selfie → enter completion OTP → Complete
8. Rating screen shown

## Realtime Tracking
1. Helper location updates every ~10–15s
2. Buyer map marker animates + polyline route
3. ETA updates

## Payments (Demo)
1. Buyer balance decreases on task creation
2. Helper balance increases after completion delay

## Support (AI + Human)
1. Create ticket from app
2. AI auto-reply appears (if SUPPORT_AI_AUTOREPLY=true)
3. Admin responds → user sees reply
4. Ticket status changes (OPEN → IN_PROGRESS → RESOLVED)

## Admin Portal
1. Login with admin email/pass
2. Approve helper KYC
3. Update task status
4. Review support tickets, reply

## Edge Cases
- No GPS → fallback location used
- Offline mode → warning + blocked task creation
- Duplicate accept → 409 error shown
- Invalid OTP → error shown
- Missing selfie file → error shown
- Long description (>500 chars) → accepted / truncated?
- Task created without address → address optional
- Map API key missing → error banner

## Regression Checklist
- Diagnostics ping works
- OTP works
- Login works
- Task creation works
- Helper accept works
- Live tracking works
- Selfie upload works
- Admin approval works
