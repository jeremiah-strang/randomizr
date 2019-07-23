<template>
  <div class="modal-wrap" ref="modal">
    <Modal title="Saved State Manager"
           size="md"
           height="520"
           title-icon-class="bookmark"
           scrollable="true"
           :is-busy="isBusy"
           @close="() => $emit('close')">
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
        </div>
        <div class="pnl w100 h350px o-auto">
          <table>
            <thead>
              <tr>
                <th class="actions">&nbsp;</th>
                <th class="state-id">ID</th>
                <!-- <th class="state-name">Name</th> -->
                <th class="state-file" v-for="index in maxNumImageViews" :key="index">File {{ index }}</th>
                <!-- <th class="scrollbar">&nbsp;</th> -->
              </tr>
            </thead>
            <tbody>
              <tr @click="() => selectState(item)"
                v-for="item in states"
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

                <td class="state-id">
                  {{ item._id }}
                </td>
                <!-- <td class="state-name">
                  <input v-model="item.name" type="text">
                </td> -->
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
import { Component, Prop, Vue } from 'vue-property-decorator'
import { shell } from 'electron'
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

@Component
export default class StateManager extends Vue {
  private isBusy: boolean = false
  private isEdited: boolean = false
  private states: RandomizrState[] = []
  private newTag: string = ''
  private maxNumImageViews: number = 3
  private selectedState: RandomizrState | null = null

  private selectState (state) {
    this.selectedState = state
  }

  private async removeState (_id) {
    await removeRandomizrState(_id)
    this.loadStates()
  }

  //
  private isImage = (file: string) => IMAGE_EXTENSIONS_SET.has(getExtension(file))

  //
  private isVideo = (file: string) => VIDEO_EXTENSIONS_SET.has(getExtension(file))

  //
  private getExtension = (file: string) => getExtension(file)

  //
  async loadStates () {
    this.isBusy = true
    try {
      let states = await getRandomizrStates()
      states = states
        .sort((a, b) => a._id > b._id ? 1 : -1)
        .map(state => {
          this.maxNumImageViews = Math.max(this.maxNumImageViews, state.imageViews.length)

          return {
            ...state,
            name: state.name || '',
            isEdited: false,
          }
        })
      this.states = states
    } catch (error) {
      console.error(error)
    }
    this.isBusy = false
  }

  //
  async onSave () {
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
    height: 150px;
    width: 100%;
    margin-bottom: $pad-md-bottom;

    .preview-img-wrap {
      text-align: center;
      
      .preview-img {
        position: relative;
        height: 150px;
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
        max-width: 100px;
        width: 100px;
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
        }
      }
    }
  }
}
</style>
