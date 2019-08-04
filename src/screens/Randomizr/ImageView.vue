<template>
  <div :style="style" ref="imgView" class="image-view">
    <div class="image-view-inner">
      <img v-if="isImg" :src="src" ref="img" />
      
      <video v-else-if="isVideo" ref="video">
        <source :src="src">
      </video>

      <div v-if="isVideo" class="video-progress">
        <div class="video-progress-complete" :style="`width: ${percentComplete}%`"></div>
      </div>

      <div ref="imgControls" :style="imageControlsStyle" class="image-controls-wrap">
        <div class="image-controls">
          <div :class="`image-controls-inner ${isNarrow ? 'narrow': ''}`">
            <button @click="$emit('previous')" class="previous">
              <FontAwesome icon="arrow-left" />
            </button>

            <button @click="deleteFile"
                    :title="`Delete file ${src}`"
                    class="btn-danger">
              <FontAwesome icon="trash" />
            </button>

            <input v-model="filename" @focus="$event.target.select()" class="input-dark" type="text" readonly>

            <!-- <button @click="alignTop"
                    title="Align image to the top of the screen (SHIFT + ↑)">
              <FontAwesome icon="long-arrow-alt-up" />
            </button>

            <button @click="alignBottom"
                    title="Align image to the bottom of the screen (SHIFT + ↓)">
              <FontAwesome icon="long-arrow-alt-down" />
            </button>

            <button @click="rotateLeft"
                    title="Rotate image to the left">
              <FontAwesome icon="undo" />
            </button> -->

            <button @click="showInFolder"
                    title="Show file in folder">
              <FontAwesome icon="folder-open" />
            </button>

            <button @click="selectFile"
                    title="Select a file">
              <FontAwesome icon="folder-plus" />
            </button>
            
            <button @click="rotateRight"
                    title="Rotate image to the right">
              <FontAwesome icon="undo" style="transform: scaleX(-1);" />
            </button>

            <button @click="closeView"
                    title="Remove this image view">
              <FontAwesome icon="minus" />
            </button>

            <button @click="$emit('next')" class="next"><FontAwesome icon="arrow-right" />
            </button>
          </div>
        </div>

        <div class="zoom-wrap">
          <button @click="zoomIn" class="zoom-in">
            <FontAwesome icon="search-plus"/>
          </button>
          <div :title="'Zoomed ' + Math.round(scale * 100) + '%'" class="zoom-label">{{ Math.round(scale * 100) }}</div>
          <button @click="zoomOut" class="zoom-out">
            <FontAwesome icon="search-minus"/>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import fs from 'fs'
import path from 'path'
import $ from 'jquery'
import { shell, remote } from 'electron'
import { Component, Prop, Watch, Vue } from 'vue-property-decorator'
import {
  IMAGE_EXTENSIONS_SET,
  VIDEO_EXTENSIONS_SET,
  CONTROL_FADE_DELAY,
} from '@/constants'
import { ImageViewProps } from '@/models/ImageViewProps'
import { getExtension } from '@/models/fileUtils'
import { Keyboard, Keys } from '@/models/Keyboard'

const { dialog } = remote

@Component
export default class ImageView extends Vue {
  @Prop() private keyboard!: Keyboard
  @Prop() private index!: number
  @Prop() private imageViews!: ImageViewProps[]
  @Prop() private src!: string
  @Prop() private width?: number | null
  @Prop() private scale?: number | null
  @Prop() private rotate?: number | null
  @Prop() private left?: number | null
  @Prop() private top?: number | null

  private percentComplete: number = 0

  //
  @Watch('src', {immediate: true })
  private onSrcChanged () {
    this.percentComplete = 0
    this.$nextTick(() => {
      this.initImageDragAndScroll()
      if (this.isVideo && this.$refs.video) {
        const video = this.$refs.video as any
        video.src = this.src
        video.volume = 0
        video.play()
        
        $(this.$refs.video).on('timeupdate', () => {
          this.percentComplete = 100 * video.currentTime / video.duration
          if (video.currentTime >= video.duration) {
            video.play()
          }
        })
      }
    })
  }

