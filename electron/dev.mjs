import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { createServer } from "vite"

const electron = createRequire(import.meta.url)("electron")

const server = await createServer({ server: { port: 1440, strictPort: false } })
await server.listen()

const url = server.resolvedUrls.local[0]

const { ELECTRON_RUN_AS_NODE, ...env } = process.env
const child = spawn(electron, [".", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...env, ELECTRON_DEV_URL: url },
})

child.on("exit", async code => {
  await server.close()
  process.exit(code ?? 0)
})
