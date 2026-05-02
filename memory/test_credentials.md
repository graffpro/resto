# Test Credentials

## Staff / Admin (existing JWT auth)
- Owner: `graff` / `Testforresto123`
- Admin (Original Tenant — emin): `emin` / `1517`
- Test Tenant Admin: `ehe1` / `ehe123`
- **Master Waiter (2026-02)**: `mofitsiant` / `master123` — role=`master_waiter`, auto-redirects to `/waiter/take-order` after login, can take orders on behalf of customers at any table

## Customer Accounts (Email OTP — Wolt-vari)
Customers register via `POST /api/customer/auth/send-otp` and verify via `POST /api/customer/auth/verify-otp`.
There are no pre-seeded customer accounts; OTPs are auto-generated.

### Resend — domain `resto.az` VERIFIED (as of 2026-02)
- Backend env: `SENDER_EMAIL=no-reply@resto.az`
- Emails now deliver to **any recipient** (no longer test-only).
- If the frontend ever sees error "Email xidməti test rejimindədir…", it means
  the domain was removed or DNS broke — re-verify on resend.com/domains.
- Quick end-to-end test:
  ```bash
  curl -X POST $API_URL/api/customer/auth/send-otp \
    -H 'Content-Type: application/json' \
    -d '{"email":"yourtest@gmail.com","name":"Tester"}'
  # → backend logs show `OTP email sent to yourtest@gmail.com (resend_id=...)`
  ```

### Resend test-mode limitation (historical — resolved)
`onboarding@resend.dev` (default sender) can ONLY send to verified emails.
For Resend account holder `zbruuhh@gmail.com`:
- Sending OTP to ANY email → record created in `customer_otp` collection (auto-generated 6-digit code)
- Email delivery only succeeds for `zbruuhh@gmail.com`
- For testing other addresses: read OTP code from `customer_otp` collection or backend logs (level INFO)

### Quick test (verify OTP without email):
```bash
# 1) Send OTP (creates DB record even if email send fails)
curl -X POST $API_URL/api/customer/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","phone":"+994501234567"}'

# 2) Read OTP from DB
mongosh restaurant_db --eval 'db.customer_otp.find({email:"test@example.com"},{code:1,_id:0}).pretty()'

# 3) Verify OTP → JWT
curl -X POST $API_URL/api/customer/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

## Restaurant for Public Menu Tests
- 9Lar Pub: `restaurant_id=qr-restaurant-hub-6` (visible partner)
- Public menu URL: `/menu/e211ddf8-ed99-4af0-956d-2e521759f079`
