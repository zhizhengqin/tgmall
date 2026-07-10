<!-- 城市选择器 —— 用于地址表单 -->
<template>
  <div class="city-picker">
    <div class="city-input" @click="open = true">
      <span v-if="name" class="city-name">{{ name }}</span>
      <span v-else class="placeholder">{{ placeholderText }}</span>
      <span class="arrow">›</span>
    </div>

    <div v-if="open" class="modal-mask" @click.self="open = false">
      <div class="modal">
        <h3>{{ title }}</h3>
        <div v-if="loading" class="empty">{{ $t('common.loading') }}</div>
        <div v-else class="city-list">
          <div
            v-for="city in cities"
            :key="city.code"
            class="city-option"
            :class="{ selected: code === city.code }"
            @click="select(city)"
          >
            <span class="city-option-name">{{ cityName(city) }}</span>
            <span class="city-check" :class="{ visible: code === city.code }">✓</span>
          </div>
        </div>
        <button class="close-btn" @click="open = false">{{ $t('common.cancel') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { listCities } from '@/api/cities';

const props = defineProps({
  code: { type: String, default: '' },
  name: { type: String, default: '' },
  placeholder: { type: String, default: '' },
});
const emit = defineEmits(['update:code', 'update:name']);

const { locale, t } = useI18n();
const open = ref(false);
const loading = ref(false);
const cities = ref([]);

const title = computed(() => t('city.selectTitle'));
const placeholderText = computed(() => props.placeholder || t('profile.form.city'));

function cityName(city) {
  if (locale.value === 'en') return city.nameEn || city.nameKm || city.code;
  if (locale.value === 'zh') return city.nameZh || city.nameKm || city.code;
  return city.nameKm || city.code;
}

async function load() {
  if (cities.value.length) return;
  loading.value = true;
  try {
    const res = await listCities();
    cities.value = res.data || [];
  } catch {
    cities.value = [];
  } finally {
    loading.value = false;
  }
}

function select(city) {
  emit('update:code', city.code);
  emit('update:name', cityName(city));
  open.value = false;
}

watch(open, (v) => {
  if (v) load();
});
</script>

<style scoped>
.city-picker { width: 100%; }
.city-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--surface);
  cursor: pointer;
  min-height: 40px;
}
.city-name { color: var(--fg); }
.placeholder { color: var(--muted); }
.arrow { color: var(--muted); transform: rotate(90deg); }
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 300;
  display: flex;
  align-items: flex-end;
}
.modal {
  background: var(--surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: 24px;
  width: 100%;
  max-width: var(--max-width);
  max-height: 70vh;
  overflow-y: auto;
}
.modal h3 { font-size: 15px; margin-bottom: 16px; }
.city-list { display: flex; flex-direction: column; gap: 8px; }
.city-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.city-option.selected { border-color: var(--accent); color: var(--accent); font-weight: 600; }
.city-option-name { font-size: 14px; }
.city-check { font-size: 16px; color: var(--accent); opacity: 0; }
.city-check.visible { opacity: 1; }
.empty { text-align: center; padding: 40px 0; color: var(--muted); font-size: 13px; }
.close-btn {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  font-size: 14px;
  color: var(--fg);
}
</style>
