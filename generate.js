const playwright = require("playwright")
const { format } = require("prettier")
const { promises: fs } = require("fs")

// Build the parser
// Extra logic replaces the IIFE with a function we can call (holy mother of hacks)
const esbuild = require("esbuild")
const getPageAPI = eval(
  [
    "(...args) => {",
    ...esbuild
      .buildSync({ bundle: true, entryPoints: ["parser/index.ts"], write: false })
      .outputFiles[0].text.split("\n")
      .slice(1, -2),
    "return getPageAPI(...args)",
    "}",
  ].join("\n")
)

const baseUrl = "https://discord.com/developers/docs"
const pageUrls = [
  "/resources/audit-log",
  "/resources/channel",
  "/resources/emoji",
  "/resources/guild",
  "/resources/invite",
  "/resources/template",
  "/resources/user",
  "/resources/voice",
  "/resources/webhook",
  "/topics/permissions",
]

function urlToFilename(url) {
  return `${url.split("/").slice(-1)[0]}.ts`
}

const pagesGeneratedInfo = []

async function build() {
  // Delete existing files
  await fs.rm('src', { recursive: true })
  await fs.mkdir("src")

  // Copy public to src
  console.log('Copying public to src')
  for (const file of await fs.readdir('public'))
    await fs.copyFile(`public/${file}`, `src/${file}`)

  // Get ready to build by setting up playwright and getting prettier config
  const prettierConfig = { ...JSON.parse((await fs.readFile(".prettierrc")).toString("utf-8")), parser: "typescript" }

  const browser = await playwright.firefox.launch()
  const context = await browser.newContext()

  // Generate file from Discord's Docs
  const buildPromises = pageUrls.map(async (pageUrl) => {
    console.log(`Creating file for URL: ${pageUrl}`)
    const page = await context.newPage()
    await page.goto(`${baseUrl}${pageUrl}`)

    const filename = urlToFilename(pageUrl)

    const { text, dependencies, provides } = await page.evaluate(getPageAPI)
    pagesGeneratedInfo.push({ filename, dependencies, provides })

    const formattedText = format(text, prettierConfig)

    await fs.writeFile(`./src/${filename}`, formattedText)
    console.log(`Finished creating file for URL: ${pageUrl}`)
  })

  // Close browser when we're done building
  await Promise.all(buildPromises).then(() => browser.close())

  // Create imports for each file
  for (const { dependencies, filename } of pagesGeneratedInfo) {
    console.log(`Updating imports for: ${filename}`)
    const pagesDependedOn = pagesGeneratedInfo
      .map((page) => ({
        filename: page.filename,
        provides: page.provides.filter((providedType) => dependencies.includes(providedType)),
      }))
      .filter((page) => page.provides.length)

    const imports = ['import { getQueryParams } from "./helpers"', 'import { FetchFunc } from "./types"']
    imports.push(
      ...pagesDependedOn.map((page) => `import { ${page.provides.join(", ")} } from './${page.filename.slice(0, -3)}'`)
    )

    const currentText = (await fs.readFile(`./src/${filename}`)).toString("utf-8")
    await fs.writeFile(`./src/${filename}`, [imports.join("\n"), currentText].join("\n\n"))
  }

  // Create index file for external imports
  console.log("Creating index.ts")
  const files = (await fs.readdir("src")).filter((file) => file !== "index.ts")
  await fs.writeFile(`./src/index.ts`, files.map((file) => `export * from './${file.slice(0, -3)}'`).join("\n"))
}

build()
