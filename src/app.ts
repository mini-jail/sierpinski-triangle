import {
  component,
  render,
} from "https://raw.githubusercontent.com/mini-jail/dom/main/mod.ts"
import { injectNotification, Notifications } from "./notifications.ts"
import { injectTriangle, TriangleDemo } from "./sierpinski-triangle.ts"
import onEvent from "./on-event.ts"
import FlexBoxColumn from "./flex-box-column.ts"
import Info from "./info.ts"

const App = () => {
  const { target, interval, size } = injectTriangle()

  Notifications()
  FlexBoxColumn(
    Stats,
    Control,
  )
  TriangleDemo(target(), size(), interval())
}

const Stats = component(() => {
  const { target, size, interval, dots } = injectTriangle()

  Info("Stats", () => ({
    target: target(),
    size: size(),
    interval: interval(),
    dots: dots(),
  }))
})

const Control = component(() => {
  const { target, size } = injectTriangle()
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

  Info("Control", () => ({
    ArrowUp: "size + 5",
    ArrowDown: "size - 5",
    ArrowRight: "size + 50",
    ArrowLeft: "size - 50",
  }))
})

render(document.body, () => {
  App()
})
