# TODO - Credit Update API Integration

## Task: Modify updateAccountFinancial to call external trading server API

### Steps:
1. [x] Read and understand the existing updateAccountFinancial function
2. [x] Modify updateAccountFinancial to:
   - Get current credit from database before update
   - Compare new credit with current credit to determine action (add/remove)
   - Call external API `http://localhost:3000/trading-accounts/credit/${accountNumber}` with action, amount, and reason
   - Handle the external API response
3. [x] Test the implementation

## External API Details:
- URL: `http://localhost:3000/trading-accounts/credit/${accountNumber}`
- Method: POST
- Headers: 
  - 'Content-Type': 'application/json'
  - 'x-internal-api-key': process.env.INTERNAL_API_KEY
- Body: { action: 'add' | 'remove', amount: number, reason: string }

## Logic:
- If new credit > current credit → action = 'add'
- If new credit < current credit → action = 'remove'
- amount = |new credit - current credit|

