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

  let style = ` `

  switch (markStyle) {
    case 'text':
      style += `
        ${unknownSelector} {
          color: ${bgColor0};
        }
        ${contextSelector} {
          color: ${bgColor1};
        }
      `
      break
    case 'background':
      style += `
        ${unknownSelector} {
          color: ${textColor0};
          background-color: ${bgColor0};
          border-radius: 0.3em;

        }
        ${contextSelector} {
          color: ${textColor1};
          background-color: ${bgColor1};
        }
      `
      break
    case 'dashed':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: dashed;
          text-decoration-color: ${bgColor0};
        }
        ${contextSelector} {
          text-decoration-color: ${bgColor1};
        }
      `
      break
    case 'dotted':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: dotted;
          text-decoration-color: ${bgColor0};
        }
        ${contextSelector} {
          text-decoration-color: ${bgColor1};
        }
      `
      break
    case 'underline':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: solid;
          text-decoration-color: ${bgColor0};
        }
        ${contextSelector} {
          text-decoration-color: ${bgColor1};
        }
      `
      break
    case 'double-underline':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: double;
          text-decoration-color: ${bgColor0};
        }
        ${contextSelector} {
          text-decoration-color: ${bgColor1};
        }
      `
      break
    case 'wavy':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: wavy;
          text-decoration-color: ${bgColor0};
        }
        ${contextSelector} {
          text-decoration-color: ${bgColor1};
        }
      `
      break
    default:
      style += `
        ${unknownSelector} {
          color: ${textColor0};
          background-color: ${bgColor0};
          border-radius: 0.3em;

        }
        ${contextSelector} {
          color: ${textColor1};
          background-color: ${bgColor1};
        }
      `
      break
  }
  return style
}
