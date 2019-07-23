<template>
  <div id="app">
    <Randomizr />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Randomizr from '@/screens/Randomizr/Randomizr.vue'

@Component({
  components: {
    Randomizr,
  },
})
export default class App extends Vue {}
</script>

<style lang="scss">
@import './scss/_style';

#app, body {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  border: 0;
  color: $font-dark;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  height: 100%;
  margin: 0;
  overflow: hidden;
  padding: 0;
  position: relative;
  width: 100%;
  background-color: #000;
}
</style>
