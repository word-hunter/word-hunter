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
    ${unknownSelector} {
        --wh-text-color-0: ${textColor0};
        --wh-bg-color-0: ${bgColor0};
    }
    ${contextSelector} {
        --wh-text-color-1: ${textColor1};
        --wh-bg-color-1: ${bgColor1};
    }
    @media (prefers-color-scheme: dark) {
        ${unknownSelector} {
            --wh-bg-color-0: ${generateDarkModeColor(bgColor0)};
        }
        ${contextSelector} {
            --wh-bg-color-1: ${generateDarkModeColor(bgColor1)};
        }
    }
  `

  let style = `
    ${cssVars}
  `

  switch (markStyle) {
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
    case 'dashed':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: dashed;
          text-decoration-color: var(--wh-bg-color-0);
        }
        ${contextSelector} {
          text-decoration-color: var(--wh-bg-color-1);
        }
      `
      break
    case 'dotted':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: dotted;
          text-decoration-color: var(--wh-bg-color-0);;
        }
        ${contextSelector} {
          text-decoration-color: var(--wh-bg-color-1);;
        }
      `
      break
    case 'underline':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: solid;
          text-decoration-color: var(--wh-bg-color-0);
        }
        ${contextSelector} {
          text-decoration-color: var(--wh-bg-color-1);
        }
      `
      break
    case 'double-underline':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: double;
          text-decoration-color: var(--wh-bg-color-0);
        }
        ${contextSelector} {
          text-decoration-color: var(--wh-bg-color-1);
        }
      `
      break
    case 'wavy':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: wavy;
          text-decoration-color: var(--wh-bg-color-0);
        }
        ${contextSelector} {
          text-decoration-color: var(--wh-bg-color-1);
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

function generateDarkModeColor(originalColor: string) {
  let r = parseInt(originalColor.slice(1, 3), 16)
  let g = parseInt(originalColor.slice(3, 5), 16)
  let b = parseInt(originalColor.slice(5, 7), 16)

  let darkR = Math.floor(r * 0.7)
  let darkG = Math.floor(g * 0.7)
  let darkB = Math.floor(b * 0.7)

  let darkColor = `#${darkR.toString(16)}${darkG.toString(16)}${darkB.toString(16)}`

  return darkColor
}
