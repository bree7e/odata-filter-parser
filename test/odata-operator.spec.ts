/**
 * Originally JS code from https://github.com/jadrake75/odata-filter-parser
 * 2015 Jason Drake, Apache License, Version 2.0
 */

import { isLogicalOperator, isUnaryOperator, Operator } from '../src/odata-parser.class';

describe('Operator Tests', () => {
  describe('OData Operator tests', function() {
    it('Logical test for and', function() {
      const s = 'and';
      expect(s).toEqual(Operator.AND);
      expect(isLogicalOperator(s as Operator)).toBe(true);
    });

    it('Logical test for or', function() {
      const s = 'or';
      expect(s).toEqual(Operator.OR);
      expect(isLogicalOperator(s as Operator)).toBe(true);
    });

    it('Logical test not valid for eq', function() {
      const s = 'eq';
      expect(isLogicalOperator(s as Operator)).toBe(false);
    });

    it('Unary test for null', function() {
      const s = 'is null';
      expect(s).toEqual(Operator.IS_NULL);
      expect(isUnaryOperator(s as Operator)).toBe(true);
    });

    it('Unary test for binary operation', function() {
      const s = 'and';
      expect(isUnaryOperator(s as Operator)).toBe(false);
    });
  });
});
