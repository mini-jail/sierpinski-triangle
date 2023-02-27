import {
  addElement,
  component,
} from "https://raw.githubusercontent.com/mini-jail/dom/main/mod.ts"
import {
  computed,
  inject,
  onDestroy,
  onMount,
  provider,
  signal,
} from "https://raw.githubusercontent.com/mini-jail/signal/main/mod.ts"

const TriangleContext = provider(() => {
  const elapsed = signal(0)
  const count = signal(0)
  return {
    target: signal(1000),
    elapsed,
    count,
    interval: signal(1000),
    size: signal(25),
    dots: signal(0),
    scale: computed(() => {
      const e = (elapsed() / 1000) % 10
      return 1 + (e > 5 ? 10 - e : e) / 10
    }),
    countText: computed(() => count().toString()),
  }
})

export const injectTriangle = () => inject(TriangleContext)

export const TriangleDemo = component(
  (target: number, size: number, interval: number) => {
    const { elapsed, count, scale } = injectTriangle()
    let id: number

    onMount(() => {
      console.log("mount")
      id = setInterval(() => count((count() % 10) + 1), interval)
      const start = Date.now()
      const frame = () => {
        elapsed(Date.now() - start)
        requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })

    onDestroy(() => {
      console.log("destroy")
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

const Triangle = component((
  x: number,
  y: number,
  target: number,
  size: number,
) => {
  if (target <= size) return Dot(x, y, target)
  target = target / 2
  Triangle(x, y - target / 2, target, size)
  Triangle(x - target, y + target / 2, target, size)
  Triangle(x + target, y + target / 2, target, size)
})

const Dot = component((x: number, y: number, target: number) => {
  const { countText, dots } = inject(TriangleContext)
  const hover = signal(false)
  const mouseOut = () => hover(false)
  const mouseOver = () => hover(true)
  const text = () => hover() ? "*" + countText() + "*" : countText()
  const color = () => hover() === true ? "cornflowerblue" : "thistle"

  onMount(() => dots(dots() + 1))
  onDestroy(() => dots(dots() - 1))

  addElement("div", (attr) => {
    attr.class = "dot"
    attr.onMouseOver = mouseOver
    attr.onMouseOut = mouseOut
    attr.textContent = text
    attr.style = {
      width: target + "px",
      height: target + "px",
      lineHeight: target + "px",
      backgroundColor: color,
      left: x + "px",
      top: y + "px",
      fontSize: (target / 2.5) + "px",
      borderRadius: target + "px",
    }
  })
})
