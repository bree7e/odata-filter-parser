/**
 * Originally JS code from https://github.com/jadrake75/odata-filter-parser
 * 2015 Jason Drake, Apache License, Version 2.0
 */
export enum Operator {
  EQUALS = 'eq',
  AND = 'and',
  OR = 'or',
  GREATER_THAN = 'gt',
  GREATER_THAN_EQUAL = 'ge',
  LESS_THAN = 'lt',
  LESS_THAN_EQUAL = 'le',
  LIKE = 'like',
  IS_NULL = 'is null',
  NOT_EQUAL = 'ne',
  CP = 'cp'
}

export function ispOdataStringAdapter(value: string): string {
  return value
    .replace(/\+EQ\+/g, ' eq ')
    .replace(/\+CP\+/g, ' cp ')
    .replace(/\+OR\+/g, ' or ')
    .replace(/\+AND\+/g, ' and ');
}

/**
 * Whether a defined operation is unary or binary.  Will return true
 * if the operation only supports a subject with no value.
 *
 * @param op the operation to check.
 * @return whether the operation is an unary operation.
 */
export function isUnaryOperator(op: Operator): boolean {
  let value = false;
  if (op === Operator.IS_NULL) {
    value = true;
  }
  return value;
}

/**
 * Whether a defined operation is a logical operators or not.
 *
 * @param  op the operation to check.
 * @return whether the operation is a logical operation.
 */
export function isLogicalOperator(op: Operator | undefined): boolean {
  return op === Operator.AND || op === Operator.OR;
}

/**
 * Predicate is the basic model construct of the odata expression
 *
 * @param config
 */
export class Predicate {
  subject?: Predicate | string | null;
  value?: Predicate | Date | string | number | boolean | null;
  operator: Operator;

  constructor(config?: {
    subject: Predicate | string | null;
    value?: Predicate | Date | string | number | boolean | null;
    operator?: Operator;
  }) {
    //
    // if (!config) {
    //   config = {};
    // }
    this.subject = config?.subject;
    this.value = config?.value;
    this.operator = config?.operator ?? Operator.EQUALS;
    return this;
  }

  static concat(operator: Operator, p: Predicate | Predicate[]): Predicate;
  static concat(operator: Operator, ...p: Predicate[]): Predicate;
  static concat(operator: Operator, p: Predicate | Predicate[]): Predicate {
    if (arguments.length < 3 && !(p instanceof Array && p.length >= 2)) {
      throw {
        key: 'INSUFFICIENT_PREDICATES',
        msg: 'At least two predicates are required'
      };
    } else if (!operator || !isLogicalOperator(operator)) {
      throw {
        key: 'INVALID_LOGICAL',
        msg: 'The operator is not representative of a logical operator.'
      };
    }
    let result;
    let arr = [];
    if (p instanceof Array) {
      arr = p;
    } else {
      for (let i = 1; i < arguments.length; i++) {
        arr.push(arguments[i]);
      }
    }
    const len = arr.length;
    result = new Predicate({
      subject: arr[0],
      operator
    });
    if (len === 2) {
      result.value = arr[len - 1];
    } else {
      const a = [];
      for (let j = 1; j < len; j++) {
        a.push(arr[j]);
      }
      result.value = Predicate.concat(operator, a);
    }
    return result;
  }

  flatten(result?: Predicate[]): Predicate[] {
    if (!result) {
      result = [];
    }
    if (isLogicalOperator(this.operator)) {
      result = result.concat((this.subject as Predicate).flatten());
      result = result.concat((this.value as Predicate).flatten());
    } else {
      result.push(this);
    }
    return result;
  }

