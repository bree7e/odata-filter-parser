/**
 * Originally JS code from https://github.com/jadrake75/odata-filter-parser
 * 2015 Jason Drake, Apache License, Version 2.0
 */

import { Operator, Predicate } from '../src/odata-parser.class';

describe('Predicate Tests', () => {
  describe('Predicate tests', function() {
    it('Empty constructor', function() {
      const p = new Predicate();
      expect(p.operator).toBe(Operator.EQUALS);
      expect(p.subject).toBe(undefined);
      expect(p.value).toBe(undefined);
    });
  });

  describe('Predicate serialization tests', function() {
    it('Serialize a simple object', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.EQUALS,
        value: 'Serena'
      });
      expect(p.serialize()).toEqual("(name eq 'Serena')");
    });

    it('Serialize a simple logical set of objects', function() {
      const p = new Predicate({
        subject: new Predicate({
          subject: 'name',
          operator: Operator.EQUALS,
          value: 'Serena'
        }),
        operator: Operator.AND,
        value: new Predicate({
          subject: 'lastname',
          operator: Operator.NOT_EQUAL,
          value: 'Martinez'
        })
      });
      expect(p.serialize()).toEqual("((name eq 'Serena') and (lastname ne 'Martinez'))");
    });

    it('Serialize boolean values', function() {
      const p = new Predicate({
        subject: 'happy',
        operator: Operator.EQUALS,
        value: true
      });
      expect(p.serialize()).toEqual('(happy eq true)');
    });

    it('Serialize numeric floating-point values', function() {
      const p = new Predicate({
        subject: 'pi',
        operator: Operator.GREATER_THAN,
        value: 3.14159
      });
      expect(p.serialize()).toEqual('(pi gt 3.14159)');
    });

    it('Serialize numeric integer values', function() {
      const p = new Predicate({
        subject: 'age',
        operator: Operator.NOT_EQUAL,
        value: 30
      });
      expect(p.serialize()).toEqual('(age ne 30)');
    });

    it('Serialize current date to ISO String', function() {
      const d = new Date();
      const p = new Predicate({
        subject: 'created',
        operator: Operator.GREATER_THAN,
        value: d
      });
      expect(p.serialize()).toEqual("(created gt datetimeoffset'" + d.toISOString() + "')");
    });

    it('Serialize object value fails', function() {
      const value: any = { a: 'nice' };
      const p = new Predicate({
        subject: 'created',
        operator: Operator.EQUALS,
        value
      });
      try {
        expect(p.serialize());
        fail('Should have failed to serialize an object value');
      } catch (err) {
        expect(err).not.toBe(null);
        expect(err.key).toEqual('UNKNOWN_TYPE');
      }
    });

    it('Serialize null value fails', function() {
      const p = new Predicate({
        subject: 'created',
        operator: Operator.EQUALS,
        value: null
      });
      try {
        expect(p.serialize());
        fail('Should have failed to serialize a null value');
      } catch (err) {
        expect(err).not.toBe(null);
        expect(err.key).toEqual('INVALID_VALUE');
      }
    });

    it('Serialize null subject fails', function() {
      const p = new Predicate({
        subject: null,
        operator: Operator.EQUALS,
        value: 'foo'
      });
      try {
        expect(p.serialize());
        fail('Should have failed to serialize a null subject');
      } catch (err) {
        expect(err).not.toBe(null);
        expect(err.key).toEqual('INVALID_SUBJECT');
      }
    });

    it('Serialize logical expression where one side is a not at least a predicate fails', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.AND,
        value: 'foo'
      });
      try {
        expect(p.serialize());
        fail('Should have failed to serialize a non-predicate value');
      } catch (err) {
        expect(err).not.toBe(null);
        expect(err.key).toEqual('INVALID_LOGICAL');
      }
    });

    it('Serialize LIKE with no wildcard', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.LIKE,
        value: 'Serena'
      });
      const s = p.serialize();
      expect(s).toBe("(contains(name,'Serena'))");
    });

    it('Serialize LIKE with wildcards', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.LIKE,
        value: '*Some*'
      });
      const s = p.serialize();
      expect(s).toBe("(contains(name,'Some'))");
    });

    it('Serialize LIKE with starting wildcard', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.LIKE,
        value: '*ending'
      });
      const s = p.serialize();
      expect(s).toBe("(endswith(name,'ending'))");
    });

    it('Serialize LIKE with ending wildcard', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.LIKE,
        value: 'starting*'
      });
      const s = p.serialize();
      expect(s).toBe("(startswith(name,'starting'))");
    });

    it('Serialize LIKE with middle wildcard', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.LIKE,
        value: 'start*end'
      });
      const s = p.serialize();
      expect(s).toBe("(contains(name,'start*end'))");
    });
  });

  describe('Predicate concat tests', function() {
    it('Invalid case of a single predicate', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.EQUALS,
        value: 'Serena'
      });
      try {
        const result = Predicate.concat(Operator.AND, p);
        fail('expected error');
      } catch (err) {
        expect(err).not.toBe(null);
        expect(err.key).toEqual('INSUFFICIENT_PREDICATES');
      }
    });

    it('Invalid case with non-logical operator', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.EQUALS,
        value: 'Serena'
      });
      const p2 = new Predicate({
        subject: 'age',
        operator: Operator.LESS_THAN,
        value: 5
      });
      try {
        const result = Predicate.concat(Operator.LESS_THAN, p, p2);
        fail('expected error');
      } catch (err) {
        expect(err).not.toBe(null);
        expect(err.key).toEqual('INVALID_LOGICAL');
      }
    });

    it('Concatenate two simple predicates with AND', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.EQUALS,
        value: 'Serena'
      });
      const p2 = new Predicate({
        subject: 'age',
        operator: Operator.LESS_THAN,
        value: 5
      });
      const result = Predicate.concat(Operator.AND, p, p2);
      expect(result.subject).toBe(p);
      expect(result.value).toBe(p2);
      expect(result.operator).toBe(Operator.AND);
    });

    it('Concatenate more than two predicates with OR', function() {
      const p = new Predicate({
        subject: 'name',
        operator: Operator.EQUALS,
        value: 'Serena'
      });
      const p2 = new Predicate({
        subject: 'age',
        operator: Operator.LESS_THAN,
        value: 5
      });
      const p3 = new Predicate({
        subject: 'happiness',
        operator: Operator.EQUALS,
        value: 'high'
      });
      const result = Predicate.concat(Operator.OR, p, p2, p3);
      expect(result.subject).toBe(p);
      expect(result.value).not.toBe(null);
      expect(result.operator).toBe(Operator.OR);
      const r = result.value as Predicate;
      expect(r instanceof Predicate).toBe(true);
      expect(r.subject).toBe(p2);
      expect(r.operator).toBe(Operator.OR);
      expect(r.value).toBe(p3);
    });

    it('Concatenate with an array of values', function() {
      const arr = [];
      for (let i = 0; i < 3; i++) {
        arr.push(
          new Predicate({
            subject: 'name',
            operator: Operator.EQUALS,
            value: 'text-' + i
          })
        );
      }
      const result = Predicate.concat(Operator.OR, arr);
      expect(result.subject).toBe(arr[0]);
      expect(result.value).not.toBe(null);
      expect(result.operator).toBe(Operator.OR);
      const r = result.value as Predicate;
      expect(r instanceof Predicate).toBe(true);
      expect(r.subject).toBe(arr[1]);
      expect(r.operator).toBe(Operator.OR);
      expect(r.value).toBe(arr[2]);
    });
  });

  describe('Predicate flatten tests', function() {
    it('Flatten single statement', function() {
      const s = new Predicate({
        subject: 'name',
        value: "'Bob'"
      });
      const obj = s.flatten();
      expect(obj.length).toEqual(1);
      expect(obj[0].subject).toEqual('name');
      expect(obj[0].operator).toEqual('eq');
      expect(obj[0].value).toEqual("'Bob'");
    });

    it('Flatten single statement into existing array', function() {
      const s = new Predicate({
        subject: 'name',
        value: "'Bob'"
      });
      const r: Predicate[] = [];
      s.flatten(r);
      expect(r.length).toEqual(1);
      expect(r[0].subject).toEqual('name');
      expect(r[0].operator).toEqual('eq');
      expect(r[0].value).toEqual("'Bob'");
    });

    it('Flatten two and statements', function() {
      const s = new Predicate({
        subject: new Predicate({
          subject: 'name',
          operator: Operator.EQUALS,
          value: "'Bob'"
        }),
        operator: Operator.AND,
        value: new Predicate({
          subject: 'lastname',
          operator: Operator.EQUALS,
          value: "'someone'"
        })
      });

      const obj = s.flatten();
      expect(obj.length).toEqual(2);
      const subject = obj[0];
      expect(subject.subject).toEqual('name');
      expect(subject.operator).toEqual('eq');
      expect(subject.value).toEqual("'Bob'");
      const value = obj[1];
      expect(value.subject).toEqual('lastname');
      expect(value.operator).toEqual('eq');
      expect(value.value).toEqual("'someone'");
    });
  });
});
