import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { memorialDayService } from '@/services/memorialDayService';
import type { MemorialDay } from '@/types/memorial';

export const useMemorialDaysStore = defineStore('memorialDays', () => {
  const memorialDays = ref<MemorialDay[]>([]);
  const loading = ref(false);

  const memorialMap = computed(() => {
    const map = new Map<string, MemorialDay[]>();
    for (const item of memorialDays.value) {
      const list = map.get(item.monthDay) ?? [];
      list.push(item);
      map.set(item.monthDay, list);
    }
    return map;
  });

  async function loadMemorialDays(): Promise<void> {
    loading.value = true;
    try {
      memorialDays.value = await memorialDayService.getAllMemorialDays();
    } finally {
      loading.value = false;
    }
  }

  async function createMemorialDay(input: Partial<MemorialDay>): Promise<MemorialDay> {
    const created = await memorialDayService.createMemorialDay(input);
    memorialDays.value = [...memorialDays.value, created].sort((a, b) => {
      if (a.monthDay !== b.monthDay) {
        return a.monthDay.localeCompare(b.monthDay);
      }
      return a.name.localeCompare(b.name, 'zh-CN');
    });
    return created;
  }

  async function updateMemorialDay(id: string, updates: Partial<MemorialDay>): Promise<MemorialDay | undefined> {
    const updated = await memorialDayService.updateMemorialDay(id, updates);
    if (!updated) {
      return undefined;
    }

    memorialDays.value = memorialDays.value
      .map((item) => item.id === id ? updated : item)
      .sort((a, b) => {
        if (a.monthDay !== b.monthDay) {
          return a.monthDay.localeCompare(b.monthDay);
        }
        return a.name.localeCompare(b.name, 'zh-CN');
      });
    return updated;
  }

  async function deleteMemorialDay(id: string): Promise<void> {
    await memorialDayService.deleteMemorialDay(id);
    memorialDays.value = memorialDays.value.filter((item) => item.id !== id);
  }

  async function replaceMemorialDays(items: MemorialDay[]): Promise<void> {
    await memorialDayService.replaceMemorialDays(items);
    memorialDays.value = items;
  }

  function getByMonthDay(monthDay: string): MemorialDay[] {
    return memorialMap.value.get(monthDay) ?? [];
  }

  function getByFriendId(friendId: string): MemorialDay[] {
    return memorialDays.value.filter((item) => item.friendIds.includes(friendId));
  }

  return {
    memorialDays,
    loading,
    memorialMap,
    loadMemorialDays,
    createMemorialDay,
    updateMemorialDay,
    deleteMemorialDay,
    replaceMemorialDays,
    getByMonthDay,
    getByFriendId,
  };
});