  /**
   * Will serialie the predicate to an ODATA compliant serialized string.
   *
   * @return The compliant ODATA query string
   */
  serialize(): string {
    let retValue = '';
    if (this.operator) {
      if (this.subject === undefined || this.subject === null) {
        throw {
          key: 'INVALID_SUBJECT',
          msg: 'The subject is required and is not specified.'
        };
      }
      if (
        isLogicalOperator(this.operator) &&
        (!(this.subject instanceof Predicate || this.value instanceof Predicate) ||
          (this.subject instanceof Predicate && this.value === undefined))
      ) {
        throw {
          key: 'INVALID_LOGICAL',
          msg: 'The predicate does not represent a valid logical expression.'
        };
      }
      retValue = '(';
      if (this.operator === Operator.LIKE) {
        let op = 'contains';
        const lastIndex: number = (this.value as string).lastIndexOf('*');
        const index: number = (this.value as string).indexOf('*');
        let v: string = this.value as string;
        if (index === 0 && lastIndex !== (this.value as string).length - 1) {
          op = 'endswith';
          v = v.substring(1);
        } else if (lastIndex === (this.value as string).length - 1 && index === lastIndex) {
          op = 'startswith';
          v = v.substring(0, lastIndex);
        } else if (index === 0 && lastIndex === (this.value as string).length - 1) {
          v = v.substring(1, lastIndex);
        }
        retValue += `${op}(${this.subject},'${v}')`;
      } else {
        retValue += `${
          this.subject instanceof Predicate ? this.subject.serialize() : this.subject
        } ${this.operator}`;

        if (!isUnaryOperator(this.operator)) {
          if (this.value === undefined || this.value === null) {
            throw {
              key: 'INVALID_VALUE',
              msg: 'The value was required but was not defined.'
            };
          }
          retValue += ' ';
          const val = typeof this.value;
          if (val === 'string') {
            retValue += `'${this.value}'`;
          } else if (val === 'number' || val === 'boolean') {
            retValue += this.value;
          } else if (this.value instanceof Predicate) {
            retValue += this.value.serialize();
          } else if (this.value instanceof Date) {
            retValue += `datetimeoffset'${this.value.toISOString()}'`;
          } else {
            throw {
              key: 'UNKNOWN_TYPE',
              msg: `Unsupported value type: ${typeof this.value}`,
              source: this.value
            };
          }
        }
      }

      retValue += ')';
    }
    return retValue;
  }
}

type RegExpKey = 'parenthesis' | 'andor' | 'op' | 'startsWith' | 'endsWith' | 'contains';

export class ODataParser {
  readonly REGEX = new Map<RegExpKey, RegExp>([
    ['parenthesis', /^([(](.*)[)])$/],
    ['andor', /^(.*?) (or|and)+ (.*)$/],
    ['op', /(\w*) (eq|gt|lt|ge|le|ne|cp) (datetimeoffset'(.*)'|'(.*)'|[0-9]*)/],
    ['startsWith', /^startswith[(](.*),'(.*)'[)]/],
    ['endsWith', /^endswith[(](.*),'(.*)'[)]/],
    ['contains', /^contains[(](.*),'(.*)'[)]/]
  ]);

  buildLike(match: RegExpMatchArray, key: RegExpKey): Predicate {
    const right =
      key === 'startsWith' ? `${match[2]}*` : key === 'endsWith' ? `*${match[2]}` : `*${match[2]}*`;
    return new Predicate({
      subject: match[1],
      operator: Operator.LIKE,
      value: right
    });
  }

  parseFragment(filter: string): Predicate | null {
    let found = false;
    let obj: Predicate | null = null;
    for (const [key, regex] of this.REGEX) {
      if (found) {
        break;
      }
      const match = filter.match(regex);
      if (match) {
        switch (regex) {
          case this.REGEX.get('parenthesis'):
            if (match.length > 2) {
              if (match[2].indexOf(')') < match[2].indexOf('(')) {
                continue;
              }
              obj = this.parseFragment(match[2]);
            }
            break;
          case this.REGEX.get('andor'):
            obj = new Predicate({
              subject: this.parseFragment(match[1]),
              operator: match[2] as Operator,
              value: this.parseFragment(match[3])
            });
            break;
          case this.REGEX.get('op'):
            obj = new Predicate({
              subject: match[1],
              operator: match[2] as Operator,
              value: !match[3].includes("'") ? +match[3] : match[3]
            });
            if (typeof obj.value === 'string') {
              const quoted = obj.value.match(/^'(.*)'$/);
              const m = obj.value.match(/^datetimeoffset'(.*)'$/);
              if (quoted && quoted.length > 1) {
                obj.value = quoted[1];
              } else if (m && m.length > 1) {
                obj.value = new Date(m[1]);
              }
            }

            break;
          case this.REGEX.get('startsWith'):
          case this.REGEX.get('endsWith'):
          case this.REGEX.get('contains'):
            obj = this.buildLike(match, key);
            break;
        }
        found = true;
      }
    }
    return obj;
  }

  parse(filterStr: string | null): Predicate | null {
    if (!filterStr || filterStr === '') {
      return null;
    }
    const filter = ispOdataStringAdapter(filterStr.trim());
    let obj: Predicate | null = null;
    if (filter.length > 0) {
      obj = this.parseFragment(filter);
    }
    return obj;
  }
}