  //
  get style () {
    if (this.width !== undefined && this.width !== null && !isNaN(this.width)) {
      let left = 0
      for (let i = 0; i < this.index; i++) {
        left += this.imageViews[i].width
      }
      return `width: ${this.width}px; left: ${left}px;`
    }
    return ''
  }

  //
  get isNarrow () {
    return (this as any).width < 376
  }

  //
  get imageControlsStyle () {
    return `width: ${this.width}px`
  }

  //
  get extension () {
    return getExtension(this.src)
  }

  //
  get isImg () {
    return IMAGE_EXTENSIONS_SET.has(getExtension(this.src))
  }

  //
  get isVideo () {
    return VIDEO_EXTENSIONS_SET.has(getExtension(this.src))
  }

  //
  get filename () {
    return this.src ? path.basename(this.src) : ''
  }

  //
  private onClickKeep (e) {
    e.preventDefault()
    this.$emit('checked')
  }

  //
  private showInFolder () {
    if (this.src) shell.showItemInFolder(this.src)
  }

  //
  private deleteFile () {
    if (this.src) {
      this.$emit('delete', this.src)
    }
  }

  //
  private closeView () {
    if (this.src) {
      this.$emit('remove', this.index)
    }
  }

  //
  private selectFile () {
    const files = dialog.showOpenDialog({
      properties: ['openFile'],
      message: 'Select an image',
      defaultPath: path.dirname(this.src),
      filters: [
        {
          name: 'Image',
          extensions: [
            ...Array.from(IMAGE_EXTENSIONS_SET),
            ...Array.from(VIDEO_EXTENSIONS_SET)
          ].map(ext => ext.slice(1, ext.length)),
        },
      ]
    })

    console.log(files)
    if (files && files.length > 0) this.$emit('src', files[0])
  }

  //
  private rotateLeft () {
    const imgView: any = this.$refs.imgView as any
    let img: any = null
    if (this.isImg) img = this.$refs.img
    else if (this.isVideo) img = this.$refs.video
    
    if (img && imgView) {
      let scale = this.getScale(img)
      let rotate = this.getRotate(img) - 90

      let transformStr = `scale(${scale})`
      if (rotate !== 0) {
          transformStr += ` rotate(${rotate}deg)`
      }

      img.style.transform = transformStr
      if (rotate % 360 !== 0) img.style.transformOrigin = 'center'
      else img.style.transformOrigin = 'top left'
      this.$emit('rotate', rotate)
    }
  }

  //
  private rotateRight () {
    const imgView: any = this.$refs.imgView as any
    let img: any = null
    if (this.isImg) img = this.$refs.img
    else if (this.isVideo) img = this.$refs.video
    
    if (img && imgView) {
      let scale = this.getScale(img)
      let rotate = this.getRotate(img) + 90

      let transformStr = `scale(${scale})`
      if (rotate !== 0) {
          transformStr += ` rotate(${rotate}deg)`
      }

      img.style.transform = transformStr
      if (rotate % 360 !== 0) img.style.transformOrigin = 'center'
      else img.style.transformOrigin = 'top left'
      this.$emit('rotate', rotate)
    }
  }

  //
  private getScale (img: any) {
    if (img && img.style && img.style.transform) {
      const transform = img.style.transform
      let scale = 1
      if (transform && transform.includes('scale(')) {
        scale = parseFloat(transform.slice(transform.indexOf('scale(') + 6, transform.length))
      }
      return !isNaN(scale) ? scale : 1
    }

    return 1
  }

  //
  private getRotate (img: any) {
    if (img && img.style && img.style.transform) {
      const transform = img.style.transform
      let rotate = 0
      if (transform && transform.includes('rotate(')) {
        rotate = parseFloat(transform.slice(transform.indexOf('rotate(') + 7, transform.length))
      }

      return !isNaN(rotate) ? rotate : 0
    }

    return 0
  }

  //
  private alignTop () {
    const imgView: any = this.$refs.imgView as any
    let img: any = null
    if (this.isImg) img = this.$refs.img
    else if (this.isVideo) img = this.$refs.video

    if (img && img.style) {
      img.style.top = '0px'
      this.$emit('top', 0)
    }
  }

