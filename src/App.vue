<template>
    <a-config-provider :locale="zhCN">
        <div class="app-container">
            <header class="header">
                <div class="header-content">
                    <h1 class="title">芝麻凑分</h1>
                    <div class="user-info">
                        <template v-if="user">
                            <span class="nickname">{{ user.nickname }}</span>
                            <span class="divider">|</span>
                            <a href="javascript:;" class="logout-link" @click="handleLogout">退出</a>
                        </template>
                        <template v-else>
                            <router-link to="/auth" class="follow-link">登录 / 注册</router-link>
                        </template>
                    </div>
                </div>
                <a-tabs v-model:activeKey="activeTab" @change="handleTabChange" centered class="main-tabs">
                    <a-tab-pane key="/publish" tab="发布" />
                    <a-tab-pane key="/hall" tab="大厅" />
                    <a-tab-pane key="/my" tab="我的" />
                    <a-tab-pane v-if="user?.isAdmin" key="/admin/users" tab="账号管理" />
                </a-tabs>
            </header>

            <main class="main-content">
                <router-view v-slot="{ Component }">
                    <keep-alive>
                        <component :is="Component" />
                    </keep-alive>
                </router-view>
            </main>
        </div>
    </a-config-provider>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';

const router = useRouter();
const route = useRoute();
const activeTab = ref(route.path);
const user = ref(null);

const checkUser = () => {
    const userData = localStorage.getItem('sesame_user');
    if (userData) {
        user.value = JSON.parse(userData);
    }
};
const handleLogout = () => {
    localStorage.removeItem('sesame_token');
    localStorage.removeItem('sesame_user');
    user.value = null;
    message.success('已退出登录');
    router.push('/auth');
};

onMounted(() => {
    const userData = localStorage.getItem('sesame_user');
    if (userData) {
        user.value = JSON.parse(userData);
    }
});

watch(
    () => route.path,
    (path) => {
        if (path === '/') activeTab.value = '/publish';
        else activeTab.value = path;

        // Refresh user state on route change to keep UI in sync
        const userData = localStorage.getItem('sesame_user');
        user.value = userData ? JSON.parse(userData) : null;
    }
);

const handleTabChange = (key) => {
    router.push(key);
};
</script>

<style scoped>
:root {
    --primary-color: #4f46e5;
    --primary-hover: #4338ca;
    --bg-color: #f8fafc;
    --header-bg: rgba(255, 255, 255, 0.85);
    --text-main: #1e293b;
    --text-muted: #64748b;
    --border-color: rgba(226, 232, 240, 0.8);
}

.app-container {
    max-width: 1000px;
    margin: 0 auto;
    min-height: 100vh;
    background-color: #f8fafc;
    display: flex;
    flex-direction: column;
}

.header {
    background: var(--header-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 16px 20px 0;
    position: sticky;
    top: 0;
    z-index: 100;
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;
    margin-bottom: 12px;
}

.title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.user-info {
    font-size: 13px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 12px;
}

.nickname {
    font-weight: 600;
    color: var(--text-main);
}

.divider {
    color: var(--border-color);
}

.logout-link {
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s ease;
}

.logout-link:hover {
    color: #ef4444;
}

.follow-link {
    color: #4f46e5;
    text-decoration: none;
    font-weight: 600;
    background: rgba(79, 70, 229, 0.1);
    padding: 4px 12px;
    border-radius: 20px;
    transition: all 0.2s ease;
}

.follow-link:hover {
    background: rgba(79, 70, 229, 0.2);
}

.main-tabs :deep(.ant-tabs-nav) {
    margin-bottom: 0;
}

.main-tabs :deep(.ant-tabs-nav::before) {
    border-bottom: none !important;
}

.main-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
}

@media (max-width: 640px) {
    .main-content {
        padding: 16px;
    }
}
</style>

<style>
body {
    margin: 0;
    padding: 0;
    font-family:
        'Outfit',
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        sans-serif;
    background-color: #f1f5f9;
    color: #1e293b;
}

.ant-tabs-tab {
    font-family: 'Outfit', sans-serif !important;
    font-weight: 500 !important;
}
</style>
