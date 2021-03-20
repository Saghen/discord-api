export function lower(str) {
  return str.toLowerCase()
}

export function upper(str) {
  return str.toUpperCase()
}

export function capitalize(str) {
  return `${str[0].toUpperCase()}${str.slice(1)}`
}

export function onlyFirst(callback) {
  return (val, i, ...args) => (i !== 0 ? val : callback(val, i, ...args))
}

export function notFirst(callback) {
  return (val, i, ...args) => (i === 0 ? val : callback(val, i, ...args))
}

export function everyTwo(callback, even) {
  return (val, i, ...args) => (i % 2 === Number(even) ? val : callback(val, i, ...args))
}

// Title ->
export function titleToPascal(str) {
  return str.split(" ").map(capitalize).join("")
}

export function titleToCamel(str) {
  return str.split(" ").map(capitalize).map(onlyFirst(lower)).join("")
}

// Dotted ->
export function dottedToCamel(str) {
  return str.split(".").map(notFirst(capitalize)).join("")
}

// Camel ->
export function camelToPascal(str) {
  return `${str[0].toUpperCase()}${str.slice(1)}`
}

export function camelToConstant(str) {
  return str
    .split(/(?=[A-Z])/g)
    .map(upper)
    .join("_")
}

export function camelToSnake(str) {
  return str
    .split(/(?=[A-Z])/g)
    .map(lower)
    .join("_")
}

export function camelToDotted(str) {
  str
    .split(/(?=[A-Z])/g)
    .map(lower)
    .join(".")
}

// Constant ->
export function constantToCamel(str) {
  return str.split("_").filter(Boolean).map(lower).map(notFirst(capitalize)).join("")
}

export function constantToPascal(str) {
  return str.split("_").filter(Boolean).map(lower).map(capitalize).join("")
}

export function constantToSnake(str) {
  return str.toLowerCase()
}

// Pascal ->
export function pascalToConstant(str) {
  return str
    .split(/(?=[A-Z])/g)
    .map(upper)
    .join("_")
}

export function pascalToCamel(str) {
  return str
    .split(/(?=[A-Z])/g)
    .map(onlyFirst(lower))
    .join("")
}

export function pascalToSnake(str) {
  return str
    .split(/(?![A-Z])/g)
    .map(lower)
    .join("_")
}

// Snake ->
export function snakeToCamel(str) {
  return str.split("_").map(notFirst(capitalize)).join("")
}

export function snakeToPascal(str) {
  return str.split("_").map(capitalize).join("")
}

export function snakeToConstant(str) {
  return str.toUpperCase()
}

// Kebab ->
export function kebabToCamel(str) {
  return str.split("-").filter(Boolean).map(notFirst(capitalize)).join("")
}

export function kebabToPascal(str) {
  return str.split("-").filter(Boolean).map(capitalize).join("")
}

// Replace
export function replaceConstantCase(str, callback) {
  return str
    .split(/([A-Z_]+[A-Z]+)/g)
    .map(everyTwo(callback, false))
    .join("")
}

export function replaceSnakeCase(str, callback) {
  return str
    .split(/([a-z_]+[a-z]+)/g)
    .map(everyTwo(callback, false))
    .join("")
}
