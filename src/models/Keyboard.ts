
import { remote } from 'electron'

//
export enum Keys {
  backspace = 8,
  enter = 13,
  shift = 16,
  control = 17,
  alt = 18,
  space = 32,
  arrowLeft = 37,
  arrowUp = 38,
  arrowRight = 39,
  arrowDown = 40,
  delete = 46,
  a = 65,
  b = 66,
  c = 67,
  d = 68,
  e = 69,
  f = 70,
  g = 71,
  h = 72,
  i = 73,
  j = 74,
  k = 75,
  l = 76,
  m = 77,
  n = 78,
  o = 79,
  p = 80,
  q = 81,
  r = 82,
  s = 83,
  t = 84,
  u = 85,
  v = 86,
  w = 87,
  x = 88,
  y = 89,
  z = 90,
  f5 = 116,
}

//
export class Keyboard {
  isShiftPressed: boolean = false
  isControlPressed: boolean = false
  isAltPressed: boolean = false
  browserWindow: any = remote.getCurrentWindow()

  //
  constructor () {
    //
    window.addEventListener('keydown', (e) => {
      switch (e.which) {
        case Keys.shift:
          this.isShiftPressed = true
          break
        case Keys.control:
          this.isControlPressed = true
          break
        case Keys.alt:
          this.isAltPressed = true
          break
      }
    }, true)
    
    //
    window.addEventListener('keyup', (e) => {
      switch (e.which) {
        case Keys.shift:
          this.isShiftPressed = false
          break
        case Keys.control:
          this.isControlPressed = false
          break
        case Keys.alt:
          this.isAltPressed = false
          break
        case Keys.j:
          if (this.isControlPressed && this.isShiftPressed) {
            this.browserWindow.openDevTools()
          }
          break
        case Keys.f5:
          this.browserWindow.reload()
          break
      }
    }, true)
  }
}