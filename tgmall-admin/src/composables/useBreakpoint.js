import { ref, computed, onMounted, onUnmounted } from 'vue';

export const BREAKPOINTS = {
  xs: 0,
  sm: 431,
  md: 768,
  lg: 1024,
};

export function useBreakpoint() {
  const width = ref(
    typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.lg
  );

  const xs = computed(() => width.value >= BREAKPOINTS.xs && width.value < BREAKPOINTS.sm);
  const sm = computed(() => width.value >= BREAKPOINTS.sm && width.value < BREAKPOINTS.md);
  const md = computed(() => width.value >= BREAKPOINTS.md && width.value < BREAKPOINTS.lg);
  const lg = computed(() => width.value >= BREAKPOINTS.lg);
  const isMobile = computed(() => xs.value || sm.value);

  function onResize() {
    width.value = window.innerWidth;
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onResize);
    }
  });
  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onResize);
    }
  });

  return { xs, sm, md, lg, isMobile, width };
}