  //
  private alignRight () {
    const imgView: any = this.$refs.imgView as any
    let img: any = null
    if (this.isImg) img = this.$refs.img
    else if (this.isVideo) img = this.$refs.video

    if (img && img.style && imgView) {
      const scale = this.getScale(img)
      const imgWidth = img.clientWidth * scale
      const wrapWidth = imgView.clientWidth
      let left = (wrapWidth - imgWidth) / 2
      img.style.left = left  + 'px'
      this.$emit('left', left)
    }
  }

  //
  private alignBottom () {
    const imgView: any = this.$refs.imgView as any
    let img: any = null
    if (this.isImg) img = this.$refs.img
    else if (this.isVideo) img = this.$refs.video

    if (img && img.style && imgView) {
      const scale = this.getScale(img)
      const imgHeight = img.clientHeight * scale
      const wrapHeight = imgView.clientHeight
      let top = (wrapHeight - imgHeight) / 2
      img.style.top = top  + 'px'
      this.$emit('top', top)
    }
  }

  //
  private alignLeft () {
    const imgView: any = this.$refs.imgView as any
    let img: any = null
    if (this.isImg) img = this.$refs.img
    else if (this.isVideo) img = this.$refs.video

    if (img && img.style && imgView) {
      img.style.left = '0px'
      this.$emit('left', 0)
    }
  }

  //
  private zoom (delta) {
    const $wrap = $(this.$refs.imgView)
    let img: any = null
    if (this.isImg) img = this.$refs.img
    else if (this.isVideo) img = this.$refs.video

    if (img && $wrap.is(':hover')) {
      const transform = img.style.transform
      let scale = 1
      let rotate = 0
      if (transform && transform.includes('scale(')) {
        scale = parseFloat(transform.slice(transform.indexOf('scale(') + 6, transform.length))
      }

      if (transform && transform.includes('rotate(')) {
        rotate = parseFloat(transform.slice(transform.indexOf('rotate(') + 7, transform.length))
      }
      
      if (isNaN(scale)) scale = 1

      if (delta < 0) {
        scale += 0.05
      } else if (delta > 0) {
        scale -= 0.05
      }

      let transformStr = `scale(${scale})`
      if (rotate !== 0) {
        transformStr += ` rotate(${rotate}deg)`
      }

      img.style.transform = transformStr

      this.$emit('scale', scale)
      this.$emit('rotate', rotate)
    }
  }

  //
  private zoomIn () {
    this.zoom(-1)
  }

  //
  private zoomOut () {
    this.zoom(1)
  }

  //
  private initImageDragAndScroll () {
    const imgView: any = this.$refs.imgView as any
    let img: any = null
    if (this.isImg) img = this.$refs.img
    else if (this.isVideo) img = this.$refs.video

    if (img && imgView) {
      let scale = !isNaN(this.scale) && this.scale !== 0 ? this.scale : 1
      let rotate = !isNaN(this.rotate) ? this.rotate : 0
      let left = !isNaN(this.left) ? this.left : 0
      let top = !isNaN(this.top) ? this.top : 0

      img.style.transform = `scale(${scale}) rotate(${rotate}deg)`
      img.style.left = `${left}px`
      img.style.top = `${top}px`
      
      if (rotate % 360 !== 0) img.style.transformOrigin = 'center'
      else img.style.transformOrigin = 'top left'

      if (!left && this.isImg) {
        setTimeout(() => {
          if (img.clientWidth > this.width) {
            img.style.left = `${(this.width - img.clientWidth) / 2}px`
          }
        }, 100)
      }

      let isMouseOver = false
      imgView.onmouseover = () => isMouseOver = true
      imgView.onmouseout = () => isMouseOver = false

      img.onmousedown = (e?: any) => {
        e = e || window.event
        let isDragging = true
        let x0 = e.clientX
        let y0 = e.clientY
        img.style.cursor = 'move'

        document.onmousemove = (e?: any) => {
          e = e || window.event
          if (isDragging) {
            const dx = e.clientX - x0
            const dy = e.clientY - y0
            x0 = e.clientX
            y0 = e.clientY
            const left0 = parseInt(img.style.left as string)
            const top0 = parseInt(img.style.top as string)
            const newLeft = !isNaN(left0) ? left0 + dx : dx
            const newTop = !isNaN(top0) ? top0 + dy : dy
            img.style.left = newLeft + 'px'
            img.style.top = newTop + 'px'
            this.$emit('left', newLeft)
            this.$emit('top', newTop)
          }
          return false
        }

        document.onmouseup = () => {
          isDragging = false
          document.onmousemove = null
          document.onmouseup = null
          img.style.cursor = 'default'
          return false
        }
        return false
      }
    }
  }
  
