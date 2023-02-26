const command = (strings: TemplateStringsArray) => {
  return Deno.run({ cmd: strings.join("").split(" ") })
}

command`deno bundle ./app.ts ./static/app.js`
