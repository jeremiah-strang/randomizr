<template>
  <div :class="size || 'md'"
        :style="modalStyle"
        class="modal o-visible"
        ref="modal">
    <div class="modal-hdr">
      <div class="modal-title">
        <FontAwesome v-if="titleIconClass" :icon="titleIconClass" />
        <slot name="modal-title"></slot>
        {{ title || '' }}
      </div>
      <div class="modal-btns">
        <button @click="() => $emit('close')" class="modal-x">
          <FontAwesome icon="times" />
        </button>
      </div>
    </div>

    <div :style="bodyStyle" class="modal-body" :class="scrollable ? 'scroll' : ' o-visible'">
      <div :class="scrollable ? 'scroll-wrap' : 'pnl w100 o-visible'">
        <slot name="modal-body"></slot>
      </div>
    </div>

    <div class="modal-btn-wrap">
      <slot name="modal-footer" class="modal-btn-wrap"></slot>
    </div>

    <div class="is-busy" :class="size || 'md'" ref="modal" v-show="isBusy">
      <img src="@/assets/img/spin64.svg" />
    </div>
  </div>
</template>


<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'

@Component
export default class Modal extends Vue {
  @Prop() private title!: string
  @Prop() private titleIconClass: string
  @Prop() private size: string
  @Prop() private isBusy: boolean
  @Prop() private scrollable: boolean
  @Prop() private width: number
  @Prop() private height: number

  get modalStyle () {
    let style = ''
    if (this.width) style += `width: ${this.width}px;`
    return style
  }

  get bodyStyle () {
    let style = ''
    if (this.height) style += `height: ${this.height}px; min-height: ${this.height}px;`
    return style
  }
}
</script>

<style lang="scss" scoped>
@import '../scss/_shared';
</style>
