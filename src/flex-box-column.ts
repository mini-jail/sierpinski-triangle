import {
  addElement,
  component,
  view,
} from "https://raw.githubusercontent.com/mini-jail/dom/main/mod.ts"

export const FlexBoxColumn = component((...children: (() => void)[]) => {
  addElement("div", (attr) => {
    attr.class = "flex-box-col"
    view(() => {
      for (const child of children) child()
    })
  })
})

export default FlexBoxColumn
