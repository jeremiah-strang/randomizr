<template>
  <div class="randomizr">
    <SettingsModal v-if="isSettingsModalOpen"
                        :settings="userSettings"
                        v-on:close="isSettingsModalOpen = false"
                        v-on:update="onUserSettingsUpdate" />

    <TagManager v-if="isTagManagerOpen"
                     v-on:close="isTagManagerOpen = false"
                     v-on:update="onUserSettingsUpdate"
                     :settings="userSettings" />

    <StateManager v-if="isStateManagerOpen"
                       v-on:close="isStateManagerOpen = false"
                       v-on:load="(state) => loadSavedState(state)"
                       :settings="userSettings" />

    <div ref="topRightControls" class="top-right-controls">
      <button @click="toggleFullscreen"
              title="Toggle full screen"
              class="fullscreen-btn">
        <FontAwesome :icon="fullScreenIcon" />
      </button>
      
      <button @click="onNextAll"
              title="Randomize all images (CTRL + R)">
        <FontAwesome icon="sync-alt" />
      </button>

      <button @click.stop="isSettingsMenuToggled = !isSettingsMenuToggled"
              :class="`btn btn-dd right ${isSettingsMenuToggled ? 'active' : ''}`">
        <FontAwesome icon="bars" />
        <ul>
          <li @click="isSettingsModalOpen = true"
              title="Open settings window">
            <FontAwesome icon="cog" />
            Settings
          </li>
          <!-- <li @click="isTagManagerOpen = true"
              title="Open tag manager">
            <FontAwesome icon="tag" />
            Tag manager
          </li> -->
          <li @click="isStateManagerOpen = true"
              title="Open state manager">
            <FontAwesome icon="bookmark" />
            State manager
          </li>
          <li @click="saveState"
              title="Save current state (CTRL + S)">
            <FontAwesome icon="save" />
            Save current state
          </li>
          <li @click="loadRandomSavedState"
              title="Load random state (CTRL + SHIFT + R)">
            <FontAwesome icon="arrow-alt-circle-down" />
            Load random state
          </li>
        </ul>
      </button>
    </div>

    <ImageView v-for="(item, index) in imageViews"
               :key="index"
               :src="item.file"
               :width="item.width"
               :scale="item.scale"
               :rotate="item.rotate"
               :left="item.left"
               :top="item.top"
               :keyboard="keyboard"
               v-on:previous="() => onPrevious(index)"
               v-on:next="() => onNext(index)"
               v-on:scale="(scale) => imageViews[index].scale = scale"
               v-on:rotate="(rotate) => imageViews[index].rotate = rotate"
               v-on:left="(left) => imageViews[index].left = left"
               v-on:top="(top) => imageViews[index].top = top"
               v-on:delete="(src) => onDeleteFile(index, src)" />

    <Resizer v-for="index in numImageViews - 1"
             v-on:swap="() => swap(index - 1, index)"
             :index="index - 1"
             :image-views="imageViews"
             :key="'resizer' + index" />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { remote } from 'electron'
import $ from 'jquery'
import fse from 'fs-extra'
import uuid from 'uuid/v4'

import {
  CONTROL_FADE_DELAY,
} from '@/constants'
import { Keyboard, Keys } from '@/models/Keyboard'
import { loadImagesAndVideos } from '@/models/fileUtils'
import {
  defaultUserSettings,
  loadUserSettings,
  UserSettings,
} from '@/models/UserSettings'
import { ImageViewProps } from '@/models/ImageViewProps'
import SettingsModal from './SettingsModal.vue'
import StateManager from './StateManager.vue'
import TagManager from './TagManager.vue'
import ImageView from './ImageView.vue'
import Resizer from '@/components/Resizer.vue'

import {
  RandomizrState,
  getRandomizrStates,
  getRandomizrState,
  createRandomizrState,
  updateRandomizrState,
  removeRandomizrState,
} from '@/models/RandomizrState'

const USER_DATA_DIR = remote.app.getPath('userData')

@Component({
  components: {
    SettingsModal,
    StateManager,
    TagManager,
    ImageView,
    Resizer,
  },
})
export default class Randomizr extends Vue {
  private keyboard: Keyboard = new Keyboard()

