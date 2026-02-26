# Account Financial Real-Time Sync Implementation

## Task: Connect Express.js to NestJS for Real-Time Account Financial Updates

### Steps:
- [x] 1. Add socket.io-client dependency to package.json ✓
- [x] 2. Create services/NestJSConnection.js - Service to connect to NestJS WebSocket ✓
- [x] 3. Update app.js - Import and initialize the NestJS connection service ✓

### Data Mapping (NestJS → Database):
| NestJS Field | Database Field |
|--------------|----------------|
| accountId | account_id |
| equity | equity |
| balance | balance |
| margin | margin |
| free_margin | free_margin |
| margin_level | margin_level |
| credit | credit |
| updatedAt | updated_at |

### Implementation Details:
- Connect to NestJS WebSocket at `/account-financial-sync`
- Listen for `account-financial-update` events
- Update account_financials table when updates are received
- Handle reconnection automatically

### Environment Variables:
Add to your `.env` file:
```
NESTJS_WS_URL=http://localhost:3000
SERVER_ID=express-server
