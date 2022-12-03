// https://github.com/solidjs/solid/tree/main/packages/solid-element#hot-module-replacement-new
export function walk(root: Node, call: (node: Node) => void) {
  call(root)
  if ((root as HTMLElement).shadowRoot) walk((root as HTMLElement).shadowRoot as ShadowRoot, call)
  let child = root.firstChild
  while (child) {
    child.nodeType === 1 && walk(child, call)
    child = child.nextSibling
  }
}