  private isSettingsModalOpen: boolean = false
  private isStateManagerOpen: boolean = false
  private isTagManagerOpen: boolean = false
  private isSettingsMenuToggled: boolean = false
  private imageViews: ImageViewProps[] = []

  private allFiles: string[] = []
  private files: string[] = []
  private filesSeen: Set<string> = new Set()
  private isFullScreen: boolean = false
  private viewportWidth: number = 1000
  private userSettings: UserSettings = defaultUserSettings()
  private numImageViews: number = 3

  private lastSavedStateIdLoaded: string = ''

  get fullScreenIcon () {
    return this.isFullScreen ? 'compress' : 'expand'
  }

  //
  private toggleFullscreen () {
    if (document.fullscreen) {
      document.exitFullscreen()
      this.isFullScreen = false
    } else {
      document.body.requestFullscreen()
      this.isFullScreen = true
    }
  }

  //
  private onPrevious (index) {
    if (!isNaN(index) && index < this.imageViews.length && this.imageViews[index]) {
      if (this.imageViews[index].previous) {
        this.imageViews.splice(index, 1, this.imageViews[index].previous as any)
      }
    }
  }

  //
  private onNext (index) {
    if (!isNaN(index) && index < this.imageViews.length) {
      const imageProps = this.imageViews[index]
      if (imageProps) {
        if (imageProps.next) {
          this.imageViews.splice(index, 1, imageProps.next as any)
        } else {
          const next = this.randomizeImageProps(imageProps.width)
          imageProps.next = next
          next.previous = imageProps
          this.imageViews.splice(index, 1, next as any)
        }
      }
    }
  }

  //
  private onNextAll () {
    for (let i = 0; i < this.imageViews.length; i++) {
      this.onNext(i)
    }
  }

  //
  private swap (indexA, indexB) {
    if (indexA >= 0 &&
        indexB >= 0 &&
        indexA !== indexB &&
        indexA < this.imageViews.length &&
        indexB < this.imageViews.length) {
      const propsA = this.imageViews[indexA]
      const propsB = this.imageViews[indexB]

      const srcA = propsA.file
      const widthA = propsA.width
      const scaleA = propsA.scale
      const rotateA = propsA.rotate
      const leftA = propsA.left
      const topA = propsA.top

      propsA.file = propsB.file
      propsA.width = propsB.width
      propsA.scale = propsB.scale
      propsA.rotate = propsB.rotate
      propsA.left = propsB.left
      propsA.top = propsB.top

      propsB.file = srcA
      propsB.width = widthA
      propsB.scale = scaleA
      propsB.rotate = rotateA
      propsB.left = leftA
      propsB.top = topA
    }
  }

  //
  private async onDeleteFile (index: number, file: string) {
    if (!isNaN(index) && index < this.imageViews.length) {
      const imageProps = this.imageViews[index]
      if (imageProps.file === file && confirm(`Delete ${imageProps.file}`)) {
        try {
          await fse.unlink(file)
          const previous = imageProps.previous
          const current = this.imageViews[index]
          const next = imageProps.next
          if (current) {
            if (previous) previous.next = next
            if (next) next.previous = previous

            if (next) this.imageViews.splice(index, 1, next)
            else this.imageViews.splice(index, 1, this.randomizeImageProps(current.width))
          }
        } catch (error) {}
      }
    }
  }

  //
  private randomizeImageProps (width?: number): ImageViewProps {
    const file = this.files[Math.floor(Math.random() * this.files.length)]
    this.filesSeen.add(file)
    this.files = this.files.filter(f => !this.filesSeen.has(f))
    if (this.files.length === 0) this.files = [...this.allFiles]
    return {
      scale: 1,
      left: 0,
      rotate: 0,
      top: 0,
      file,
      width: width || document.body.clientWidth / this.userSettings.numImageViews,
    }
  }
  
  //
  private initControlsFade () {
    let timeout: any = null
    const $controls = $(this.$refs.topRightControls)
    const $fade = $('.swap')
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
    showControls()
  }

  //
  private initKeyboardShortcuts () {
    window.addEventListener('keyup', (e?: any) => {
      e = e || window.event
      switch (e.which) {
        case Keys.r:
          if (this.keyboard.isControlPressed) {
            if (this.keyboard.isShiftPressed) this.loadRandomSavedState()
            else this.onNextAll()
          }
          break
        case Keys.s:
          if (this.keyboard.isControlPressed) this.saveState()
          break
      }
    })
  }

