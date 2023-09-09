import { settings, MarkStyles } from './settings'
import { invertHexColor } from './utils'
import { classes } from '../constant'

export function genMarkStyle() {
  const unknownSelector = `.${classes.unknown}, .${classes.zen_mode} .${classes.unknown}`
  const contextSelector = `&[have_context]`
  const markStyle = settings().markStyle ?? MarkStyles[0]

  let style = `
      --wh-mark-text-color-0: ${invertHexColor(settings()['colors'][0])};
      --wh-mark-text-color-1: ${invertHexColor(settings()['colors'][1])};
      --wh-mark-color-0: ${settings()['colors'][0]};
      --wh-mark-color-1: ${settings()['colors'][1]};
  `
  switch (markStyle) {
    case 'text':
      style += `
        ${unknownSelector} {
          color: var(--wh-mark-color-0);
          ${contextSelector} {
            color: var(--wh-mark-color-1));
          }
        }
      `
      break
    case 'background':
      style += `
        ${unknownSelector} {
          color: var(--wh-mark-text-color-0);
          background-color: var(--wh-mark-color-0);
          border-radius: 0.3em;
          ${contextSelector} {
            color: var(--wh-mark-text-color-1)));
            background-color: var(--wh-mark-color-1);
          }
        }

      `
      break
    case 'outline':
      style += `
        ${unknownSelector} {
          outline: inset var(--wh-mark-color-0);
          border-radius: 0.3em;
          ${contextSelector} {
            outline: inset var(--wh-mark-color-1);
          }
        }
      `
      break
    case 'dashed':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: dashed;
          text-decoration-color: var(--wh-mark-color-0);
          ${contextSelector} {
             text-decoration-color: var(--wh-mark-color-1);
          }
        }
      `
      break
    case 'dotted':
      style += `
         ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: dotted;
          text-decoration-color: var(--wh-mark-color-0);
          ${contextSelector} {
             text-decoration-color: var(--wh-mark-color-1);
          }
        }
      `
      break
    case 'underline':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: solid;
          text-decoration-color: var(--wh-mark-color-0);
          ${contextSelector} {
             text-decoration-color: var(--wh-mark-color-1);
          }
        }
      `
      break
    case 'double-underline':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: double;
          text-decoration-color: var(--wh-mark-color-0);
          ${contextSelector} {
             text-decoration-color: var(--wh-mark-color-1);
          }
        }
      `
      break
    case 'wavy':
      style += `
        ${unknownSelector} {
          text-decoration-line: underline;
          text-decoration-style: wavy;
          text-decoration-color: var(--wh-mark-color-0);
          ${contextSelector} {
             text-decoration-color: var(--wh-mark-color-1);
          }
        }
      `
      break
    case 'emphasis-dot':
      style += `
        ${unknownSelector} {
         text-emphasis: dot;
         text-emphasis-position: under right;
         text-emphasis-color: var(--wh-mark-color-0);
          ${contextSelector} {
            text-emphasis-color: var(--wh-mark-color-1));
          }
        }
      `
      break
    case 'emphasis-circle':
      style += `
        ${unknownSelector} {
         text-emphasis: circle;
         text-emphasis-position: under right;
         text-emphasis-color: var(--wh-mark-color-0);
          ${contextSelector} {
            text-emphasis-color: var(--wh-mark-color-1));
          }
        }
      `
      break
    case 'emphasis-open-circle':
      style += `
        ${unknownSelector} {
         text-emphasis: open circle;
         text-emphasis-position: under right;
         text-emphasis-color: var(--wh-mark-color-0);
          ${contextSelector} {
            text-emphasis-color: var(--wh-mark-color-1));
          }
        }
      `
      break
    case 'emphasis-triangle':
      style += `
        ${unknownSelector} {
         text-emphasis: triangle;
         text-emphasis-position: under right;
         text-emphasis-color: var(--wh-mark-color-0);
          ${contextSelector} {
            text-emphasis-color: var(--wh-mark-color-1));
          }
        }
      `
      break
    case 'shape':
      style += `
        ${unknownSelector} {
          position:relative;
          &::before {
            content: " ";
            display: block;
            height: 1em;
            width: 100%;
            margin-left: -3px;
            margin-right: -3px;
            position: absolute;
            background: var(--wh-mark-color-0);
            transform: rotate(2deg);
            top: 2px;
            left: -1px;
            border-radius: 20% 25% 20% 24%;
            padding: 0.6em 0.18em 0.18em 0.6em;
            opacity: 0.3;
          }
          ${contextSelector} {
            &::before {
              background: var(--wh-mark-color-1);
            }
          }
        }
      `
      break
    case 'slanting':
      style += `
        ${unknownSelector} {
          position:relative;
          &::before {
            position: absolute;
            z-index: -1;
            content: "";
            width: calc(100% + 4px);
            height: 60%;
            left: -2px;
            bottom: 0;
            transform: rotate(-2deg);
            background: linear-gradient(135deg, var(--wh-mark-color-0) 0%, rgba(0,0,0,0) 100%);
          }
          ${contextSelector} {
            &::before {
              background: linear-gradient(135deg, var(--wh-mark-color-1) 0%, rgba(0,0,0,0) 100%);
            }
          }
        }
      `
      break
    case 'pen':
      style += `
        ${unknownSelector} {
          position:relative;
          font-family: Libre Franklin;
          &::before{
            content:"";
            z-index:-1;
            left:-0.5em;
            top:-0.1em;
            border-width:2px;
            border-style:solid;
            border-color:var(--wh-mark-color-0);
            position:absolute;
            border-right-color:transparent;
            width:100%;
            height:1em;
            transform:rotate(2deg);
            opacity:0.7;
            border-radius:50%;
            padding:0.1em 0.25em;
          }
          &:after{
            content:"";
            z-index:-1;
            left:-0.5em;
            top:0.1em;
            padding:0.1em 0.25em;
            border-width:2px;
            border-style:solid;
            border-color:var(--wh-mark-color-0);
            border-left-color:transparent;
            border-top-color:transparent;
            position:absolute;
            width:100%;
            height:1em;
            transform:rotate(-1deg);
            opacity:0.7;
            border-radius:50%;
          }
          ${contextSelector} {
            &::before {
              border-color: var(--wh-mark-color-1);
            }
            &::after {
              border-color: var(--wh-mark-color-1);
            }
          }
        }
      `
      break
  }
  return style
}
