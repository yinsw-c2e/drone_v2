<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { watch } from 'vue';
import { isBackendSnapshotPushEnabled, queueBackendSnapshotSync } from '@/api/backend';
import { ensureDemoCredit } from '@/services/app-flow';
import { useUserStore } from '@/stores/user';
import { db } from '@/utils/db';

onLaunch(() => {
  const userStore = useUserStore();
  ensureDemoCredit();
  void userStore.loadMe().finally(() => ensureDemoCredit());
});

if (isBackendSnapshotPushEnabled()) {
  watch(db, () => queueBackendSnapshotSync(db), { deep: true });
}
</script>

<style lang="scss">
page {
  min-height: 100%;
  background: $bg-page;
  color: $ink-900;
  font-family: -apple-system, 'PingFang SC', 'Source Han Sans CN', 'Noto Sans CJK SC', system-ui, sans-serif;
}

view,
text,
button,
input,
textarea {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  line-height: 1;
  background: transparent;
}

button:active {
  transform: scale(.99);
}

button[disabled] {
  color: $ink-400;
  background: $bg-sunken;
}
</style>
