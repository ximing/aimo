export const getWordCount = (content: string) => {
  return content.replace(/<[^>]+>/g, '').length;
};
