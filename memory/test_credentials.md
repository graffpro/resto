# Test Credentials

## Staff / Admin (existing JWT auth)
- Owner: `graff` / `Testforresto123`
- Admin (Original Tenant — emin): `emin` / `1517`
- Test Tenant Admin: `ehe1` / `ehe123`

## Customer Accounts (Email OTP — Wolt-vari)
Customers register via `POST /api/customer/auth/send-otp` and verify via `POST /api/customer/auth/verify-otp`.
There are no pre-seeded customer accounts; OTPs are auto-generated.

### Resend test-mode limitation
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
