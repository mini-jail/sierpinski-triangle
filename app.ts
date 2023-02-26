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
  const { target, interval, size, steps } = injectTriangle()
  const { notify, focus, unnotify } = injectNotification()

  onEvent("keyup", ({ key }) => {
    const controls: Record<string, VoidFunction> = {
      ArrowUp() {
        size(size() + steps.size)
        notify("Settings updated", "Size has been increased")
      },
      ArrowDown() {
        const next = size() - steps.size
        if (next >= 5) {
          size(next)
          notify("Settings updated", "Size has been decreased")
        }
      },
      ArrowLeft() {
        target(target() - steps.target)
        notify("Settings updated", "Target has been decreased")
      },
      ArrowRight() {
        target(target() + steps.target)
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
  FlexBox(Stats, Control)
  TriangleDemo(target(), size(), interval())
})

const FlexBox = component((...children: (() => void)[]) => {
  addElement("div", (attr) => {
    attr.style = {
      display: "flex",
      flexDirection: "column",
      margin: "10px",
      gap: "10px",
      width: "max-content",
    }
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
  const { steps } = injectTriangle()

  addElement("pre", (attr) => {
    attr.class = "window"
    addText("Control:\n")
    addText(`  ArrowUp: size + ${steps.size}\n`)
    addText(`  ArrowDown: size - ${steps.size}\n`)
    addText(`  ArrowRight: target + ${steps.target}\n`)
    addText(`  ArrowLeft: target - ${steps.target}\n`)
  })
})
