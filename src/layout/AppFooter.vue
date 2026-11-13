<template>
  <footer class="app-footer">
    <div class="app-footer__inner app-footer__inner--centered">
      <p class="app-footer__copy">
        <LocalizedText message="appFooter.appFooterCopy">
          <template #lab><a href="https://relab.xidian.edu.cn/" target="_blank" rel="noopener noreferrer">{{ text('appFooter.rehabilitationEngineeringLab') }}</a></template>
          <template #ccsm><a href="https://sbmi.uth.edu/ccsm/" target="_blank" rel="noopener noreferrer">{{ text('appFooter.cCSM') }}</a></template>
        </LocalizedText>
        <span class="app-footer__license"><LocalizedText message="appFooter.license"><template #license><a :href="resolvePublicAsset('licenses/LICENSE.txt')">{{ text('appFooter.mitLicense') }}</a></template></LocalizedText></span>
      </p>
    </div>
  </footer>
</template>
<script setup lang="ts">
import { text } from '@/utils/locale'
import { resolvePublicAsset } from '@/utils/path'
import LocalizedText from '@/components/common/LocalizedText.vue'
</script>
<style lang="scss">@use '@/styles/components/footer.scss';</style>
