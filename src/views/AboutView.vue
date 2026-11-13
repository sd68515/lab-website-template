<template>
  <div class="about-layout"><div class="about-main">
    <section class="about-section about-section--team" aria-labelledby="about-team-title">
      <h1 id="about-team-title" class="about-section-title">{{ text('contact.researchTeam') }}</h1>
      <div class="about-content about-content--team">
        <div class="team-group team-group--principal">
          <h2 class="about-team-heading">{{ text('contact.principalInvestigators') }}</h2>
          <div class="team-group__body">
            <p class="team-group__affiliation">{{ text('contact.uthealthAffiliation') }}</p>
            <ul class="team-list team-list--principal"><li class="team-member">
              <span class="team-member-name">{{ text('contact.exampleInvestigator') }}</span>
              <div class="team-member-contact">
                <button type="button" class="team-member-email" @click="copy('contact', email)">{{ email }}</button>
                <span v-if="getCopyState('contact') === 'success'" role="status">{{ text('common.copied') }}</span>
                <CopyFeedback id="contact-copy-feedback" :state="getCopyState('contact')" :manual-value="email" />
              </div>
            </li></ul>
          </div>
        </div>
        <div class="team-group team-group--students">
          <h2 class="about-team-heading">{{ text('contact.postdoctoralFellowsStudents') }}</h2>
          <div class="team-group__body"><p>{{ text('contact.exampleMembers') }}</p></div>
        </div>
        <div class="team-group team-group--co">
          <h2 class="about-team-heading">{{ text('contact.coInvestigators') }}</h2>
          <div class="team-group__body"><p>{{ text('contact.exampleCollaborators') }}</p></div>
        </div>
      </div>
    </section>
    <section class="about-section" aria-labelledby="about-citation-title">
      <h2 id="about-citation-title" class="about-section-title">{{ text('contact.citation') }}</h2>
      <div class="about-content about-content--citation"><p>{{ text('contact.citationPlaceholder') }}</p></div>
    </section>
  </div></div>
</template>
<script setup lang="ts">
import CopyFeedback from '@/components/common/CopyFeedback.vue'
import { useClipboardFeedback } from '@/composables/useClipboardFeedback'
import { text } from '@/utils/locale'
const email = 'contact@example.org'
const { getCopyState, copy } = useClipboardFeedback<'contact'>()
</script>
<style lang="scss">@use '@/styles/pages/info-pages.scss';</style>
