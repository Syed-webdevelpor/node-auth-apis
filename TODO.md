# TODO: Implement Trading Account Creation with External API Integration

## Task
Modify trading account creation to:
1. Get user data from user table
2. Call external API `https://trading.investain.com/auth/register`
3. Create trading account and account financial based on API response

## Steps:
- [ ] 1. Modify controllers/tradingAccount.js - Add external API call and account financial creation
- [ ] 2. Test the implementation

## Implementation Details:
- Add axios for external API call
- Get user data from users table + personal_info + account_info
- Call external API with user data
- On success: create trading_accounts record + account_financials record
