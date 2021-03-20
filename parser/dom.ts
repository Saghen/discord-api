import {
  camelToPascal,
  capitalize,
  constantToPascal,
  dottedToCamel,
  everyTwo,
  kebabToCamel,
  replaceConstantCase,
  replaceSnakeCase,
  snakeToCamel,
  titleToCamel,
  titleToPascal,
} from "./strings"
import { getHref, getHrefName, getTsType, handleArray, handlePartial } from "./types"

export function getText(elem) {
  if (elem.nodeType === 3) return [elem.textContent]
  return Array.from(elem.childNodes).map(getText).flat(100).filter(Boolean)
}

// Use on the discord api page for quick conversion to TS interfaces
export function getEndpointDefinition(httpReqElement) {
  // Parse heading
  const [title, method, ...pathParts] = getText(httpReqElement)
  const functionName = kebabToCamel(titleToCamel(title.replace(/\/[A-z]+/, "")))
  const params = pathParts
    .filter((_, i) => i % 2 === 1)
    .map((str) => dottedToCamel(str.slice(1, -1)))
    .map((param) => `${param}: string`)

  // Parse body
  let bodyElem = httpReqElement.nextElementSibling as HTMLElement
  while (
    bodyElem &&
    bodyElem.tagName !== "TABLE" &&
    !Array.from(bodyElem.classList).some((val) => val.startsWith("paragraph"))
  )
    bodyElem = bodyElem.nextElementSibling as HTMLElement

  const hrefDefinition = getHref(bodyElem)
  let returnType = (!hrefDefinition.isGateway && getHrefName(hrefDefinition)) || "void"

  const isNoContent = bodyElem.innerText.toLowerCase().includes("returns a 204")
  if (isNoContent) returnType = "void"

  let description = replaceSnakeCase(replaceConstantCase(bodyElem.innerText, constantToPascal), snakeToCamel).replace(
    "a 204 empty response",
    "void"
  )

  // Parse Table
  let elem = httpReqElement.nextElementSibling
  while (elem && !elem.classList.contains("http-req") && !elem.matches("table")) {
    elem = elem.nextElementSibling
  }

  const { text: interfaceString, dependencies } = elem?.matches("table") ? getTableInterface(elem) : { text: "", dependencies: [] }
  const interfaceName = `I${camelToPascal(functionName)}Request`

  if (returnType !== 'void') dependencies.push(returnType)

  // Form string
  return {
    dependencies,
    text: `
  ${
    interfaceString
      ? `export interface ${interfaceName} {
    ${interfaceString}
  }`
      : ""
  }

  /**
   * ${description}
  */
  export function ${functionName}(${[
      "fetch: FetchFunc",
      ...params,
      interfaceString && `body: ${interfaceName}${isInterfaceOptional(interfaceString) ? " = {}" : ""}`,
    ]
      .filter(Boolean)
      .join(", ")}) {
    return fetch<${returnType}>(\`${pathParts
      .map(everyTwo((str) => "${" + dottedToCamel(str.slice(1, -1)) + "}", false))
      .join("")}${method === "GET" && interfaceString ? "${getQueryParams(body)}" : ""}\`, ${
      method !== "GET" && interfaceString ? "body" : "{}"
    }, { method: '${method}' })
  }
  `.trim(),
  }
}

export function isInterfaceOptional(interfaceString: string) {
  const lines = interfaceString
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !line.startsWith("/**"))
  return lines.length === lines.filter((line) => line.replace(/[A-z]/g, "").startsWith("?")).length
}

// FIXME: Fix the typing
export function getTableInterface(table) {
  const rows = Array.from<any>(table.querySelectorAll("tr"))

  const dependencies = []

  const properties = []

  for (const row of rows.slice(1)) {
    // Get key
    let key = snakeToCamel(row.children[0].innerText).replace(/\*/g, "")
    if (key.startsWith("?")) key = key.slice(1)

    if (row.children[1].innerText.includes("?") && !key.includes("?")) key += "?"

    // Get type
    const originalType = row.children[1].innerText.replace("?", "")

    const href = getHrefName(getHref(row.children[1]).href ? getHref(row.children[1]) : getHref(row.children[2])) // Use comment or type href
    const basicType = getTsType(originalType)

    const type = handleArray(originalType, handlePartial(originalType, (basicType !== "boolean" && basicType !== 'any' && href) || basicType))

    // Non primitive types are labelled as a dependency
    if (basicType !== "boolean" && href && href !== 'string') dependencies.push(href)

    // Get Comment
    let comment = replaceSnakeCase(
      capitalize(replaceConstantCase(row.children[2].innerText, constantToPascal)),
      snakeToCamel
    )

    properties.push([key, type, comment])
  }

  return {
    text: properties.map((prop) => `/** ${prop[2]} */\n${prop[0]}: ${prop[1]}`).join("\n"),
    dependencies,
  }
}

export function getTableEnum(table) {
  const rows = table.querySelectorAll("tbody > tr")
  const headerCells = Array.from<any>(table.querySelectorAll("thead > tr > th"))

  const valueColumnIndex = headerCells.findIndex((cell) => ["integer", "value"].includes(cell.innerText.toLowerCase()))
  const hasValueColumn = valueColumnIndex !== -1

  let descriptionColumnIndex = headerCells.findIndex((cell) => "description" === cell.innerText.toLowerCase())
  let hasDescriptionColumn = descriptionColumnIndex !== -1

  let keyColumnIndex = [0, 1, 2, 3].find((val) => valueColumnIndex !== val && descriptionColumnIndex !== val)
  if (keyColumnIndex >= headerCells.length) {
    keyColumnIndex = descriptionColumnIndex
    hasDescriptionColumn = false
  }

  const properties = []

  for (const row of rows) {
    const key = replaceSnakeCase(
      titleToPascal(constantToPascal(row.children[keyColumnIndex].innerText.replace(/\*/g, "").trim())),
      snakeToCamel
    )

    const value = hasValueColumn
      ? row.children[valueColumnIndex].innerText.trim()
      : `"${row.children[keyColumnIndex].innerText.replace(/\*/g, "")}"`

    const comment =
      hasDescriptionColumn &&
      capitalize(replaceConstantCase(row.children[descriptionColumnIndex].innerText, constantToPascal))

    properties.push(`${hasDescriptionColumn ? ` /** ${comment} */\n` : ""}${key} = ${value}`)
  }
  return { text: properties.join(",\n"), dependencies: [] }
}

// function getTableEnumConditional(table, enumStr) {
//   const rows = table.querySelectorAll("tr")
//   const properties = []

//   for (const row of rows) {
//     let camelKey = row.children[0].innerText
//       .replace(/\*/g, "")
//       .split("_")
//       .filter(Boolean)
//       .map((str) => `${str[0].toUpperCase()}${str.slice(1)}`)
//       .join("")
//       .trim()

//     let value = [row.children[2].innerText.replace("?", "")].map((val) => {
//       val = val.trim()
//       if (val === "snowflake") return "string"
//       if (val === "integer") return "number"
//       if (val.startsWith("array")) return "[]"
//       if (val === "ISO8601 timestamp") return "Date"
//       if (val.split(" ").filter(Boolean).length > 1)
//         return val
//           .split(" ")
//           .filter(Boolean)
//           .map((str, i) => (i === 0 ? str : `${str[0].toUpperCase()}${str.slice(1)}`))
//           .join("")
//       return val
//     })[0]

//     properties.push(`T extends ${enumStr}.${camelKey} ? ${value}`)
//   }
//   return `${properties.join(": ")} : any`
// }
