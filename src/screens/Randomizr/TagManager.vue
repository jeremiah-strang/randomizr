<template>
  <div class="modal-wrap" ref="modal">
    <Modal title="Tag Manager"
           size="sm"
           height="450"
           title-icon-class="cog"
           scrollable="true"
           :is-busy="isBusy"
           @close="() => $emit('close')">
      <div slot="modal-body" class="image-tag-manager">
        <div class="form-row float-right">
          <input v-model="newTag" type="text" placeholder="New tag">
          <button @click="createTag">Add</button>
        </div>
        <table>
          <thead>
            <tr>
              <th class="favorite">Tag</th>
              <th class="implies">Implies Tags</th>
              <th class="actions">&nbsp;</th>
              <!-- <th class="scrollbar">&nbsp;</th> -->
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in tagMetas" :key="item._id">
              <td class="favorite">
                <input v-model="item.favorite" type="checkbox">
                {{ item._id }}
              </td>
              <td class="implies">
                <input v-model="item.impliesTagsStr" @change="updateImpliesTags(item)" type="text">
              </td>
              <td class="actions">
                <button @click="() => removeTag(item._id)"
                        class="btn-danger">
                  <FontAwesome icon="trash" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- <p v-for="item in tagMetas" :key="item._id">{{ item._id }}</p> -->
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
import {
  createImageTagMeta,
  getImageTagMetas,
  ImageTagMeta,
  removeImageTagMeta,
  updateImageTagMeta,
} from '@/models/ImageTagMeta'

@Component
export default class ImageTagManager extends Vue {
  private isBusy: boolean = false
  private isEdited: boolean = false
  private tagMetas: ImageTagMeta[] = []
  private newTag: string = ''

  //
  async loadTagMetas () {
    this.isBusy = true
    try {
      let tagMetas = await getImageTagMetas()
      tagMetas = tagMetas
        .sort((a, b) => a._id > b._id ? 1 : -1)
        .map(tagMeta => {
          return {
            ...tagMeta,
            impliesTagsStr: (tagMeta.impliesTags || []).join(', '),
            isEdited: false,
          }
        })
      this.tagMetas = [
        ...tagMetas.filter(tagMeta => tagMeta.favorite),
        ...tagMetas.filter(tagMeta => !tagMeta.favorite),
      ]
    } catch (error) {
      console.error(error)
    }
    this.isBusy = false
  }

  //
  async createTag () {
    if (this.newTag) {
      this.isBusy = true
      try {
        await createImageTagMeta({
          _id: this.newTag,
          favorite: false,
          impliesTags: [],
        })
      } catch (error) {
        console.error(error)
      }
      this.newTag = ''
      this.isBusy = false
    }
  }

  //
  async removeTag (tagId) {
    if (tagId) {
      this.isBusy = true
      try {
        await removeImageTagMeta(tagId)
      } catch (error) {
        console.error(error)
      }
      this.isBusy = false
      this.loadTagMetas()
    }
  }

  //
  async onSave () {
    if (this.isEdited) {
      this.isBusy = true
      try {
        const promises = this.tagMetas
          .filter((tagMeta: any) => tagMeta.isEdited)
          .map(tagMeta => {
            return updateImageTagMeta({
              _id: tagMeta._id,
              impliesTags: tagMeta.impliesTags,
              favorite: tagMeta.favorite === true,
            }).catch(() => {})
          })
        await Promise.all(promises)
        this.isEdited = false
      } catch (error) {
        console.error(error)
      }
      this.loadTagMetas()
      this.isBusy = false
    }
  }

  //
  updateImpliesTags (tagMeta) {
    if (tagMeta) {
      tagMeta.impliesTags = tagMeta.impliesTagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      tagMeta.isEdited = true
      this.isEdited = true
    }
    console.log(tagMeta)
  }

  //
  mounted () {
    this.loadTagMetas()
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
@import '../../scss/_shared';

.image-tag-manager {
  table {
    th, td {
      &.favorite {
        width: 170px;

        input[type=checkbox] {
          width: 14px;
          height: 14px;
        }
      }

      &.implies {
        width: 250px;
        input[type=text] {
          width: 100%;
        }
      }

      &.actions {
        text-align: center;
        width: 30px;
      }
    }

    tbody {
      width: 100%;
      display: block;
    }
  }
}
</style>
