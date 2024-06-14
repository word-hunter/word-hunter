import { settings, MarkStyles } from './settings'
import { invertHexColor } from './utils'

export function genMarkStyle() {
  const unknownSelector = `::highlight(wh-unknown)`
  const contextSelector = `::highlight(wh-context)`
  const markStyle = settings().markStyle ?? MarkStyles[0]
  const textColor0 = invertHexColor(settings()['colors'][0])
  const textColor1 = invertHexColor(settings()['colors'][1])
  const bgColor0 = settings()['colors'][0]
  const bgColor1 = settings()['colors'][1]

  const cssVars = `
    :root {
        --wh-text-color-0: ${textColor0};
        --wh-bg-color-0: ${bgColor0};
        --wh-text-color-1: ${textColor1};
        --wh-bg-color-1: ${bgColor1};
    }
    @media (prefers-color-scheme: dark) {
        :root {
            --wh-bg-color-0: ${generateDarkModeColor(bgColor0)};
            --wh-bg-color-1: ${generateDarkModeColor(bgColor1)};
        }
    }
  `

  let style = `
    ${cssVars}
  `

  switch (markStyle) {
    case 'none':
      return ''
    case 'text':
      style += `
        ${unknownSelector} {
          color: var(--wh-bg-color-0);
        }
        ${contextSelector} {
          color: var(--wh-bg-color-1);
        }
      `
      break
    case 'background':
      style += `
        ${unknownSelector} {
          color: var(--wh-text-color-0);
          background-color: var(--wh-bg-color-0);

        }
        ${contextSelector} {
          color: var(--wh-text-color-1);
          background-color: var(--wh-bg-color-1);
        }
      `
      break
    case 'background-underline':
      style += `
        ${unknownSelector} {
          color: var(--wh-text-color-0);
          background-color: var(--wh-bg-color-0);
          text-decoration: underline solid var(--wh-text-color-0) 0.1em;

        }
        ${contextSelector} {
          color: var(--wh-text-color-1);
          background-color: var(--wh-bg-color-1);
          text-decoration: underline solid var(--wh-text-color-1) 0.1em;
        }
      `
      break
    case 'dashed':
      style += `
        ${unknownSelector} {
          text-decoration: underline dashed var(--wh-bg-color-0);
        }
        ${contextSelector} {
          text-decoration: underline dashed var(--wh-bg-color-1);
        }
      `
      break
    case 'dotted':
      style += `
        ${unknownSelector} {
          text-decoration: underline dotted var(--wh-bg-color-0) 0.2em;
        }
        ${contextSelector} {
          text-decoration: underline dotted var(--wh-bg-color-1) 0.2em;
        }
      `
      break
    case 'underline':
      style += `
        ${unknownSelector} {
          text-decoration: underline solid var(--wh-bg-color-0) 0.15em;
        }
        ${contextSelector} {
          text-decoration: underline solid var(--wh-bg-color-1) 0.15em;
        }
      `
      break
    case 'double-underline':
      style += `
        ${unknownSelector} {
          text-decoration: underline double var(--wh-bg-color-0) 0.13em;
        }
        ${contextSelector} {
          text-decoration: underline double var(--wh-bg-color-1) 0.13em;
        }
      `
      break
    case 'wavy':
      style += `
        ${unknownSelector} {
          text-decoration: underline wavy var(--wh-bg-color-0);
        }
        ${contextSelector} {
          text-decoration: underline wavy var(--wh-bg-color-1);
        }
      `
      break
    default:
      style += `
      ${unknownSelector} {
          color: var(--wh-text-color-0);
          background-color: var(--wh-bg-color-0);

        }
        ${contextSelector} {
          color: var(--wh-text-color-1);
          background-color: var(--wh-bg-color-1);
        }
      `
      break
  }
  return style
}

function generateDarkModeColor(originalColor: string, brightnessFactor: number = 0.85): string {
  // Convert the original color to HSL format
  const originalHSL = hexToHSL(originalColor)

  // Convert HSL value back to RGB format
  const darkColor = `hsl(${Math.round(originalHSL.h)}, ${Math.round(originalHSL.s * 100)}%, ${Math.round(
    originalHSL.l * brightnessFactor * 100
  )}%)`

  return darkColor
}

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove the leading hash and parse the RGB values
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  // Calculate maximum and minimum values
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (min + max) / 2
  const diff = max - min

  if (diff !== 0) {
    s = l < 0.5 ? diff / (max + min) : diff / (2 - max - min)

    h = (r == max ? (g - b) / diff : g == max ? 2 + (b - r) / diff : 4 + (r - g) / diff) * 60
  }

  return {
    h,
    s,
    l
  }
}
