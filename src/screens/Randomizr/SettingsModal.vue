<template>
  <div class="settings-modal modal-wrap" ref="modal">
    <Modal title="Image Settings"
           size="sm"
           title-icon-class="cog"
           :is-busy="isBusy"
           @close="() => $emit('close')">
      <div slot="modal-body" class="o-visible">
        <h4 v-show="errorMessage" class="red">{{ errorMessage }}</h4>
        <div class="form-row border-bottom">
          Image directories
          <input v-model="imageDirnamesStr" v-on:change="dirnamesChanged" class="w300px" type="text">
          <button @click="browseForFolder" class="btn-primary w75px">Browse</button>
        </div>
        <div class="form-row">
          Number of image views
          <input v-model="numImageViews" class="w100" type="number">
        </div>
      </div>
      <div slot="modal-footer">
        <button @click="onSave" :disabled="!hasValidDirname" class="btn-primary">
          <i class="fa fa-save"></i> Save
        </button>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts">
import { shell, remote } from 'electron'
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { defaultUserSettings, saveUserSettings, UserSettings } from '@/models/UserSettings'
import { isDirectory } from '@/models/fileUtils'
const { dialog } = remote

@Component
export default class SettingsModal extends Vue {
  @Prop() private settings!: UserSettings

  private isBusy: boolean = false
  private hasValidDirname: boolean = false
  private imageDirnamesStr: string = ''
  private numImageViews: number = 3

  //
  @Watch('settings', { immediate: true })
  private onSettingsChanged () {
    if (this.settings) {
      this.numImageViews = !isNaN(this.settings.numImageViews) ? this.settings.numImageViews : 3
      this.imageDirnamesStr = !Array.isArray(this.settings.imageDirnames) ? '' : this.settings.imageDirnames.join(';')
      this.$nextTick(this.dirnamesChanged)
    } else {
      this.hasValidDirname = false
      this.imageDirnamesStr = ''
      this.numImageViews = 3
    }
  }

  //
  get errorMessage () {
    if (!this.hasValidDirname) {
      return 'Please enter at least one valid directory below'
    }
    return ''
  }

  //
  private dirnamesChanged () {
    const dirnames = this.imageDirnamesStr.split(';')
    let hasValidDirname = false
    for (let dirname of dirnames) {
      hasValidDirname = hasValidDirname || isDirectory(dirname)
    }
    this.hasValidDirname = hasValidDirname
  }

  //
  private async onSave () {
    let updated: UserSettings = this.settings ? { ...this.settings } : defaultUserSettings()
    updated.imageDirnames = this.imageDirnamesStr.split(';')
    updated.numImageViews = this.numImageViews
    updated = await saveUserSettings(updated)
    this.$emit('update', updated)
  }

  //
  private browseForFolder () {
    const files = dialog.showOpenDialog({
      properties: ['openDirectory'],
      message: 'Select an directory',
    })

    if (files && files.length > 0) this.imageDirnamesStr = files[0]
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
  @import '../../scss/_shared';

  .video-randomizr {
    @extend .pnl;
    // @extend .w100;
  }
</style>
