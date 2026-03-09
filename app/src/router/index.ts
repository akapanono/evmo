import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/friend/:id',
    name: 'friend-detail',
    component: () => import('@/views/FriendDetailView.vue'),
  },
  {
    path: '/friend/:id/list/:section',
    name: 'friend-record-list',
    component: () => import('@/views/FriendRecordListView.vue'),
  },
  {
    path: '/friend/:id/ask',
    name: 'ask-ai',
    component: () => import('@/views/AskAIView.vue'),
  },
  {
    path: '/friend/:id/intake',
    name: 'profile-intake',
    component: () => import('@/views/ProfileIntakeView.vue'),
  },
  {
    path: '/add',
    name: 'add-friend',
    component: () => import('@/views/AddFriendView.vue'),
  },
  {
    path: '/edit/:id',
    name: 'edit-friend',
    component: () => import('@/views/AddFriendView.vue'),
  },
  {
    path: '/me',
    name: 'me',
    component: () => import('@/views/MeView.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
