<template>
  <div class="modal-wrap" ref="modal">
    <Modal :height="modalHeight"
           :is-busy="isBusy"
           @close="() => $emit('close')"
           title="Saved State Manager"
           width="970"
           title-icon-class="bookmark"
           scrollable="true">
      <div slot="modal-body" class="state-manager">
        <div class="preview-wrap">
          <div v-if="selectedState" class="preview-img-wrap">
            <div v-for="(item, index) in selectedState.imageViews" :key="index" class="preview-img">
              <img :src="item.file" v-if="isImage(item.file)">
             
              <video v-else-if="isVideo(item.file)" ref="video" autoplay loop muted>
                <source :src="item.file">
              </video>
              <button @click.stop="() => showInFolder(item.file)"
                      class="btn-light"
                      title="Show file in folder">
                <FontAwesome icon="folder" />
              </button>
            </div>
          </div>
          <h4 v-else class="text-center">No state selected</h4>

          <div class="pin-top-right">
            <button @click="uploadSavedStates"
                    title="Upload saved states">
              <FontAwesome icon="upload" />
            </button>

            <button @click="downloadSavedStates"
                    title="Download saved states">
              <FontAwesome icon="download" />
            </button>
          </div>

        </div>
        <div :style="tableWrapStyle" class="pnl w100 o-auto">
          <table>
            <thead>
              <tr>
                <th class="actions">&nbsp;</th>
                <th class="state-id">ID</th>
                <th class="state-created">Created</th>
                <!-- <th class="state-name">Name</th> -->
                <th class="state-file" v-for="index in maxNumImageViews" :key="index">File {{ index }}</th>
                <!-- <th class="scrollbar">&nbsp;</th> -->
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in states"
                  @click="() => selectState(index)"
                  :key="item._id"
                  :class="selectedState && selectedState._id === item._id ? 'selected' : ''">
                <td class="actions">
                  <button @click.stop="() => $emit('load', item)"
                          class="btn-light">
                    <FontAwesome icon="check" />
                  </button>
                  <button @click.stop="() => removeState(item._id)"
                          class="btn-danger">
                    <FontAwesome icon="trash" />
                  </button>
                </td>

                <td class="state-id" :title="item._id">
                  {{ item._id }}
                </td>

                <td class="state-created">
                  {{ item.createdStr }}
                </td>
                
                <td class="state-file" v-for="(item, index) in item.imageViews" :key="index">
                  {{ item.file }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- <p v-for="item in states" :key="item._id">{{ item._id }}</p> -->
      </div>
      <div slot="modal-footer">
        <button @click="onSave"
                v-show="isEdited"
                class="btn-primary">
          <i class="fa fa-save"></i> Save
        </button>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts">
import fse from 'fs-extra'
import moment from 'moment'
import path from 'path'
import { Component, Prop, Vue } from 'vue-property-decorator'
import { shell, remote } from 'electron'
import { Keyboard, Keys } from '@/models/Keyboard'

const { dialog } = remote

import { getExtension } from '@/models/fileUtils'
import {
  IMAGE_EXTENSIONS_SET,
  VIDEO_EXTENSIONS_SET,
} from '@/constants'
import {
  defaultUserSettings,
  UserSettings,
} from '@/models/UserSettings'
import {
  createRandomizrState,
  getRandomizrStates,
  RandomizrState,
  removeRandomizrState,
  updateRandomizrState,
} from '@/models/RandomizrState'
import Randomizr from './Randomizr.vue';

@Component
export default class StateManager extends Vue {
  @Prop() private settings!: UserSettings
  private isBusy: boolean = false
  private isEdited: boolean = false
  private states: RandomizrState[] = []
  private newTag: string = ''
  private maxNumImageViews: number = 3
  private selectedIndex: number = -1

  get modalHeight (): number {
    return Math.max(document.body.clientHeight - 200, 500)
  }

  get tableWrapStyle (): string {
    return `height: ${this.modalHeight - 240}px`
  }

  get selectedState (): RandomizrState | null {
    return this.selectedIndex > -1 && this.states.length > this.selectedIndex ? this.states[this.selectedIndex] : null
  }
  
  //
  private selectState (index: number) {
    this.selectedIndex = index
  }
  
  //
  private async removeState (_id) {
    await removeRandomizrState(_id)
    this.loadStates()
  }

  //
  private async downloadSavedStates () {
    const prepped = this.states.map((state: RandomizrState) => {
      const { _id, created, name, imageViews } = state

      return {
        _id,
        created: created ? new Date(created) : new Date(),
        name: name || '',
        imageViews: Array.isArray(imageViews) ? [...imageViews] : [],
      }
    })

    const settingsDirs = this.settings && this.settings.imageDirnames ? this.settings.imageDirnames : []
    const defaultPath = settingsDirs.length > 0 && fse.existsSync(settingsDirs[0]) ? path.join(settingsDirs[0], 'randomizr-saved-states.json') : null

    const savePath = dialog.showSaveDialog({
      defaultPath,
    })
    if (savePath) {
      if (!fse.existsSync(savePath) || confirm(`A file already exists at ${savePath}. Overwrite?`)) {
        const data = JSON.stringify(prepped, null, '  ')
        try {
          await fse.writeFile(savePath, data)
        } catch (error) {
          console.error(error)
          alert('Error saving file')
        }
      }
    }
  }

  //
  private async uploadSavedStates () {
    const settingsDirs = this.settings && this.settings.imageDirnames ? this.settings.imageDirnames : []
    const defaultPath = settingsDirs.length > 0 && fse.existsSync(settingsDirs[0]) ? settingsDirs[0] : null

    const files = dialog.showOpenDialog({
      properties: ['openFile'],
      message: 'Select an file',
      defaultPath,
      filters: [
        {
          name: 'JSON',
          extensions: [
            'json',
          ],
        },
      ]
    })

    if (files && files.length > 0) {
      this.isBusy = true
      try {
        const states = await fse.readJson(files[0])

        if (Array.isArray(states)) {
          const promises = []
          for (let state of states) {
            state.created = state.created ? new Date(state.created) : new Date()
            promises.push(createRandomizrState(state).catch(() => {}))
          }
          await Promise.all(promises)
        }
      } catch (error) {
        console.error(error)
      }
      await this.loadStates()
      this.isBusy = false
    }
  }

  //
  private isImage = (file: string) => IMAGE_EXTENSIONS_SET.has(getExtension(file))

  //
  private isVideo = (file: string) => VIDEO_EXTENSIONS_SET.has(getExtension(file))

  //
  private getExtension = (file: string) => getExtension(file)

  //
  private async loadStates () {
    this.isBusy = true
    try {
      let states = await getRandomizrStates()
      states = states
        .map(state => {
          this.maxNumImageViews = Math.max(this.maxNumImageViews, state.imageViews.length)

          const created: Date = state.created ? new Date(state.created) : new Date()
          return {
            ...state,
            name: state.name || '',
            isEdited: false,
            created,
            createdStr: moment(created).format('M/D/YYYY h:mm:ss a'),
          }
        })
        .sort((a, b) => a.created > b.created ? -1 : 1)
      this.states = states
    } catch (error) {
      console.error(error)
    }
    this.isBusy = false
  }

  //
  private async onSave () {
    if (this.isEdited) {
      this.isBusy = true
      try {
        const promises = this.states
          .filter((state: any) => state.isEdited)
          .map(state => {
            return updateRandomizrState({
              _id: state._id,
              name: state.name || '',
              imageViews: state.imageViews || [],
            }).catch(() => {})
          })
        await Promise.all(promises)
        this.isEdited = false
      } catch (error) {
        console.error(error)
      }
      this.loadStates()
      this.isBusy = false
    }
  }

  //
  private showInFolder (file: string) {
    if (file) shell.showItemInFolder(file)
  }

  //
  mounted () {
    this.loadStates()
    window.addEventListener('keydown', (e?: any) => {
      e = e || window.event
      switch (e.which) {
        case Keys.arrowUp:
        case Keys.arrowDown:
          e.preventDefault()
          break
      }
    })

    window.addEventListener('keyup', (e?: any) => {
      e = e || window.event
      switch (e.which) {
        case Keys.arrowUp:
          this.selectedIndex = Math.max(this.selectedIndex - 1, -1)
          e.preventDefault()
          break
        case Keys.arrowDown:
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.states.length -1)
          e.preventDefault()
          break
      }
    })
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
@import '../../scss/_shared';

.state-manager {
  .preview-wrap {
    position: relative;
    display: block;
    height: 220px;
    width: 100%;
    margin-bottom: $pad-md-bottom;

    .preview-img-wrap {
      text-align: center;
      
      .preview-img {
        position: relative;
        height: 220px;
        display: inline-block;

        img, video {
          height: 100%;
          margin: 0 auto;
        }

        button {
          position: absolute;
          transform: scale(0.8);
          bottom: 1px;
          right: 1px;
        }
      }
    }
  }

  table {
    th, td {
      &.state-id {
        max-width: 70px;
        width: 70px;
        white-space: nowrap;
        overflow: hidden;
      }

      &.state-created {
        max-width: 144px;
        width: 144px;
        white-space: nowrap;
        overflow: hidden;
      }

      &.state-file {
        max-width: 220px;
        width: 220px;
        white-space: nowrap;
        overflow: hidden;
      }

      &.actions {
        text-align: center;
        width: 57px;
      }
    }

    td {
      &.state-id {
        color: $gray9;
      }
    }

    tbody {
      width: 100%;
      display: block;

      tr {
        cursor: pointer;

        &:hover {
          background-color: lighten($theme-blue, 35%);
        }

        &.selected {
          background-color: $theme-blue;
          color: #fff;

          td.state-id {
            color: lighten($theme-blue, 25%);
          }
        }
      }
    }
  }
}
</style>