  //
  private initControlsFade () {
    let timeout: any = null
    const $controls = $(this.$refs.imgControls)
    const $fade = $('.is-img-checked, .video-progress')
    const showControls = () => {
      $controls.fadeIn(200)
      $fade.fadeIn(200)
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (!$controls.is(':hover')) {
          $controls.fadeOut(750)
          $fade.fadeOut(750)
        } else {
          showControls()
        }
      }, CONTROL_FADE_DELAY)
    }

    $(document.body).mousemove(showControls)
    $(window).keypress(showControls)
    showControls()
  }

  //
  mounted () {
    const $wrap = $(this.$refs.imgView)

    window.addEventListener('wheel', (e) => this.zoom(e.deltaY))

    window.addEventListener('keyup', (e?: any) => {
      if ($wrap.is(':hover')) {
        e = e || window.event
        switch (e.which) {
          case Keys.arrowRight:
            if (this.keyboard.isShiftPressed) {
              this.alignRight()
            } else {
              this.$emit('next')
            }
            break
          case Keys.arrowLeft:
            if (this.keyboard.isShiftPressed) {
              this.alignLeft()
            } else {
              this.$emit('previous')
            }
            break
          case Keys.arrowUp:
            if (this.keyboard.isShiftPressed) {
              this.alignTop()
            }
            break
          case Keys.arrowDown:
            if (this.keyboard.isShiftPressed) {
              this.alignBottom()
            }
            break
          case Keys.delete:
            this.deleteFile()
            break
        }
      }
    })

    this.initImageDragAndScroll()
    this.initControlsFade()
  }
}
</script>

<style lang="scss" scoped>
@import '../../scss/_shared';

.image-view {
  position: absolute;
  left: 0;
  height: 100%;
  display: inline-block;
  overflow: hidden;
  user-select: none;
  
  .image-view-inner {
    @extend .pnl;
    height: 100%;
    width: 100%;

    img, video {
      height: 100%;
      left: auto;
      position: absolute;
      top: 0;
      transform: scale(1);
      transform-origin: top left;
      user-select: none;
    }

    .image-controls-wrap {
      border-radius: $border-radius-md;
      bottom: $pad-sm-bottom + 1px;
      box-sizing: border-box;
      left: 0;
      padding: $pad-sm;
      position: absolute;
      width: 100%;
      z-index: 2;

      .zoom-wrap {
        background-color: $dark2;
        border-radius: $border-radius-md;
        border: 1px solid $dark6;
        bottom: $pad-sm-bottom;
        box-sizing: border-box;
        color: $gray7;
        padding: 0;
        position: absolute;
        right: $pad-sm-right;
        width: 23.5px;

        .zoom-label {
          font-size: 11px;
          padding: $pad-xs-top 0;
          text-align: center;
        }

        button.zoom-in,
        button.zoom-out {
          border: none;
          margin: 0;
          width: 100%;
        }

        button.zoom-in {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }

        button.zoom-out {
          border-top-left-radius: 0;
          border-top-right-radius: 0;
        }
      }

      .image-controls {
        border-radius: $border-radius-md;
        color: #fff;
        position: relative;
        width: 100%;

        .image-controls-inner {
          margin: 0 auto;
          overflow-x: visible;
          position: relative;
          white-space: nowrap;
          width: 320px;

          input[type=text] {
            width: 110px;
          }

          &.narrow {
            width: 226px;
            
            input[type=text] {
              display: none;
            }
          }

          button {
            height: 100%;
            min-width: 23px;

            &.previous {
              margin-right: 18px;
            }

            &.next {
              margin-left: 18px;
            }
          }
        }
      }
    }

    .video-progress {
      bottom: 0;
      height: 3px;
      left: 0;
      position: absolute;
      width: 100%;
      z-index: 3;

      .video-progress-complete {
        background-color: $theme-blue;
        bottom: 0;
        display: block;
        height: 3px;
        left: 0;
        position: absolute;
      }
    }
  }
}
</style>
