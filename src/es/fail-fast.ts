const requireCondition = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message)
}

function requireValueSet<T>(argument: T | null | undefined, name: string): T {
  if (argument !== null && argument !== undefined) return argument
  throw new Error(`${name} must be set`)
}

const requireValueSetWithType = (aType: string) => (argument: any, name: string) => {
  requireValueSet(argument, name)
  requireCondition(typeof argument === aType.split(' ')[1], `${name} must be ${aType}`)
}

const requireNumber = (argument: any, name: string) => {
  requireValueSetWithType('a number')(argument, name)
}

const requireString = (argument: any, name: string) => {
  requireValueSetWithType('a string')(argument, name)
}

const requireObject = (argument: any, name: string) => {
  requireValueSetWithType('an object')(argument, name)
}

const requireInstanceOf = (type: any, { argument, name }:{argument:any, name:string}) => {
  requireValueSet(argument, name)
  requireCondition(argument instanceof type, `argument ${name} must be an instance of ${type}`)
}

const requireArrayOf = (type: any, { argument, name }:{argument:any, name:string}) => {
  requireValueSet(argument, name)
  requireCondition(argument instanceof Array, `argument ${name} must be an array`)
  requireCondition(
    argument.every((e: any) => e instanceof type),
    `argument ${name} must only contain elements of type ${type}`)
}

const requireArrayOfEnum = (type: any, { argument, name }:{argument:any, name:string}) => {
  requireValueSet(argument, name)
  requireCondition(argument instanceof Array, `argument ${name} must be an array`)
  requireCondition(
    argument.every((e: any) => type[e] !== undefined),
    `argument ${name} must only contain elements of type ${type}`)
}

export const failFast = {
  unless: requireCondition,
  unlessExists: requireValueSet,
  unlessNumber: requireNumber,
  unlessString: requireString,
  unlessObject: requireObject,
  unlessInstanceOf: (type: any) => (argument: any, name: string) => requireInstanceOf(type, { argument, name }),
  unlessArrayOf: (type: any) => (argument: any, name: string) => requireArrayOf(type, { argument, name }),
  unlessArrayOfEnum: (type: any) => (argument: any, name: string) => requireArrayOfEnum(type, { argument, name }),
}
