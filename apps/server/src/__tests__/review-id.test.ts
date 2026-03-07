import { generateTypeId } from '../utils/id';
import { OBJECT_TYPE } from '../models/constant/type';

describe('Review ID generation', () => {
  it('generates review session ID with rev prefix', () => {
    const id = generateTypeId(OBJECT_TYPE.REVIEW_SESSION);
    expect(id).toMatch(/^rev/);
    expect(id.length).toBeGreaterThan(3);
  });

  it('generates review item ID with ri prefix', () => {
    const id = generateTypeId(OBJECT_TYPE.REVIEW_ITEM);
    expect(id).toMatch(/^ri/);
    expect(id.length).toBeGreaterThan(2);
  });
});
