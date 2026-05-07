export default {
  setting: {
    tools: ['catpaw', 'claude_code'],
  },
  assets: [
    {
      name: '@vercel/agent-browser',
      version: '1.0.1',
      category: 'skills',
      installedTools: ['claude_code'],
    },
    {
      name: '@anthropics/skill-creator',
      version: '1.0.0',
      type: 'dir',
      category: 'skills',
      installedTools: ['claude_code'],
    },
  ],
};
