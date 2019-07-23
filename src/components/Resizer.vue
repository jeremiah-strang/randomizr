<template>
  <div class="resizer" ref="resizer" :style="style">
    <button @click="() => $emit('swap')" class="btn-plain swap">
      <FontAwesome icon="exchange-alt" />
    </button>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { ImageViewProps } from '@/models/ImageViewProps'

const RESIZER_WIDTH = 10

@Component
export default class Resizer extends Vue {
  @Prop() private index!: number
  @Prop() private imageViews!: ImageViewProps[]
  @Prop() private resizeHorizontally?: boolean

  //
  get style () {
    let left = -1 * RESIZER_WIDTH / 2
    for (let i = 0; i <= this.index; i++) {
      if (this.imageViews[i]) left += this.imageViews[i].width
    }
    return `width: ${RESIZER_WIDTH}px; left: ${left}px;`
  }
  
  //
  mounted () {
    const resizer = this.$refs.resizer as HTMLDivElement

    this.$nextTick(() => {
      let isMouseOver = false
      resizer.onmouseover = () => isMouseOver = true
      resizer.onmouseout = () => isMouseOver = false

      resizer.onmousedown = (e?: any) => {
        e = e || window.event
        let isDragging = true
        let x0 = e.clientX
        resizer.classList.add('resizing')

        document.onmousemove = (e?: any) => {
          e = e || window.event
          if (isDragging) {
            const dx = e.clientX - x0
            x0 = e.clientX
            const imageViewA = this.imageViews[this.index]
            const imageViewB = this.imageViews[this.index + 1]
            if (imageViewA) imageViewA.width += dx
            if (imageViewB) imageViewB.width -= dx
          }
          return false
        }

        document.onmouseup = () => {
          isDragging = false
          document.onmousemove = null
          document.onmouseup = null
          resizer.classList.remove('resizing')
          return false
        }
        return false
      }
    })
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  @import '../scss/_shared';

  .resizer {
    @extend .pnl;
    background-color: transparent;
    cursor: w-resize;
    height: 100%;
    overflow: visible;
    position: absolute;
    top: 0;
    width: 7px;
    z-index: 2;

    button.swap {
      color: #fff;
    }

    &:hover,
    &.resizing {
      background-color: rgba($gray10, 0.5);
    }

    button.swap {
      background-color: rgba($dark1, 0.3);
      left: -6px;
      padding: $pad-xxs;
      position: absolute;
      top: $pad-sm-top;
      width: 24px;

      &:hover {
        background-color: rgba($gray10, 1);
        color: $font-dark;
      }
    }
  }
</style>
