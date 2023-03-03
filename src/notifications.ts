import {
  addElement,
  addText,
  attributesRef,
  component,
  elementRef,
  view,
} from "https://raw.githubusercontent.com/mini-jail/dom/main/mod.ts"
import {
  inject,
  injection,
  onDestroy,
  onMount,
  provider,
  signal,
} from "https://raw.githubusercontent.com/mini-jail/signal/main/mod.ts"

export type Notify = {
  date: Date
  title: string
  message: string
}

export const injectNotification = () => inject(NotificationInjection)

const NotificationInjection = injection((() => {
  const notifications = signal<Notify[]>([])
  return {
    notifications,
    notify(title: string, message: string) {
      notifications(
        notifications().concat({
          date: new Date(),
          title: title,
          message: message,
        }),
      )
    },
    unnotify(item: Notify) {
      notifications(notifications().filter(($) => $ !== item))
    },
    focus: signal<Notify>(),
  }
})())

export const Notifications = component(() => {
  const { notifications, unnotify, notify } = injectNotification()

  const errorNotify = (err: any) => {
    if (typeof err === "object") err = err?.message || JSON.stringify(err)
    notify("Error", String(err))
  }

  onMount(() => addEventListener("error", errorNotify))
  onDestroy(() => removeEventListener("error", errorNotify))

  addElement("div", (attr) => {
    attr.class = "notifications"

    view(() => {
      if (notifications().length > 0) {
        addElement("div", (attr) => {
          attr.class = "notification"
          disappearOnMouseDown(() => notifications([]), 500)
          addElement("b", () => addText("delete all"))
        })
      }
    })

    view(() => {
      for (const item of [...notifications()].reverse()) {
        addElement("div", (attr) => {
          attr.class = "notification"
          disappearOnMouseDown(() => unnotify(item), 500)
          addElement("b", () => addText(item.title))
          addElement("div", () => addText(item.message))
        })
      }
    })
  })
})

function disappearOnMouseDown(callback: () => void, timeout: number) {
  const atrs = attributesRef()!
  let deleteTimeId: number
  atrs.onMouseUp = (ev) => {
    ev.currentTarget.removeAttribute("disappear")
    clearTimeout(deleteTimeId)
  }
  atrs.onMouseDown = (ev) => {
    if (ev.button !== 0) return
    ev.currentTarget.setAttribute("disappear", "")
    ev.currentTarget.style.setProperty("--timeout", timeout + "ms")
    deleteTimeId = setTimeout(callback, timeout)
  }
}
