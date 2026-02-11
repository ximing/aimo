import { customAlphabet } from 'nanoid';
import { OBJECT_TYPE } from '../models/constant/type.js';
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 24);
const typeid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 23);

export const generateUid = () => {
  return nanoid();
};

export const generateTypeId = (type: (typeof OBJECT_TYPE)[keyof typeof OBJECT_TYPE]) => {
  switch (type) {
    case OBJECT_TYPE.MEMO:
      return `m${typeid()}`;
    case OBJECT_TYPE.PAGE:
      return `p${typeid()}`;
    case OBJECT_TYPE.ANNOTATION:
      return `a${typeid()}`;
    case OBJECT_TYPE.INBOX:
      return `i${typeid()}`;
    case OBJECT_TYPE.FILE:
      return `f${typeid()}`;
    case OBJECT_TYPE.SPACE:
      return `s${typeid()}`;
    case OBJECT_TYPE.NOTE:
      return `n${typeid()}`;
    case OBJECT_TYPE.LIBRARY:
      return `l${typeid()}`;
    case OBJECT_TYPE.USER:
      return `u${typeid()}`;
    case OBJECT_TYPE.TIMELINE:
      return `t${typeid()}`;
  }
  throw new Error(`Invalid type: ${type}`);
};
