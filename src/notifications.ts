import {
  addElement,
  component,
  elRef,
} from "https://raw.githubusercontent.com/mini-jail/dom/main/mod.ts"
import {
  inject,
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

export const injectNotification = () => inject(NotificationContext)

const NotificationContext = provider(() => {
  const notifications = signal<Notify[]>([])
  return {
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
    notifications,
    getTime(date: Date) {
      return `${date.getHours()}:${
        date.getMinutes().toString().padStart(2, "0")
      }:${date.getSeconds().toString().padStart(2, "0")}`
    },
  }
})

export const Notifications = component(() => {
  const { notifications, getTime, unnotify } = injectNotification()
  addElement("div", (attr) => {
    attr.class = "notifications"
    for (const item of notifications()) {
      addElement("div", (attr) => {
        attr.class = "notification"
        attr.textContent = `${getTime(item.date)}: ${item.title}`
        disappearOnMouseDown(() => unnotify(item), 1000)
        addElement("div", (attr) => attr.textContent = item.message)
      })
    }
  })
})

function disappearOnMouseDown(callback: () => void, timeout: number) {
  const elt = elRef()
  if (elt === undefined) return
  let deleteTimeId: number
  const onMouseDown = (ev: MouseEvent) => {
    if (ev.button !== 0) return
    elt.setAttribute("disappear", "")
    elt.style.setProperty("--timeout", timeout + "ms")
    deleteTimeId = setTimeout(() => {
      callback()
    }, timeout)
  }
  const onMouseUp = () => {
    elt.removeAttribute("disappear")
    clearTimeout(deleteTimeId)
  }
  onMount(() => {
    elt.addEventListener("mousedown", onMouseDown)
    elt.addEventListener("mouseup", onMouseUp)
  })
  onDestroy(() => {
    elt.removeEventListener("mousedown", onMouseDown)
    elt.removeEventListener("mouseup", onMouseUp)
  })
}
