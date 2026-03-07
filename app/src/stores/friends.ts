import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Friend } from '@/types/friend';
import { friendService } from '@/services/friendService';

export const useFriendsStore = defineStore('friends', () => {
  const friends = ref<Friend[]>([]);
  const loading = ref(false);
  const selectedFriendId = ref<string | null>(null);

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
    return newFriend;
  }

  async function updateFriend(id: string, updates: Partial<Friend>): Promise<void> {
    const updated = await friendService.updateFriend(id, updates);
    if (updated) {
      const index = friends.value.findIndex((f) => f.id === id);
      if (index !== -1) {
        friends.value[index] = updated;
      }
    }
  }

  async function deleteFriend(id: string): Promise<void> {
    await friendService.deleteFriend(id);
    friends.value = friends.value.filter((f) => f.id !== id);
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
    return friendService.searchFriends(query);
  }

  return {
    friends,
    loading,
    selectedFriendId,
    selectedFriend,
    loadFriends,
    addFriend,
    updateFriend,
    deleteFriend,
    selectFriend,
    searchFriends,
  };
});
