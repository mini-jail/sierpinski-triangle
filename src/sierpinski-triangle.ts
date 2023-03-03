import {
  addElement,
  component,
} from "https://raw.githubusercontent.com/mini-jail/dom/main/mod.ts"
import {
  inject,
  injection,
  onDestroy,
  onMount,
  signal,
} from "https://raw.githubusercontent.com/mini-jail/signal/main/mod.ts"

const TriangleInjection = injection((() => {
  const elapsed = signal(0)
  const count = signal(0)
  return {
    elapsed,
    count,
    dots: signal(0),
    target: signal(1000),
    interval: signal(1000),
    size: signal(25),
    scale() {
      const e = (elapsed() / 1000) % 10
      return 1 + (e > 5 ? 10 - e : e) / 10
    },
    countText() {
      return count().toString()
    },
  }
})())

export const injectTriangle = () => inject(TriangleInjection)

export const TriangleDemo = component(
  (target: number, size: number, interval: number) => {
    const { elapsed, count, scale, dots } = injectTriangle()
    let id: number

    onMount(() => {
      console.log("mount: TriangleDemo")
      id = setInterval(() => count((count() % 10) + 1), interval)
      const start = Date.now()
      const frame = () => {
        elapsed(Date.now() - start)
        requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })

    onDestroy(() => {
      console.log("destroy:TriangleDemo")
      clearInterval(id)
    })

    addElement("div", (attr) => {
      attr.class = "triangle-demo"
      attr.style = () => `
        transform:
          scaleX(${scale() / 2.1}) 
          scaleY(0.7) 
          translateZ(0.1px);
      `
      Triangle(0, 0, target, size)
    })
  },
)

const Triangle = component(
  (x: number, y: number, target: number, size: number) => {
    if (target <= size) return Dot(x, y, target)
    target = target / 2
    Triangle(x, y - target / 2, target, size)
    Triangle(x - target, y + target / 2, target, size)
    Triangle(x + target, y + target / 2, target, size)
  },
)

const Dot = component((x: number, y: number, target: number) => {
  const { countText, dots } = injectTriangle()
  const hover = signal(false)
  const mouseOut = () => hover(false)
  const mouseOver = () => hover(true)

  onMount(() => {
    dots(dots() + 1)
  })
  onDestroy(() => {
    dots(dots() - 1)
  })

  addElement("div", (attr) => {
    attr.class = "dot"
    attr.onMouseOver = mouseOver
    attr.onMouseOut = mouseOut
    attr.textContent = () => hover() ? "*" + countText() + "*" : countText()
    attr.style = {
      width: target + "px",
      height: target + "px",
      lineHeight: target + "px",
      backgroundColor: () => hover() === true ? "cornflowerblue" : "thistle",
      left: x + "px",
      top: y + "px",
      fontSize: (target / 2.5) + "px",
      borderRadius: target + "px",
    }
  })
})
