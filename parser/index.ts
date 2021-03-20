import { getTableEnum, getTableInterface, getEndpointDefinition } from "./dom"
import { getHrefName } from "./types"

export function getPageAPI({ isGateway = false } = {}) {
  const allElements = Array.from(document.querySelectorAll('div[class^="markdown"] > *'))
  const elementsBeforeHttpReq = allElements.slice(
    0,
    allElements.findIndex((elem) => elem.classList.contains("http-req"))
  )
  const typeTables = elementsBeforeHttpReq.filter((elem) => elem.tagName === "TABLE")
  const httpReqElems = Array.from(document.querySelectorAll(".http-req"))

  const types = typeTables
    .map((typeTable) => {
      let headerElem = typeTable.previousElementSibling as HTMLElement
      while (headerElem.tagName !== "H6") headerElem = headerElem.previousElementSibling as HTMLElement

      if (headerElem.id.endsWith("limits")) return
      const name = getHrefName({
        href: "#" + headerElem.id,
        isGateway,
        isId: false,
      })

      const isInterface = name.startsWith("I") && !name.endsWith("Enum")
      const { text, dependencies } = isInterface ? getTableInterface(typeTable) : getTableEnum(typeTable)

      return { isInterface, name, text, dependencies }
    })
    .filter(Boolean)
    .map(({ isInterface, name, text, dependencies }) => ({
      text: `export ${isInterface ? "interface" : "enum"} ${name} {
    ${text}
  }`,
      name,
      isInterface,
      dependencies,
    }))

  const functions = httpReqElems.map(getEndpointDefinition)

  const provides = types.map((type) => type.name)
  const dependencies = Array.from(
    new Set([...types.map((type) => type.dependencies), ...functions.map((type) => type.dependencies)].flat())
  ).filter((dependency) => !provides.includes(dependency))

  return {
    dependencies,
    provides,
    text: [
      "// ######## Types ########",
      types.map((type) => type.text).join("\n\n"),
      "// ######## Functions ########",
      functions.map((type) => type.text).join("\n\n"),
    ].join("\n\n"),
  }
}

console.log(getPageAPI())
