# Test Credentials

## Owner Accounts
- **username:** owner | **password:** owner123
- **username:** graff | **password:** Testforresto123

## Admin PIN
- **PIN:** 5159

## Test Table ID
- 54e3595b-8a97-4b6b-8818-95bb2756d9d9

## Admin Users (Original "9Lar Pub" tenant — restaurant_id: e211ddf8-ed99-4af0-956d-2e521759f079)
- **username:** emin | **password:** 1517 | **PIN:** 5159
- **username:** admin1 | **password:** admin123 | **PIN:** 1234

## Multi-tenant isolation
- Every authenticated GET/POST is scoped to `current_user.restaurant_id`
- Owners (`owner`, `graff`) see ALL tenants (super-admin)
- Customer pages pass `?restaurant_id=...` derived from the table
