<!--
  页脚组件
  展示共同建设机构及其标识
-->
<template>
  <footer class="app-footer" role="contentinfo">
    <div class="app-footer__inner" :class="{ 'app-footer__inner--centered': !showLogos }">
      <p class="app-footer__copy">
        <LocalizedText message="appFooter.appFooterCopy">
          <template #lab>
            <a href="https://relab.xidian.edu.cn/" target="_blank" rel="noopener noreferrer" translate="no">
              {{ text('appFooter.rehabilitationEngineeringLab') }}
            </a>
          </template>
          <template #ccsm>
            <a href="https://sbmi.uth.edu/ccsm/" target="_blank" rel="noopener noreferrer" translate="no">
              {{ text('appFooter.cCSM') }}
            </a>
          </template>
        </LocalizedText>
        <span class="app-footer__license">
          <LocalizedText message="appFooter.license">
            <template #license>
              <a :href="resolvePublicAsset('licenses/LICENSE.txt')" target="_blank" rel="noopener noreferrer">
                {{ text('appFooter.mitLicense') }}
              </a>
            </template>
          </LocalizedText>
        </span>
      </p>

      <div v-if="showLogos" class="app-footer__logos" :aria-label="text('appFooter.affiliatedInstitutions')">
        <a
          class="app-footer__logo-link"
          href="https://www.xidian.edu.cn/"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="text('appFooter.xidianUniversity')"
        >
          <img
            class="app-footer__logo"
            :src="resolvePublicAsset('images/ui/branding/Xidian.svg')"
            :alt="text('appFooter.xidianUniversity')"
            decoding="async"
            loading="lazy"
            @error="handleLogoError"
          />
        </a>
        <a
          class="app-footer__logo-link"
          href="https://sbmi.uth.edu/"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="text('appFooter.mcWilliamsSchoolOfBiomedicalInformaticsUTHealthHouston')"
        >
          <img
            class="app-footer__logo app-footer__logo--uthealth"
            :src="resolvePublicAsset('images/ui/branding/mcwilliams-school-of-biomedical-informatics-logo-orange-gray.svg')"
            :alt="text('appFooter.uTHealthHouston')"
            decoding="async"
            loading="lazy"
            @error="handleLogoError"
          />
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { text } from '@/utils/locale'
import LocalizedText from '@/components/common/LocalizedText.vue'
import { ref } from 'vue'
import { resolvePublicAsset } from '@/utils/path'

// logo 加载状态：任意一个失败就隐藏所有 logo
const showLogos = ref(true)

const handleLogoError = () => {
  showLogos.value = false
}
</script>

<style lang="scss">
@use '@/styles/components/footer.scss';
</style>
