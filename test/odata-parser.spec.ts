/**
 * Originally JS code from https://github.com/jadrake75/odata-filter-parser
 * 2015 Jason Drake, Apache License, Version 2.0
 */

import { ODataParser, Predicate } from '../src/odata-parser.class';

describe('ODataParser Tests', () => {
  describe('OData parsing tests', () => {
    it('Null string is not parsed', () => {
      expect(new ODataParser().parse(null)).toBe(null);
    });

    it('Empty string is not parsed', () => {
      expect(new ODataParser().parse('')).toBe(null);
    });

    it('Simple binary expression test', () => {
      const s = "name eq 'test'";
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('name');
      expect(obj?.operator).toEqual('eq');
      expect(obj?.value).toEqual('test');
    });

    it('Simple binary expression with String with spaces', () => {
      const s = "name eq 'test of strings'";
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('name');
      expect(obj?.operator).toEqual('eq');
      expect(obj?.value).toEqual('test of strings');
    });

    it('Simple binary expression with a number value', () => {
      const s = 'id gt 5';
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('id');
      expect(obj?.operator).toEqual('gt');
      expect(Number(obj?.value)).toBeTruthy();
      expect(obj?.value).toEqual(5);
    });

    it('Simple binary expression with a number value enclosed with parenthesis', () => {
      const s = '(id lt 5)';
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('id');
      expect(obj?.operator).toEqual('lt');
      expect(Number(obj?.value)).toBeTruthy();
      expect(obj?.value).toEqual(5);
    });

    it('Simple binary expression with text containing parenthesis', () => {
      const s = "name eq 'ultramarine (R)'";
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('name');
      expect(obj?.operator).toEqual('eq');
      expect(obj?.value).toEqual('ultramarine (R)');
    });

    it('Simple binary expression with text containing parenthesis and bracketted parenthesis', () => {
      const s = "(name eq 'ultramarine (R)')";
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('name');
      expect(obj?.operator).toEqual('eq');
      expect(obj?.value).toEqual('ultramarine (R)');
    });

    it('Compound binary expression with text containing parenthesis', () => {
      const s = "((name eq 'ultramarine (R)') and (rate eq '1d'))";
      const obj = new ODataParser().parse(s);
      const subject = obj?.subject as Predicate;
      const value = obj?.value as Predicate;
      expect(obj?.operator).toEqual('and');
      expect(subject.subject).toEqual('name');
      expect(subject.operator).toEqual('eq');
      expect(subject.value).toEqual('ultramarine (R)');
      expect(value.subject).toEqual('rate');
      expect(value.operator).toEqual('eq');
      expect(value.value).toEqual('1d');
    });

    it('Compound binary expression with parenthesis on value', () => {
      const s = "((name eq 'Bob') and (id gt 5))";
      const obj = new ODataParser().parse(s);
      const subject = obj?.subject as Predicate;
      const value = obj?.value as Predicate;
      expect(obj?.operator).toEqual('and');
      expect(subject.subject).toEqual('name');
      expect(subject.operator).toEqual('eq');
      expect(subject.value).toEqual('Bob');
      expect(value.subject).toEqual('id');
      expect(value.operator).toEqual('gt');
      expect(value.value).toEqual(5);
    });

    it('More complex multiple binary expressions', () => {
      const s = "(name eq 'Bob' and (lastName eq 'Smiley' and (weather ne 'sunny' or temp ge 54)))";
      const obj = new ODataParser().parse(s);
      let subject = obj?.subject as Predicate;
      let value = obj?.value as Predicate;
      expect(obj?.operator).toEqual('and');
      expect(subject.subject).toEqual('name');
      expect(subject.operator).toEqual('eq');
      expect(subject.value).toEqual('Bob');
      expect(value.operator).toEqual('and');
      subject = value.subject as Predicate;
      value = value.value as Predicate;
      expect(subject.subject).toEqual('lastName');
      expect(subject.operator).toEqual('eq');
      expect(subject.value).toEqual('Smiley');

      expect(value.operator).toEqual('or');
      subject = value.subject as Predicate;
      value = value.value as Predicate;
      expect(subject.subject).toEqual('weather');
      expect(subject.operator).toEqual('ne');
      expect(subject.value).toEqual('sunny');
      expect(value.subject).toEqual('temp');
      expect(value.operator).toEqual('ge');
      expect(value.value).toEqual(54);
    });

    it('Verify startsWith condition', () => {
      const s = "startswith(name,'Ja')";
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('name');
      expect(obj?.value).toEqual('Ja*');
      expect(obj?.operator).toEqual('like');
    });

    it('Verify endsWith condition', () => {
      const s = "endswith(name,'Hole')";
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('name');
      expect(obj?.value).toEqual('*Hole');
      expect(obj?.operator).toEqual('like');
    });

    it('Verify contains condition', () => {
      const s = "contains(name,'Something')";
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('name');
      expect(obj?.value).toEqual('*Something*');
      expect(obj?.operator).toEqual('like');
    });

    it('Verify like operations return a Predicate', () => {
      const s = "contains(name,'predName')";
      const obj = new ODataParser().parse(s);
      expect(obj instanceof Predicate).toBe(true);
    });

    it('Parse datetimeoffset value', () => {
      const s = "(purchased le datetimeoffset'2015-12-06T05:00:00.000Z')";
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('purchased');
      expect(obj?.value).toEqual(new Date('2015-12-06T05:00:00.000Z'));
      expect(obj?.operator).toEqual('le');
    });
  });

  describe('OData ISPsystem filter tests', () => {
    it('one select value enclosed with parenthesis', () => {
      const s = '(species_id+EQ+7)';
      const obj = new ODataParser().parse(s);
      expect(obj?.subject).toEqual('species_id');
      expect(obj?.operator).toEqual('eq');
      expect(obj?.value).toEqual(7);
    });

    it('two select value enclosed with parenthesis', () => {
      const s = '(id+EQ+3+OR+id+EQ+6)';
      const obj = new ODataParser().parse(s);
      const subject = obj?.subject as Predicate;
      const value = obj?.value as Predicate;
      expect(obj?.operator).toEqual('or');
      expect(subject?.subject).toEqual('id');
      expect(subject?.operator).toEqual('eq');
      expect(subject?.value).toEqual(3);
      expect(value?.subject).toEqual('id');
      expect(value?.operator).toEqual('eq');
      expect(value?.value).toEqual(6);
    });

    it('one select and two string expression', () => {
      const s = "(id+CP+'%7%')+AND+(species_id+EQ+3)";
      const obj = new ODataParser().parse(s);
      const subject = obj?.subject as Predicate;
      const value = obj?.value as Predicate;
      expect(obj?.operator).toEqual('and');
      expect(subject?.subject).toEqual('id');
      expect(subject?.operator).toEqual('cp');
      expect(subject?.value).toEqual('%7%');
      expect(value?.subject).toEqual('species_id');
      expect(value?.operator).toEqual('eq');
      expect(value?.value).toEqual(3);
    });
  });
});
