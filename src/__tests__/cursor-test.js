import { expect } from 'chai';
import { cursorToData, dataToCursor } from '../cursor';

describe('cursor behavior', () => {
  it('should encode object to base64', () => {
    expect(dataToCursor({ id: 1, age: 30 })).to.equal('eyJpZCI6MSwiYWdlIjozMH0=');
  });

  it('should decode object from base64', () => {
    expect(cursorToData('eyJpZCI6MSwiYWdlIjozMH0=')).to.deep.equal({ id: 1, age: 30 });
  });

  it('should return null if cursor is invalid', () => {
    expect(cursorToData('invalid_base64')).to.be.null;
  });
});
