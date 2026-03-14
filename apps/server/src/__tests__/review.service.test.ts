// Mock dependencies
const mockMemoService = {
  getMemos: jest.fn().mockResolvedValue({
    items: [
      { memoId: 'm1', content: 'Test memo 1' },
      { memoId: 'm2', content: 'Test memo 2' },
    ],
  }),
};

jest.mock('../services/memo.service.js', () => ({
  MemoService: jest.fn().mockImplementation(() => mockMemoService),
}));

// Mock ChatOpenAI
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({ content: 'Mocked response' }),
  })),
}));

// Mock config
jest.mock('../config/config.js', () => ({
  config: {
    openai: {
      model: 'gpt-4o-mini',
      apiKey: 'test-key',
      baseURL: 'https://api.openai.com/v1',
    },
  },
}));

// Mock getModelClient
jest.mock('../services/model-client.helper.js', () => ({
  getModelClient: jest.fn().mockResolvedValue({
    invoke: jest.fn().mockResolvedValue({ content: 'Mocked response' }),
  }),
}));

// Mock getDatabase for submitAnswer security tests
const mockDbSelect = jest.fn();
const mockDbUpdate = jest.fn();
jest.mock('../db/connection.js', () => ({
  getDatabase: jest.fn(() => ({
    select: mockDbSelect,
    update: mockDbUpdate,
  })),
}));

import { ReviewService } from '../services/review.service.js';

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(() => {
    service = new ReviewService({} as any);
    jest.clearAllMocks();
  });

  describe('calculateScore', () => {
    it('returns 100 when all items remembered', () => {
      const items = [{ mastery: 'remembered' }, { mastery: 'remembered' }];
      // Access private method via (service as any).calculateScore
      const score = (service as any).calculateScore(items);
      expect(score).toBe(100);
    });

    it('returns 0 when all items forgot', () => {
      const items = [{ mastery: 'forgot' }, { mastery: 'forgot' }];
      const score = (service as any).calculateScore(items);
      expect(score).toBe(0);
    });

    it('returns 50 when all items fuzzy', () => {
      const items = [{ mastery: 'fuzzy' }, { mastery: 'fuzzy' }];
      const score = (service as any).calculateScore(items);
      expect(score).toBe(50);
    });
  });

  describe('submitAnswer - security: uid ownership validation', () => {
    const uid = 'user-1';
    const otherUid = 'user-2';
    const sessionId = 'session-1';
    const dto = { itemId: 'item-1', answer: 'my answer' };

    function buildSelectChain(returnValue: unknown[]) {
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(returnValue),
      };
      mockDbSelect.mockReturnValue(chain);
      return chain;
    }

    it('throws "Session not found" when session does not belong to uid (cross-user attack)', async () => {
      // Session query returns empty (session belongs to otherUid, not uid)
      buildSelectChain([]);

      await expect(service.submitAnswer(uid, sessionId, dto)).rejects.toThrow('Session not found');
    });

    it('throws "Item not found" when itemId does not belong to the session', async () => {
      // First select (session): returns a valid session for uid
      const sessionChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ sessionId, uid, profileId: null }]),
      };
      // Second select (item): returns empty (item not in this session)
      const itemChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      mockDbSelect
        .mockReturnValueOnce(sessionChain)
        .mockReturnValueOnce(itemChain);

      await expect(service.submitAnswer(uid, sessionId, dto)).rejects.toThrow('Item not found');
    });

    it('throws "Memo not found" when memo does not belong to uid (content leak prevention)', async () => {
      const sessionChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ sessionId, uid, profileId: null }]),
      };
      const itemChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          { itemId: 'item-1', sessionId, memoId: 'memo-1', question: 'Q?' },
        ]),
      };
      // Memo query returns empty because uid does not match memo owner
      const memoChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      mockDbSelect
        .mockReturnValueOnce(sessionChain)
        .mockReturnValueOnce(itemChain)
        .mockReturnValueOnce(memoChain);

      await expect(service.submitAnswer(uid, sessionId, dto)).rejects.toThrow('Memo not found');
    });

    it('does not allow attacker (otherUid) to submit to victim session even with correct sessionId', async () => {
      // Attacker sends uid=otherUid with victim's sessionId; session uid check must reject
      buildSelectChain([]); // session not found for otherUid

      await expect(service.submitAnswer(otherUid, sessionId, dto)).rejects.toThrow(
        'Session not found'
      );
    });
  });

  describe('completeSession - security: uid ownership validation', () => {
    const uid = 'user-1';
    const otherUid = 'user-2';
    const sessionId = 'session-1';

    function buildSelectChain(returnValue: unknown[]) {
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(returnValue),
      };
      mockDbSelect.mockReturnValue(chain);
      return chain;
    }

    it('throws "Session not found" when session does not belong to uid (cross-user attack)', async () => {
      // Session query returns empty because session belongs to otherUid, not uid
      buildSelectChain([]);

      await expect(service.completeSession(uid, sessionId)).rejects.toThrow('Session not found');
    });

    it('does not allow attacker (otherUid) to complete victim session even with correct sessionId', async () => {
      // Attacker sends uid=otherUid with victim's sessionId; session uid check must reject
      buildSelectChain([]); // session not found for otherUid

      await expect(service.completeSession(otherUid, sessionId)).rejects.toThrow(
        'Session not found'
      );
    });

    it('completes session successfully when uid matches session owner', async () => {
      // Session query returns a valid session belonging to uid
      const sessionChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ sessionId, uid, status: 'active', profileId: null }]),
      };
      // Items query returns completed items
      const itemsChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          { itemId: 'item-1', sessionId, memoId: 'memo-1', mastery: 'remembered', question: 'Q?', order: 0 },
        ]),
      };
      // Memo query returns memo content for uid
      const memoChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ content: 'Test memo content' }]),
      };
      mockDbSelect
        .mockReturnValueOnce(sessionChain)
        .mockReturnValueOnce(itemsChain)
        .mockReturnValueOnce(memoChain);

      // Mock update chain
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDbUpdate.mockReturnValue(updateChain);

      const result = await service.completeSession(uid, sessionId);
      expect(result.sessionId).toBe(sessionId);
      expect(result.score).toBe(100);
      expect(result.items).toHaveLength(1);
    });
  });
});
