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

import { ReviewService } from '../services/review.service.js';

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(() => {
    service = new ReviewService({} as any);
  });

  describe('calculateScore', () => {
    it('returns 100 when all items remembered', () => {
      const items = [
        { mastery: 'remembered' },
        { mastery: 'remembered' },
      ];
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

  describe('buildQuestionPrompt', () => {
    it('includes memo content in prompt', () => {
      const prompt = (service as any).buildQuestionPrompt('Today I learned about React hooks.');
      expect(prompt).toContain('React hooks');
    });
  });
});
