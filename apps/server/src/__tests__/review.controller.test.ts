// Mock dependencies before importing
jest.mock('../services/review.service.js', () => ({
  ReviewService: jest.fn().mockImplementation(() => ({
    createSession: jest.fn().mockResolvedValue({ sessionId: 'test' }),
    getSession: jest.fn().mockResolvedValue(null),
    submitAnswer: jest.fn().mockResolvedValue({}),
    completeSession: jest.fn().mockResolvedValue({}),
    getHistory: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn(),
}));

jest.mock('../config/config.js', () => ({
  config: { openai: { model: 'gpt-4o-mini', apiKey: 'test', baseURL: 'https://api.test.com' } },
}));

jest.mock('../services/memo.service.js', () => ({
  MemoService: jest.fn().mockImplementation(() => ({
    listMemos: jest.fn().mockResolvedValue({ items: [] }),
  })),
}));

import { ReviewController } from '../controllers/v1/review.controller.js';

describe('ReviewController', () => {
  it('is defined', () => {
    expect(ReviewController).toBeDefined();
  });
});
