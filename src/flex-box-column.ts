import {
  addElement,
} from "https://raw.githubusercontent.com/mini-jail/dom/main/mod.ts"

export const FlexBoxColumn = (...children: (() => void)[]) => {
  addElement("div", (attr) => {
    attr.class = "flex-box-col"
    for (const child of children) child()
  })
}

export default FlexBoxColumn
