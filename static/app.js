// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

const Error = Symbol();
const Queue = new Set();
let nodeQueue;
let parentNode;
function scoped(callback) {
    const node = createNode();
    parentNode = node;
    try {
        return batch(()=>{
            let _cleanup = undefined;
            if (callback.length) {
                _cleanup = cleanNode.bind(undefined, node, true);
            }
            return callback(_cleanup);
        });
    } catch (error) {
        handleError(error);
    } finally{
        parentNode = node.parentNode;
    }
}
function createNode(initialValue, callback) {
    const _node = {
        value: initialValue,
        parentNode,
        children: undefined,
        injections: undefined,
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
        const node = createNode(initialValue, callback);
        if (nodeQueue) nodeQueue.add(node);
        else queueMicrotask(()=>updateNode(node, false));
    } else {
        queueMicrotask(()=>callback(initialValue));
    }
}
function lookup(node, id) {
    return node ? node.injections && id in node.injections ? node.injections[id] : lookup(node.parentNode, id) : undefined;
}
function createSource(initialValue) {
    return {
        value: initialValue,
        nodes: undefined,
        nodeSlots: undefined
    };
}
function getSourceValue(source) {
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
function setSourceValue(source, value) {
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
function sourceValue(source, value) {
    return arguments.length === 1 ? getSourceValue(source) : setSourceValue(source, value);
}
function signal(initialValue) {
    const source = createSource(initialValue);
    return sourceValue.bind(undefined, source);
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
    node.injections = undefined;
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
function injection(defaultValue) {
    return {
        id: Symbol(),
        defaultValue
    };
}
function inject(injection) {
    return lookup(parentNode, injection.id) || injection.defaultValue;
}
let parentAttrs;
let parentFgt;
let parentElt;
function attributesRef() {
    if (parentElt === undefined) return undefined;
    if (parentAttrs === undefined) parentAttrs = {};
    return parentAttrs;
}
function addElement(tagName, callback) {
    const elt = document.createElement(tagName);
    if (callback) modify(elt, callback);
    insert(elt);
}
function addText(value) {
    insert(document.createTextNode(String(value)));
}
function render(rootElt, callback) {
    return scoped((cleanup)=>{
        const previousElt = parentElt;
        parentElt = rootElt;
        callback();
        parentElt = previousElt;
        return cleanup;
    });
}
function view(callback) {
    if (parentElt === undefined) return callback();
    const anchor = parentElt.appendChild(new Text());
    effect((current)=>{
        parentFgt = [];
        callback();
        union(anchor, current, parentFgt);
        return parentFgt.length > 0 ? parentFgt : undefined;
    });
}
function component(callback) {
    return (...args)=>scoped(()=>callback(...args));
}
function insertBefore(elt, child, anchor) {
    elt.insertBefore(child, anchor);
}
function union(anchor, current, next) {
    const elt = anchor.parentNode;
    if (current === undefined) {
        return next.forEach((node)=>insertBefore(elt, node, anchor));
    }
    const currentLength = current.length;
    const nextLength = next.length;
    let currentNode, i, j;
    outerLoop: for(i = 0; i < nextLength; i++){
        currentNode = current[i];
        for(j = 0; j < currentLength; j++){
            if (current[j] === undefined) continue;
            else if (current[j].nodeType === 3 && next[i].nodeType === 3) {
                if (current[j].data !== next[i].data) current[j].data = next[i].data;
                next[i] = current[j];
            } else if (current[j].isEqualNode(next[i])) next[i] = current[j];
            if (next[i] === current[j]) {
                current[j] = undefined;
                if (i === j) continue outerLoop;
                break;
            }
        }
        insertBefore(elt, next[i], currentNode?.nextSibling || anchor);
    }
    while(current.length)current.pop()?.remove();
}
function qualifiedName(name) {
    return name.replace(/([A-Z])/g, (match)=>"-" + match[0]).toLowerCase();
}
function eventName(name) {
    return name.startsWith("on:") ? name.slice(3) : name.slice(2).toLowerCase();
}
function objectAttribute(elt, field, object) {
    for(const subField in object){
        const value = object[subField];
        if (typeof value === "function") {
            effect((subCurr)=>{
                const subNext = value();
                if (subNext !== subCurr) elt[field][subField] = subNext || null;
                return subNext;
            });
        } else {
            elt[field][subField] = value || null;
        }
    }
}
function dynamicAttribute(elt, field, value) {
    effect((current)=>{
        const next = value();
        if (next !== current) attribute(elt, field, next);
        return next;
    });
}
function attribute(elt, field, value) {
    if (typeof value === "function" && !field.startsWith("on")) {
        dynamicAttribute(elt, field, value);
    } else if (typeof value === "object") {
        objectAttribute(elt, field, value);
    } else if (field === "textContent") {
        if (elt.firstChild?.nodeType === 3) elt.firstChild.data = String(value);
        else elt.prepend(String(value));
    } else if (field in elt) {
        elt[field] = value;
    } else if (field.startsWith("on")) {
        elt.addEventListener(eventName(field), value);
    } else if (value != null) {
        elt.setAttributeNS(null, qualifiedName(field), String(value));
    } else {
        elt.removeAttributeNS(null, qualifiedName(field));
    }
}
function insert(node) {
    if (parentElt === undefined) parentFgt?.push(node);
    else parentElt?.appendChild(node);
}
function modify(elt, callback) {
    const previousElt = parentElt;
    const previousAttrs = parentAttrs;
    parentElt = elt;
    parentAttrs = callback.length ? {} : undefined;
    callback(parentAttrs);
    if (parentAttrs) {
        for(const field in parentAttrs){
            attribute(elt, field, parentAttrs[field]);
        }
    }
    parentElt = previousElt;
    parentAttrs = previousAttrs;
}
const injectNotification = ()=>inject(NotificationInjection);
const NotificationInjection = injection((()=>{
    const notifications = signal([]);
    return {
        notifications,
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
        focus: signal()
    };
})());
const Notifications = component(()=>{
    const { notifications , unnotify , notify  } = injectNotification();
    const errorNotify = (err)=>{
        if (typeof err === "object") err = err?.message || JSON.stringify(err);
        notify("Error", String(err));
    };
    onMount(()=>addEventListener("error", errorNotify));
    onDestroy(()=>removeEventListener("error", errorNotify));
    addElement("div", (attr)=>{
        attr.class = "notifications";
        view(()=>{
            if (notifications().length > 0) {
                addElement("div", (attr)=>{
                    attr.class = "notification";
                    disappearOnMouseDown(()=>notifications([]), 500);
                    addElement("b", ()=>addText("delete all"));
                });
            }
        });
        view(()=>{
            for (const item of [
                ...notifications()
            ].reverse()){
                addElement("div", (attr)=>{
                    attr.class = "notification";
                    disappearOnMouseDown(()=>unnotify(item), 500);
                    addElement("b", ()=>addText(item.title));
                    addElement("div", ()=>addText(item.message));
                });
            }
        });
    });
});
function disappearOnMouseDown(callback, timeout) {
    const atrs = attributesRef();
    let deleteTimeId;
    atrs.onMouseUp = (ev)=>{
        ev.currentTarget.removeAttribute("disappear");
        clearTimeout(deleteTimeId);
    };
    atrs.onMouseDown = (ev)=>{
        if (ev.button !== 0) return;
        ev.currentTarget.setAttribute("disappear", "");
        ev.currentTarget.style.setProperty("--timeout", timeout + "ms");
        deleteTimeId = setTimeout(callback, timeout);
    };
}
const TriangleInjection = injection((()=>{
    const elapsed = signal(0);
    const count = signal(0);
    return {
        elapsed,
        count,
        dots: signal(0),
        target: signal(1000),
        interval: signal(1000),
        size: signal(25),
        scale () {
            const e = elapsed() / 1000 % 10;
            return 1 + (e > 5 ? 10 - e : e) / 10;
        },
        countText () {
            return count().toString();
        }
    };
})());
const injectTriangle = ()=>inject(TriangleInjection);
const TriangleDemo = component((target, size, interval)=>{
    const { elapsed , count , scale , dots  } = injectTriangle();
    let id;
    onMount(()=>{
        console.log("mount: TriangleDemo");
        id = setInterval(()=>count(count() % 10 + 1), interval);
        const start = Date.now();
        const frame = ()=>{
            elapsed(Date.now() - start);
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    });
    onDestroy(()=>{
        console.log("destroy:TriangleDemo");
        clearInterval(id);
    });
    addElement("div", (attr)=>{
        attr.class = "triangle-demo";
        attr.style = ()=>`
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
    const { countText , dots  } = injectTriangle();
    const hover = signal(false);
    const mouseOut = ()=>hover(false);
    const mouseOver = ()=>hover(true);
    onMount(()=>{
        dots(dots() + 1);
    });
    onDestroy(()=>{
        dots(dots() - 1);
    });
    addElement("div", (attr)=>{
        attr.class = "dot";
        attr.onMouseOver = mouseOver;
        attr.onMouseOut = mouseOut;
        attr.textContent = ()=>hover() ? "*" + countText() + "*" : countText();
        attr.style = {
            width: target + "px",
            height: target + "px",
            lineHeight: target + "px",
            backgroundColor: ()=>hover() === true ? "cornflowerblue" : "thistle",
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
const FlexBoxColumn = component((...children)=>{
    addElement("div", (attr)=>{
        attr.class = "flex-box-col";
        view(()=>{
            for (const child of children)child();
        });
    });
});
const Info = component((title, data)=>{
    addElement("pre", (attr)=>{
        attr.class = "info";
        addElement("b", ()=>addText(title + ":\n"));
        view(()=>{
            const current = data();
            for(const field in current){
                addText(`  ${field}: ${current[field]}\n`);
            }
        });
    });
});
const App = component(()=>{
    const { target , interval , size  } = injectTriangle();
    view(()=>{
        Notifications();
        FlexBoxColumn(Stats, Control);
        TriangleDemo(target(), size(), interval());
    });
});
const Stats = component(()=>{
    const { target , size , interval , dots  } = injectTriangle();
    Info("Stats", ()=>({
            target: target(),
            size: size(),
            interval: interval(),
            dots: dots()
        }));
});
const Control = component(()=>{
    const { target , size  } = injectTriangle();
    const { notify , focus , unnotify  } = injectNotification();
    onEvent("keyup", ({ key  })=>{
        const controls = {
            ArrowUp () {
                size(size() + 5);
                notify("Settings updated", "Size has been increased");
            },
            ArrowDown () {
                const next = size() - 5;
                if (next >= 5) {
                    size(next);
                    notify("Settings updated", "Size has been decreased");
                }
            },
            ArrowLeft () {
                target(target() - 50);
                notify("Settings updated", "Target has been decreased");
            },
            ArrowRight () {
                target(target() + 50);
                notify("Settings updated", "Target has been increased");
            },
            Delete () {
                if (focus()) unnotify(focus());
                focus(undefined);
            }
        };
        controls[key]?.();
    });
    Info("Control", ()=>({
            ArrowUp: "size + 5",
            ArrowDown: "size - 5",
            ArrowRight: "size + 50",
            ArrowLeft: "size - 50"
        }));
});
render(document.body, ()=>{
    App();
});
