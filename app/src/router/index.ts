import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/HomeDashboardView.vue'),
  },
  {
    path: '/home/more/:range',
    name: 'home-occasion-more',
    component: () => import('@/views/HomeOccasionListView.vue'),
  },
  {
    path: '/home/occasion/:type/:id',
    name: 'home-occasion-detail',
    component: () => import('@/views/HomeOccasionDetailView.vue'),
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/friends',
    name: 'friends',
    component: () => import('@/views/FriendsView.vue'),
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
    path: '/friend/:id/supplement',
    name: 'friend-supplement',
    component: () => import('@/views/FriendSupplementView.vue'),
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
    path: '/memorial/new',
    name: 'memorial-create',
    component: () => import('@/views/MemorialEditorView.vue'),
  },
  {
    path: '/memorial/:id/edit',
    name: 'memorial-edit',
    component: () => import('@/views/MemorialEditorView.vue'),
  },
  {
    path: '/edit/:id',
    name: 'edit-friend',
    component: () => import('@/views/AddFriendView.vue'),
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/views/AuthView.vue'),
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
