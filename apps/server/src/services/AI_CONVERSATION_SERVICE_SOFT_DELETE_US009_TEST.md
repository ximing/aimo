# AI Conversation Service Soft Delete Test - US-009

## Test: Soft delete conversation with cascade to messages

### Setup
1. Create a test user
2. Create a conversation for the user
3. Add multiple messages to the conversation
4. Verify conversation and messages exist with deletedAt = 0

### Test Steps
1. Call `deleteConversation(conversationId, uid)`
2. Verify conversation has deletedAt > 0
3. Verify all messages in the conversation have deletedAt > 0
4. Verify conversation is not returned by `getConversations(uid)`
5. Verify conversation is not returned by `getConversation(conversationId, uid)`
6. Verify messages are not returned by `getMessages(conversationId)`

### Expected Results
- Conversation deletedAt is set to timestamp
- All messages deletedAt are set to timestamp
- Soft-deleted conversation and messages are filtered out of all queries
- Transaction ensures atomicity (both conversation and messages are updated together)

### SQL Verification
```sql
-- Check conversation soft delete
SELECT conversationId, uid, title, deletedAt
FROM ai_conversations
WHERE conversationId = 'test_conversation_id';

-- Check messages cascade soft delete
SELECT messageId, conversationId, role, deletedAt
FROM ai_messages
WHERE conversationId = 'test_conversation_id';

-- Verify both have deletedAt > 0
```

## Test: Transaction atomicity
1. Mock a failure in the message update step
2. Verify conversation deletedAt remains 0 (transaction rolled back)
3. Verify all messages deletedAt remain 0 (transaction rolled back)