  //
  private updateWidth () {
    this.$nextTick(() => {
      const prevWidth = this.viewportWidth
      this.viewportWidth = document.body.clientWidth
      if (prevWidth > 0 && prevWidth !== this.viewportWidth) {
        let totalW = 0
        let i = 0
        for (let props of this.imageViews) {
          const w = this.viewportWidth * (props as any).width / prevWidth
          props.width = w
          totalW += w

          if (totalW < this.viewportWidth && i === this.imageViews.length - 1) {
            props.width += this.viewportWidth - totalW
          }

          i++
        }
      }
    })
  }

  //
  private async saveState () {
    const _id = uuid()
    const state: RandomizrState = {
      _id,
      imageViews: this.imageViews.map(imageView => {
        return {
          file: imageView.file,
          width: imageView.width,
          scale: !isNaN(imageView.scale) && imageView.scale !== 0 ? imageView.scale : 1,
          rotate: !isNaN(imageView.rotate) ? imageView.rotate : 0,
          left: !isNaN(imageView.left) ? imageView.left : 0,
          top: !isNaN(imageView.top) ? imageView.top : 0,
        }
      })
    }
    await createRandomizrState(state)
    this.lastSavedStateIdLoaded = _id
  }

  //
  private async loadRandomSavedState () {
    const states = await getRandomizrStates()
    if (states.length > 0) {
      this.loadSavedState(states[Math.floor(Math.random() * states.length)])
    }
  }

  //
  private async loadSavedState (state: RandomizrState) {
    if (state && state.imageViews) {
      let totalW = 0
      for (let imageView of state.imageViews) totalW += imageView.width

      let i = 0
      const imageViews = []
      this.numImageViews = state.imageViews.length
      for (let imageView of state.imageViews) {
        const w = state.imageViews[i].width
        imageView.file = state.imageViews[i].file
        imageView.width = totalW * (w / totalW)
        this.filesSeen.add(imageView.file)
        if (i < this.imageViews.length) {
          const current = this.imageViews[i]
          if (current.next) imageView.next = current.next
          current.next = imageView
          imageView.previous = current
          this.imageViews.splice(i, 1, imageView)
        } else {
          this.imageViews.push(imageView)
        }
        i++
      }
    }
    this.lastSavedStateIdLoaded = state._id || ''
  }

  //
  private onUserSettingsUpdate (settings: UserSettings) {
    this.userSettings = settings
    this.isSettingsModalOpen = false
    this.load()
  }

  //
  private async load () {
    this.userSettings = await loadUserSettings()
    this.numImageViews = this.userSettings.numImageViews
    this.files = this.allFiles = await loadImagesAndVideos(this.userSettings.imageDirnames)

    if (this.files.length === 0) {
      this.isSettingsModalOpen = true
    } else {
      const len0 = this.imageViews.length
      for (let i = 0; i < len0; i++) {
        const props = this.imageViews[i]
        props.width = this.viewportWidth / this.numImageViews
      }
      if (len0 < this.numImageViews) {
        for (let i = len0; i < this.numImageViews; i++) {
          this.imageViews.push(this.randomizeImageProps())
        }
      } else {
        while (this.imageViews.length > this.numImageViews) {
          this.imageViews.splice(this.imageViews.length - 1, 1)
        }
      }
    
      this.updateWidth()
    }
  }

  //
  created () {
  }

  //
  async mounted () {
    this.viewportWidth = document.body.clientWidth
    await this.load()

    window.addEventListener('resize', () => this.updateWidth())
    document.body.onfullscreenchange = () => this.updateWidth()

    this.updateWidth()
    this.initControlsFade()
    this.initKeyboardShortcuts()
  }
}
</script>

<style lang="scss" scoped>
@import '../../scss/_shared';

.randomizr {
  @extend .pnl;
  @extend .hw100;
  display: flex;
  flex-direction: 'row';

  .top-right-controls {
    position: absolute;
    right: $pad-sm-right;
    top: $pad-sm-top;
    z-index: 2;
  }
}
</style>
