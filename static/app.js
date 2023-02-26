// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

const Error = Symbol("Error");
const Queue = new Set();
let nodeQueue;
let parentNode;
function scoped(callback) {
    const _node = node();
    parentNode = _node;
    try {
        return batch(()=>{
            let _cleanup = undefined;
            if (callback.length) {
                _cleanup = cleanNode.bind(undefined, _node, true);
            }
            return callback(_cleanup);
        });
    } catch (error) {
        handleError(error);
    } finally{
        parentNode = _node.parentNode;
    }
}
function node(initialValue, callback) {
    const _node = {
        value: initialValue,
        parentNode,
        children: undefined,
        context: undefined,
        cleanups: undefined,
        callback,
        sources: undefined,
        sourceSlots: undefined
    };
    if (parentNode) {
        if (parentNode.children === undefined) {
            parentNode.children = [
                _node
            ];
        } else {
            parentNode.children.push(_node);
        }
    }
    return _node;
}
function onMount(callback) {
    effect(()=>untrack(callback));
}
function onDestroy(callback) {
    onCleanup(()=>untrack(callback));
}
function effect(callback, initialValue) {
    if (parentNode) {
        const _node = node(initialValue, callback);
        if (nodeQueue) nodeQueue.add(_node);
        else queueMicrotask(()=>updateNode(_node, false));
    } else {
        queueMicrotask(()=>callback(initialValue));
    }
}
function computed(callback, initialValue) {
    const _source = source(initialValue);
    effect(()=>set(_source, callback(_source.value)));
    return get.bind(undefined, _source);
}
function lookup(node, id) {
    return node ? node.context && id in node.context ? node.context[id] : lookup(node.parentNode, id) : undefined;
}
function source(initialValue) {
    return {
        value: initialValue,
        nodes: undefined,
        nodeSlots: undefined
    };
}
function get(source) {
    if (parentNode && parentNode.callback) {
        const sourceSlot = source.nodes?.length || 0, nodeSlot = parentNode.sources?.length || 0;
        if (parentNode.sources === undefined) {
            parentNode.sources = [
                source
            ];
            parentNode.sourceSlots = [
                sourceSlot
            ];
        } else {
            parentNode.sources.push(source);
            parentNode.sourceSlots.push(sourceSlot);
        }
        if (source.nodes === undefined) {
            source.nodes = [
                parentNode
            ];
            source.nodeSlots = [
                nodeSlot
            ];
        } else {
            source.nodes.push(parentNode);
            source.nodeSlots.push(nodeSlot);
        }
    }
    return source.value;
}
function set(source, value) {
    if (typeof value === "function") value = value(source.value);
    source.value = value;
    if (source.nodes?.length) {
        batch(()=>{
            for (const node of source.nodes){
                nodeQueue.add(node);
            }
        });
    }
}
function getSet(source, value) {
    return arguments.length === 1 ? get(source) : set(source, value);
}
function signal(initialValue) {
    const _source = source(initialValue);
    return getSet.bind(undefined, _source);
}
function handleError(error) {
    const errorCallbacks = lookup(parentNode, Error);
    if (!errorCallbacks) return reportError(error);
    for (const callback of errorCallbacks){
        callback(error);
    }
}
function onCleanup(callback) {
    if (parentNode === undefined) return;
    else if (!parentNode.cleanups) parentNode.cleanups = [
        callback
    ];
    else parentNode.cleanups.push(callback);
}
function untrack(callback) {
    const node = parentNode;
    parentNode = undefined;
    const result = callback();
    parentNode = node;
    return result;
}
function batch(callback) {
    if (nodeQueue) return callback();
    nodeQueue = Queue;
    const result = callback();
    queueMicrotask(flush);
    return result;
}
function flush() {
    if (nodeQueue === undefined) return;
    for (const node of nodeQueue){
        nodeQueue.delete(node);
        updateNode(node, false);
    }
    nodeQueue = undefined;
}
function updateNode(node, complete) {
    cleanNode(node, complete);
    if (node.callback === undefined) return;
    const previousNode = parentNode;
    parentNode = node;
    try {
        node.value = node.callback(node.value);
    } catch (error) {
        handleError(error);
    } finally{
        parentNode = previousNode;
    }
}
function cleanNodeSources(node) {
    let source, sourceSlot, sourceNode, nodeSlot;
    while(node.sources.length){
        source = node.sources.pop();
        sourceSlot = node.sourceSlots.pop();
        if (source.nodes?.length) {
            sourceNode = source.nodes.pop();
            nodeSlot = source.nodeSlots.pop();
            if (sourceSlot < source.nodes.length) {
                source.nodes[sourceSlot] = sourceNode;
                source.nodeSlots[sourceSlot] = nodeSlot;
                sourceNode.sourceSlots[nodeSlot] = sourceSlot;
            }
        }
    }
}
function cleanChildNodes(node, complete) {
    const hasCallback = node.callback !== undefined;
    let childNode;
    while(node.children.length){
        childNode = node.children.pop();
        cleanNode(childNode, complete || hasCallback && childNode.callback !== undefined);
    }
}
function cleanNode(node, complete) {
    if (node.sources?.length) cleanNodeSources(node);
    if (node.children?.length) cleanChildNodes(node, complete);
    if (node.cleanups?.length) cleanup(node);
    node.context = undefined;
    if (complete) disposeNode(node);
}
function cleanup(node) {
    while(node.cleanups?.length){
        node.cleanups.pop()();
    }
}
function disposeNode(node) {
    node.value = undefined;
    node.parentNode = undefined;
    node.children = undefined;
    node.cleanups = undefined;
    node.callback = undefined;
    node.sources = undefined;
    node.sourceSlots = undefined;
}
function context(defaultValue) {
    return {
        id: Symbol(),
        defaultValue,
        provide (value, callback) {
            return scoped(()=>{
                parentNode.context = {
                    [this.id]: value
                };
                return callback();
            });
        }
    };
}
function provider(callback) {
    return scoped(()=>context(callback()));
}
function inject(context) {
    return lookup(parentNode, context.id) || context.defaultValue;
}
let parentFgt;
let parentElt;
function elRef() {
    return parentElt;
}
function addElement(tagName, callback) {
    if (parentElt || parentFgt) {
        const elt = document.createElement(tagName);
        if (callback) modify(elt, callback);
        insert(elt);
    }
}
function addText(value) {
    if (parentElt || parentFgt) insert(new Text(String(value)));
}
function render(rootElt, callback) {
    return scoped((cleanup)=>{
        modify(rootElt, callback);
        return cleanup;
    });
}
function component(callback) {
    return (...args)=>scoped(()=>callback(...args));
}
function union(elt, curr, next) {
    const currentLength = curr.length;
    const nextLength = next.length;
    let currentNode, i, j;
    outerLoop: for(i = 0; i < nextLength; i++){
        currentNode = curr[i];
        for(j = 0; j < currentLength; j++){
            if (curr[j] === undefined) continue;
            else if (curr[j].nodeType === 3 && next[i].nodeType === 3) {
                if (curr[j].data !== next[i].data) curr[j].data = next[i].data;
                next[i] = curr[j];
            } else if (curr[j].isEqualNode(next[i])) next[i] = curr[j];
            if (next[i] === curr[j]) {
                curr[j] = undefined;
                if (i === j) continue outerLoop;
                break;
            }
        }
        elt.insertBefore(next[i], currentNode?.nextSibling || null);
    }
    while(curr.length)curr.pop()?.remove();
}
function qualifiedName(name) {
    return name.replace(/([A-Z])/g, (match)=>"-" + match[0]).toLowerCase();
}
function eventName(name) {
    return name.startsWith("on:") ? name.slice(3) : name.slice(2).toLowerCase();
}
function objectAttribute(elt, field, curr, next) {
    const fields = fieldsFrom(curr, next);
    if (fields.length === 0) return;
    for (const subField of fields){
        if (next && typeof next[subField] === "function") {
            effect((subCurr)=>{
                const subNext = next[subField]();
                if (subNext !== subCurr) elt[field][subField] = subNext;
                return subNext;
            });
        } else if (curr && curr[subField] && next[subField] === undefined) {
            elt[field][subField] = null;
        } else if ((curr && curr[subField]) !== next[subField]) {
            elt[field][subField] = next[subField] || null;
        }
    }
}
function dynamicAttribute(elt, field, accessor) {
    effect((curr)=>{
        const next = accessor();
        if (next !== curr) attribute(elt, field, curr, next);
        return next;
    });
}
function attribute(elt, field, curr, next) {
    if (typeof next === "function" && !field.startsWith("on")) {
        dynamicAttribute(elt, field, next);
    } else if (typeof next === "object") {
        objectAttribute(elt, field, curr, next);
    } else if (field === "textContent") {
        if (elt.firstChild?.nodeType === 3) elt.firstChild.data = next;
        else elt.prepend(String(next));
    } else if (field in elt) {
        if (curr && next === undefined) elt[field] = null;
        else elt[field] = next;
    } else if (field.startsWith("on")) {
        curr && elt.removeEventListener(eventName(field), curr);
        next && elt.addEventListener(eventName(field), next);
    } else if (next !== undefined) {
        elt.setAttributeNS(null, qualifiedName(field), String(next));
    } else {
        elt.removeAttributeNS(null, qualifiedName(field));
    }
}
function insert(node) {
    if (parentFgt) parentFgt.push(node);
    else parentElt?.appendChild(node);
}
function fieldsFrom(...objects) {
    const fields = [];
    for (const object of objects){
        if (object == null) continue;
        for(const field in object){
            if (fields.includes(field) === false) {
                fields.push(field);
            }
        }
    }
    return fields;
}
function attributes(elt, curr, next) {
    const fields = fieldsFrom(curr, next);
    if (fields.length === 0) return;
    for (const field of fields){
        const cValue = curr ? curr[field] : undefined;
        const nValue = next ? next[field] : undefined;
        if (cValue !== nValue) attribute(elt, field, cValue, nValue);
    }
}
function children(elt, curr, next) {
    if (curr?.length) union(elt, curr, next);
    else if (next.length) elt.append(...next);
}
function modify(elt, callback) {
    effect((curr)=>{
        const next = [
            callback.length ? {} : undefined,
            []
        ];
        parentElt = elt;
        parentFgt = next[1];
        callback(next[0]);
        if (curr || next[0]) attributes(elt, curr ? curr[0] : undefined, next[0]);
        if (curr || next[1].length) {
            children(elt, curr ? curr[1] : undefined, next[1]);
        }
        if (next[1].length === 0) next[1] = undefined;
        parentElt = undefined;
        parentFgt = undefined;
        return next;
    });
}
const injectNotification = ()=>inject(NotificationContext);
const NotificationContext = provider(()=>{
    const notifications = signal([]);
    return {
        notify (title, message) {
            notifications(notifications().concat({
                date: new Date(),
                title: title,
                message: message
            }));
        },
        unnotify (item) {
            notifications(notifications().filter(($)=>$ !== item));
        },
        focus: signal(),
        notifications,
        getTime (date) {
            return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
        }
    };
});
const Notifications = component(()=>{
    const { notifications , getTime , unnotify  } = injectNotification();
    addElement("div", (attr)=>{
        attr.class = "notifications";
        for (const item of notifications()){
            addElement("div", (attr)=>{
                attr.class = "notification";
                attr.textContent = `${getTime(item.date)}: ${item.title}`;
                disappearOnMouseDown(()=>unnotify(item), 2000);
                addElement("div", (attr)=>attr.textContent = item.message);
            });
        }
    });
});
function disappearOnMouseDown(callback, timeout) {
    const elt = elRef();
    if (elt === undefined) return;
    let deleteTimeId;
    const onMouseDown = (ev)=>{
        if (ev.button !== 0) return;
        elt.setAttribute("disappear", "");
        elt.style.setProperty("--timeout", timeout + "ms");
        deleteTimeId = setTimeout(()=>{
            callback();
        }, timeout);
    };
    const onMouseUp = (ev)=>{
        elt.removeAttribute("disappear");
        clearTimeout(deleteTimeId);
    };
    onMount(()=>{
        elt.addEventListener("mousedown", onMouseDown);
        elt.addEventListener("mouseup", onMouseUp);
    });
    onDestroy(()=>{
        elt.removeEventListener("mousedown", onMouseDown);
        elt.removeEventListener("mouseup", onMouseUp);
    });
}
const TriangleContext = provider(()=>{
    const elapsed = signal(0);
    const count = signal(0);
    const steps = {
        size: 5,
        target: 50
    };
    return {
        target: signal(1000),
        elapsed,
        count,
        interval: signal(1000),
        size: signal(25),
        dots: signal(0),
        steps,
        scale: computed(()=>{
            const e = elapsed() / 1000 % 10;
            return 1 + (e > 5 ? 10 - e : e) / 10;
        }),
        countText: computed(()=>count().toString())
    };
});
const injectTriangle = ()=>inject(TriangleContext);
const TriangleDemo = component((target, size, interval)=>{
    const { elapsed , count , scale  } = injectTriangle();
    let id;
    onMount(()=>{
        console.log("mount");
        id = setInterval(()=>count(count() % 10 + 1), interval);
        const start = Date.now();
        const frame = ()=>{
            elapsed(Date.now() - start);
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    });
    onDestroy(()=>{
        console.log("destroy");
        clearInterval(id);
    });
    addElement("div", (attr)=>{
        attr.style = ()=>`
        position: absolute;
        left: 50%;
        top: 50%;
        transform:
          scaleX(${scale() / 2.1}) 
          scaleY(0.7) 
          translateZ(0.1px);
      `;
        Triangle(0, 0, target, size);
    });
});
const Triangle = component((x, y, target, size)=>{
    if (target <= size) return Dot(x, y, target);
    target = target / 2;
    Triangle(x, y - target / 2, target, size);
    Triangle(x - target, y + target / 2, target, size);
    Triangle(x + target, y + target / 2, target, size);
});
const Dot = component((x, y, target)=>{
    const { countText , dots  } = inject(TriangleContext);
    const hover = signal(false);
    const mouseOut = ()=>hover(false);
    const mouseOver = ()=>hover(true);
    const text = ()=>hover() ? "*" + countText() + "*" : countText();
    const color = ()=>hover() === true ? "cornflowerblue" : "thistle";
    onMount(()=>dots(dots() + 1));
    onDestroy(()=>dots(dots() - 1));
    addElement("div", (attr)=>{
        attr.onMouseOver = mouseOver;
        attr.onMouseOut = mouseOut;
        attr.textContent = text;
        attr.style = {
            position: "absolute",
            textAlign: "center",
            cursor: "pointer",
            userSelect: "none",
            width: target + "px",
            height: target + "px",
            lineHeight: target + "px",
            backgroundColor: color,
            left: x + "px",
            top: y + "px",
            fontSize: target / 2.5 + "px",
            borderRadius: target + "px"
        };
    });
});
function onEvent(name, callback, options) {
    onMount(()=>addEventListener(name, callback, options));
    onDestroy(()=>removeEventListener(name, callback, options));
}
render(document.body, ()=>{
    const { target , interval , size , steps  } = injectTriangle();
    const { notify , focus , unnotify  } = injectNotification();
    onEvent("keyup", ({ key  })=>{
        const controls = {
            ArrowUp () {
                size(size() + steps.size);
                notify("Settings updated", "Size has been increased");
            },
            ArrowDown () {
                const next = size() - steps.size;
                if (next >= 5) {
                    size(next);
                    notify("Settings updated", "Size has been decreased");
                }
            },
            ArrowLeft () {
                target(target() - steps.target);
                notify("Settings updated", "Target has been decreased");
            },
            ArrowRight () {
                target(target() + steps.target);
                notify("Settings updated", "Target has been increased");
            },
            Delete () {
                if (focus()) unnotify(focus());
                focus(undefined);
            }
        };
        controls[key]?.();
    });
    Notifications();
    FlexBox(Stats, Control);
    TriangleDemo(target(), size(), interval());
});
const FlexBox = component((...children)=>{
    addElement("div", (attr)=>{
        attr.style = {
            display: "flex",
            flexDirection: "column",
            margin: "10px",
            gap: "10px",
            width: "max-content"
        };
        for (const child of children)child();
    });
});
const Stats = component(()=>{
    const { target , size , interval , dots  } = injectTriangle();
    addElement("pre", (attr)=>{
        attr.class = "window";
        addText("Stats:\n");
        addText(`  target: ${target()}\n`);
        addText(`  size: ${size()}\n`);
        addText(`  interval: ${interval()}\n`);
        addText(`  dots: ${dots()}\n`);
    });
});
const Control = component(()=>{
    const { steps  } = injectTriangle();
    addElement("pre", (attr)=>{
        attr.class = "window";
        addText("Control:\n");
        addText(`  ArrowUp: size + ${steps.size}\n`);
        addText(`  ArrowDown: size - ${steps.size}\n`);
        addText(`  ArrowRight: target + ${steps.target}\n`);
        addText(`  ArrowLeft: target - ${steps.target}\n`);
    });
});
