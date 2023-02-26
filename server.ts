import { serve } from "server"
import { serveDir } from "file_server"

const command = (strings: TemplateStringsArray) => {
  return Deno.run({ cmd: strings.join("").split(" ") })
}

command`deno bundle --import-map=import_map.json ./app.ts ./static/app.js`

serve(async (req: Request) => {
  return await serveDir(req, { urlRoot: "./static" })
})
