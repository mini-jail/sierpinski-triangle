import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { serveDir } from "https://deno.land/std@0.178.0/http/file_server.ts"

const command = (strings: TemplateStringsArray) => {
  return Deno.run({ cmd: strings.join("").split(" ") })
}

command`deno bundle ./app.ts ./static/app.js`

serve(async (req: Request) => {
  return await serveDir(req, { urlRoot: "./static" })
})
