<template>
  <section class="app-screen is-active">
    <div class="topbar">
      <div>
        <p class="eyebrow">首页</p>
        <h1>朋友档案</h1>
      </div>
    </div>

    <label class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索朋友姓名、昵称、偏好、状态"
        @input="handleSearch"
      />
    </label>

    <FriendGrid :friends="displayFriends" />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useFriendsStore } from '@/stores/friends';
import FriendGrid from '@/components/friend/FriendGrid.vue';

const friendsStore = useFriendsStore();
const searchQuery = ref('');
const searchResults = ref<typeof friendsStore.friends>([]);
const isSearching = ref(false);

const displayFriends = computed(() => {
  if (isSearching.value && searchQuery.value.trim()) {
    return searchResults.value;
  }
  return friendsStore.friends;
});

onMounted(async () => {
  await friendsStore.loadFriends();
});

async function handleSearch(): Promise<void> {
  if (!searchQuery.value.trim()) {
    isSearching.value = false;
    searchResults.value = [];
  } else {
    isSearching.value = true;
    searchResults.value = await friendsStore.searchFriends(searchQuery.value);
  }
}
</script>
