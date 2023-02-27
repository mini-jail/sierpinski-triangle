import {
  addElement,
  addText,
  component,
} from "https://raw.githubusercontent.com/mini-jail/dom/main/mod.ts"

export const Info = component(
  (title: string, data: () => Record<string, any>) => {
    addElement("pre", (attr) => {
      attr.class = "info"
      addElement("b", () => addText(title + ":\n"))
      const current = data()
      for (const field in current) {
        addText(`  ${field}: ${current[field]}\n`)
      }
    })
  },
)

export default Info
