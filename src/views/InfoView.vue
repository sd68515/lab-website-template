<template>
  <div class="page-wrap info-page">
    <template v-if="page === 'download'">
      <section class="info-section">
        <h1>{{ t('Download resources', '下载资源') }}</h1>
        <p>{{ t('Download resources have not yet been configured for this example.', '此示例尚未配置下载资源。') }}</p>
        <div class="resource-grid">
          <div class="resource-item">
            <strong>{{ t('Example datasets', '示例数据集') }}</strong>
            <span>{{ t('Processed data and supporting files', '处理后的数据及相关文件') }}</span>
            <span class="resource-status">{{ t('Not configured', '尚未配置') }}</span>
          </div>
          <div class="resource-item">
            <strong>{{ t('Example results', '示例结果') }}</strong>
            <span>{{ t('Figures and summary tables', '图片及汇总表') }}</span>
            <span class="resource-status">{{ t('Not configured', '尚未配置') }}</span>
          </div>
        </div>
        <p>{{ t('Add your own files and links here when they are ready to share.', '准备好共享资源后，请在此添加项目文件和链接。') }}</p>
      </section>
      <section class="info-section">
        <h2>{{ t('Project repository', '项目代码仓库') }}</h2>
        <p>{{ t('A repository link has not been configured. Add a link to your project source code and documentation here.', '尚未配置代码仓库链接。请在此添加项目源代码和文档的链接。') }}</p>
      </section>
    </template>
    <template v-else-if="page === 'help'">
      <section class="info-section help-content">
        <h1>{{ t('Help', '帮助') }}</h1>
        <section class="help-section">
          <h2>{{ t('Getting started', '开始使用') }}</h2>
          <p>{{ t('Use the home page to browse example results by dataset, method or metric.', '在首页按数据集、方法或指标浏览示例结果。') }}</p>
          <details>
            <summary>{{ t('Browse by dataset or method', '按数据集或方法浏览') }}</summary>
            <p>{{ t('Choose a category and an item, then select Search. Choose Clear to reset the fields.', '选择类别及具体项目，然后点击“查询”。点击“清除”可重置选项。') }}</p>
          </details>
          <details>
            <summary>{{ t('Explore metrics', '浏览指标') }}</summary>
            <p>{{ t('Select a metric on the home page to open its example visualization.', '在首页选择指标，即可打开对应的示意可视化。') }}</p>
          </details>
        </section>
        <section class="help-section">
          <h2>{{ t('Tools and results', '工具与结果') }}</h2>
          <p>{{ t('The Tools page lists example methods. Search by name or description, or filter by category.', '工具页面列出了示例方法。您可以按名称或描述搜索，也可以按类别筛选。') }}</p>
          <details>
            <summary>{{ t('Open a method result', '打开方法结果') }}</summary>
            <p>{{ t('Select a method name in the table to view its results. Use the available controls on the result page to explore the example.', '在表格中选择方法名称即可查看结果，使用结果页面的控件浏览示例。') }}</p>
          </details>
        </section>
        <section class="help-section">
          <h2>{{ t('About this template', '关于此模板') }}</h2>
          <p>{{ t('All names and values are illustrative. Replace the examples and these instructions with your own project information.', '所有名称和数值仅用于演示。请将示例及使用说明替换为您自己的项目信息。') }}</p>
          <details>
            <summary>{{ t('Language and appearance', '语言与外观') }}</summary>
            <p>{{ t('Use the controls in the header to switch between English and Simplified Chinese, or between light and dark themes.', '使用页眉中的控件切换英语和简体中文，或切换浅色与深色主题。') }}</p>
          </details>
        </section>
      </section>
    </template>
    <template v-else>
      <section class="info-section">
        <h1>{{ t('Research team', '研究团队') }}</h1>
        <p>{{ t('The people and contact information below are fictional placeholders.', '以下人员及联系方式均为虚构占位内容。') }}</p>
        <div class="team-grid">
          <div>
            <h2>{{ t('Principal investigators', '项目负责人') }}</h2>
            <p><strong>{{ t('Example Investigator', '示例负责人') }}</strong><br>{{ t('Example Research Group', '示例研究团队') }}</p>
            <div class="email-contact">
              <button type="button" class="email-copy" @click="copyEmail">contact@example.org</button>
              <span>{{ t('Select the address to copy it', '点击地址即可复制') }}</span>
              <span v-if="copyState === 'success'" class="copy-success" role="status">{{ t('Email copied.', '邮箱已复制。') }}</span>
              <span v-else-if="copyState === 'error'" class="copy-error" role="status">{{ t('Could not copy. Select and copy the address manually: contact@example.org', '复制失败，请手动选择并复制地址：contact@example.org') }}</span>
            </div>
          </div>
          <div>
            <h2>{{ t('Project members', '项目成员') }}</h2>
            <p>{{ t('Example Member A · Example Member B', '示例成员甲 · 示例成员乙') }}</p>
            <p>{{ t('Add contributors and affiliations here.', '请在此添加贡献者及其所属机构。') }}</p>
          </div>
          <div class="team-collaborators">
            <h2>{{ t('Collaborators', '合作研究人员') }}</h2>
            <p>{{ t('Example Collaborator · Example Institution', '示例合作者 · 示例机构') }}</p>
          </div>
        </div>
      </section>
      <section class="info-section">
        <h2>{{ t('Citation', '引用') }}</h2>
        <p>{{ t('Citation details have not been configured. Add your project publication or recommended citation here.', '尚未配置引用信息。请在此添加项目论文或推荐的引用格式。') }}</p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLocale } from '@/composables/useLocale'

defineProps<{ page: 'download' | 'help' | 'about' }>()
const { t } = useLocale()
const copyState = ref<'idle' | 'success' | 'error'>('idle')

// Clipboard access can be denied or unavailable; leave the address visible for manual copying.
// 剪贴板可能不可用或被拒绝，地址始终可见以便手动复制。
async function copyEmail() {
  try {
    if (!navigator.clipboard) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText('contact@example.org')
    copyState.value = 'success'
  } catch {
    copyState.value = 'error'
  }
}
</script>
