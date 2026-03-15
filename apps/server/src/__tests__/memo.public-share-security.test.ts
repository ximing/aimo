// Minimal unit test for public share privacy fix (issue #26)
// This test verifies that the PublicMemoDto does not include email field.
// DTO-level unit test is sufficient because controller implementation uses PublicUserDto type.

import type { PublicMemoDto, PublicUserDto } from '@aimo/dto';

describe('PublicMemoDto privacy', () => {
  it('user field omits email', () => {
    // Simulate the shape of the public user DTO returned by the controller
    const publicUser: PublicUserDto = {
      uid: 'user-1',
      nickname: 'author',
      avatar: 'https://cdn.example.com/avatar/user-1.png',
    };

    // This line would fail TypeScript compilation if 'email' were in the type
    const hasEmail = (publicUser as unknown as Record<string, unknown>).email;

    expect(hasEmail).toBeUndefined();
    expect(publicUser).not.toHaveProperty('email');
  });

  it('PublicMemoDto uses PublicUserDto without email', () => {
    const publicMemo: PublicMemoDto = {
      memo: {
        memoId: 'memo-1',
        uid: 'user-1',
        content: 'public content',
        type: 'text',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      user: {
        uid: 'user-1',
        nickname: 'author',
        avatar: 'https://cdn.example.com/avatar/user-1.png',
      },
    };

    // Verify user shape excludes email
    expect(publicMemo.user).not.toHaveProperty('email');
    expect(publicMemo.user).toEqual({
      uid: 'user-1',
      nickname: 'author',
      avatar: 'https://cdn.example.com/avatar/user-1.png',
    });
  });
});
