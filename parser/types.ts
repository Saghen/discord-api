import { capitalize, kebabToPascal, notFirst, snakeToPascal } from "./strings"

export function getHref(elem) {
  const anchorElem = elem.querySelector(
    'a[href^="/developers/docs/resources"], a[href^="/developers/docs/topics/"], a[href^="/developers/docs/interactions"]'
  )
  const href = anchorElem?.getAttribute("href")
  const isGateway = href?.includes("/topics/gateway")
  const isId = elem.innerText.split(" ").some((word) => ["id", "ids"].includes(word))

  return {
    href,
    isGateway,
    isId,
  }
}

const hashMapping = {
  messageinteraction: "IMessageInteraction",
}

export function getHrefName({ href, isGateway, isId }) {
  if (isId) return "string"

  const hash = new URL(`https://discord.com${href ?? ""}`).hash.slice(1)
  if (!hash) return

  if (hashMapping[hash]) return hashMapping[hash]

  const isObject = hash.includes("object")
  const isStructure = hash.endsWith("structure")
  const isInfo = hash.endsWith("info")
  const isEnum = isObject && !hash.endsWith("object")
  const isBitwise = hash.includes("bitwise") && !hash.endsWith("bitwise")

  if (isBitwise) return `${snakeToPascal(kebabToPascal(hash.slice(hash.indexOf("bitwise") + 7)))}Enum`
  if (isGateway) return "I" + kebabToPascal(hash)
  if (isStructure) return "I" + kebabToPascal(hash.slice(isObject ? hash.indexOf("object") + 7 : 0, -9))
  if (isInfo) return "I" + kebabToPascal(hash.slice(isObject ? hash.indexOf("object") + 7 : 0, -4))
  if (isEnum) return `${snakeToPascal(kebabToPascal(hash.slice(hash.indexOf("object") + 7)))}Enum`
  if (isObject) return "I" + kebabToPascal(hash).slice(0, -6)
}

export function getTsType(val) {
  val = val
    .replace("array of", "")
    .replace("list of", "")
    .replace(/\([\w\s]+\)/g, "")
    .replace("*", "")
    .trim()
    .split(";")
    .filter(Boolean)[0]
  if (["snowflake", "snowflakes", "image data", "strings"].includes(val) || val.includes("id") || val.includes("ids"))
    return "string"
  if (["integer", "integers", "int", "ints"].includes(val)) return "number"
  if (val === "mixed") return "any"
  if (val === "ISO8601 timestamp") return "Date"
  if (val.split(" or ").length > 1) return val.split(" or ").map(getTsType).join(" | ")
  if (val.split(" ").filter(Boolean).length > 1)
    return val.split(" ").filter(Boolean).map(notFirst(capitalize)).join("")
  return val
}

export function handlePartial(originalText, val) {
  if (originalText.includes("partial") && val.startsWith("I")) return `Partial<${val}>`
  return val
}

export function handleArray(originalText, val) {
  return `${val}${originalText.startsWith("array") || originalText.startsWith("list") ? "[]" : ""}`
}
