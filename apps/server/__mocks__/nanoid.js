// Mock for nanoid
let counter = 0;
module.exports = {
  customAlphabet: () => {
    return () => `mock${counter++}`;
  },
};
