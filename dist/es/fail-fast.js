const requireCondition = (condition, message) => {
    if (!condition)
        throw new Error(message);
};
function requireValueSet(argument, name) {
    if (argument !== null && argument !== undefined)
        return argument;
    throw new Error(`${name} must be set`);
}
const requireValueSetWithType = (aType) => (argument, name) => {
    requireValueSet(argument, name);
    requireCondition(typeof argument === aType.split(' ')[1], `${name} must be ${aType}`);
};
const requireNumber = (argument, name) => {
    requireValueSetWithType('a number')(argument, name);
};
const requireString = (argument, name) => {
    requireValueSetWithType('a string')(argument, name);
};
const requireObject = (argument, name) => {
    requireValueSetWithType('an object')(argument, name);
};
const requireInstanceOf = (type, { argument, name }) => {
    requireValueSet(argument, name);
    requireCondition(argument instanceof type, `argument ${name} must be an instance of ${type}`);
};
const requireArrayOf = (type, { argument, name }) => {
    requireValueSet(argument, name);
    requireCondition(argument instanceof Array, `argument ${name} must be an array`);
    requireCondition(argument.every((e) => e instanceof type), `argument ${name} must only contain elements of type ${type}`);
};
const requireArrayOfEnum = (type, { argument, name }) => {
    requireValueSet(argument, name);
    requireCondition(argument instanceof Array, `argument ${name} must be an array`);
    requireCondition(argument.every((e) => type[e] !== undefined), `argument ${name} must only contain elements of type ${type}`);
};
export const failFast = {
    unless: requireCondition,
    unlessExists: requireValueSet,
    unlessNumber: requireNumber,
    unlessString: requireString,
    unlessObject: requireObject,
    unlessInstanceOf: (type) => (argument, name) => requireInstanceOf(type, { argument, name }),
    unlessArrayOf: (type) => (argument, name) => requireArrayOf(type, { argument, name }),
    unlessArrayOfEnum: (type) => (argument, name) => requireArrayOfEnum(type, { argument, name }),
};
