export const messages = {
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      loading: 'Loading...',
      success: 'Success',
      error: 'Error',
    },
    notes: {
      title: 'My Notes',
      newNote: 'New Note',
      editNote: 'Edit Note',
      deleteNote: 'Delete Note',
      shareNote: 'Share Note',
      content: 'Content',
      tags: 'Tags',
      isPublic: 'Public',
    },
    settings: {
      title: 'Settings',
      theme: 'Theme',
      language: 'Language',
      notifications: 'Notifications',
    },
  },
  zh: {
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      create: '创建',
      search: '搜索',
      loading: '加载中...',
      success: '成功',
      error: '错误',
    },
    notes: {
      title: '我的笔记',
      newNote: '新建笔记',
      editNote: '编辑笔记',
      deleteNote: '删除笔记',
      shareNote: '分享笔记',
      content: '内容',
      tags: '标签',
      isPublic: '公开',
    },
    settings: {
      title: '设置',
      theme: '主题',
      language: '语言',
      notifications: '通知',
    },
  },
};

export type Language = keyof typeof messages;
