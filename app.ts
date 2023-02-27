import {} from "https://raw.githubusercontent.com/mini-jail/signal/main/mod.ts"
import {
  addElement,
  addText,
  component,
  render,
} from "https://raw.githubusercontent.com/mini-jail/dom/main/mod.ts"

import { injectNotification, Notifications } from "./src/notifications.ts"
import { injectTriangle, TriangleDemo } from "./src/sierpinski-triangle.ts"
import { onEvent } from "./src/on-event.ts"

render(document.body, () => {
  const { target, interval, size } = injectTriangle()
  const { notify, focus, unnotify } = injectNotification()

  onEvent("keyup", ({ key }) => {
    const controls: Record<string, VoidFunction> = {
      ArrowUp() {
        size(size() + 5)
        notify("Settings updated", "Size has been increased")
      },
      ArrowDown() {
        const next = size() - 5
        if (next >= 5) {
          size(next)
          notify("Settings updated", "Size has been decreased")
        }
      },
      ArrowLeft() {
        target(target() - 50)
        notify("Settings updated", "Target has been decreased")
      },
      ArrowRight() {
        target(target() + 50)
        notify("Settings updated", "Target has been increased")
      },
      Delete() {
        if (focus()) unnotify(focus()!)
        focus(undefined)
      },
    }
    controls[key]?.()
  })

  Notifications()
  FlexBoxColumn(
    Stats,
    Control,
  )
  TriangleDemo(target(), size(), interval())
})

const FlexBoxColumn = component((...children: (() => void)[]) => {
  addElement("div", (attr) => {
    attr.class = "flex-box-col"
    for (const child of children) child()
  })
})

const Stats = component(() => {
  const { target, size, interval, dots } = injectTriangle()
  addElement("pre", (attr) => {
    attr.class = "window"
    addText("Stats:\n")
    addText(`  target: ${target()}\n`)
    addText(`  size: ${size()}\n`)
    addText(`  interval: ${interval()}\n`)
    addText(`  dots: ${dots()}\n`)
  })
})

const Control = component(() => {
  addElement("pre", (attr) => {
    attr.class = "window"
    addText("Control:\n")
    addText(`  ArrowUp: size + 5\n`)
    addText(`  ArrowDown: size - 5\n`)
    addText(`  ArrowRight: target + 50\n`)
    addText(`  ArrowLeft: target - 50\n`)
  })
})
