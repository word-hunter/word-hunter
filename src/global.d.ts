declare module '*.less' {
  const classes: { [className: string]: string }
  export default classes
}

declare interface Window {
  __markAsAllKnown: () => void
  __setColorStyle: () => void
}
