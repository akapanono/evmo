import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Friend } from '@/types/friend';
import { friendService } from '@/services/friendService';
import { useMemorialDaysStore } from '@/stores/memorialDays';

export const useFriendsStore = defineStore('friends', () => {
  const friends = ref<Friend[]>([]);
  const loading = ref(false);
  const selectedFriendId = ref<string | null>(null);
  const memorialDaysStore = useMemorialDaysStore();

  const selectedFriend = computed(() =>
    friends.value.find((f) => f.id === selectedFriendId.value)
  );

  async function loadFriends(): Promise<void> {
    loading.value = true;
    try {
      friends.value = await friendService.getAllFriends();
    } finally {
      loading.value = false;
    }
  }

  async function addFriend(friend: Partial<Friend>): Promise<Friend> {
    const newFriend = await friendService.createFriend(friend);
    friends.value.unshift(newFriend);
    await memorialDaysStore.loadMemorialDays();
    return newFriend;
  }

  function upsertFriend(updated: Friend): Friend {
    const index = friends.value.findIndex((f) => f.id === updated.id);
    if (index !== -1) {
      friends.value[index] = updated;
    } else {
      friends.value.unshift(updated);
    }

    return updated;
  }

  async function updateFriend(
    id: string,
    updates: Partial<Friend>,
    options?: { refreshPersona?: boolean; refreshRecommendations?: boolean },
  ): Promise<Friend | undefined> {
    const updated = await friendService.updateFriend(id, updates, options);
    if (updated) {
      upsertFriend(updated);
      await memorialDaysStore.loadMemorialDays();
    }

    return updated;
  }

  async function getFriendById(id: string): Promise<Friend | undefined> {
    const existing = friends.value.find((friend) => friend.id === id);
    if (existing) {
      return existing;
    }

    const friend = await friendService.getFriendById(id);
    if (friend) {
      upsertFriend(friend);
    }

    return friend;
  }

  async function refreshFriendPersona(id: string): Promise<Friend | undefined> {
    const updated = await friendService.refreshFriendPersona(id);
    if (updated) {
      upsertFriend(updated);
      await memorialDaysStore.loadMemorialDays();
    }

    return updated;
  }

  async function deleteFriend(id: string): Promise<void> {
    await friendService.deleteFriend(id);
    friends.value = friends.value.filter((f) => f.id !== id);
    await memorialDaysStore.loadMemorialDays();
    if (selectedFriendId.value === id) {
      selectedFriendId.value = null;
    }
  }

  function selectFriend(id: string): void {
    selectedFriendId.value = id;
  }

  async function searchFriends(query: string): Promise<Friend[]> {
    if (!query.trim()) {
      return friends.value;
    }
    return friendService.searchFriendsInMemory(friends.value, query);
  }

  return {
    friends,
    loading,
    selectedFriendId,
    selectedFriend,
    loadFriends,
    addFriend,
    upsertFriend,
    updateFriend,
    getFriendById,
    refreshFriendPersona,
    deleteFriend,
    selectFriend,
    searchFriends,
  };
});
