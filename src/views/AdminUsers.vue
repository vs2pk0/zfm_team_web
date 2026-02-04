<template>
    <div class="admin-users-page">
        <div class="page-header">
            <h2>账号管理</h2>
            <a-button type="primary" @click="fetchUsers">刷新列表</a-button>
        </div>

        <a-table :columns="columns" :data-source="users" :loading="loading" row-key="id" class="user-table">
            <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'isAdmin'">
                    <a-tag :color="record.isAdmin ? 'red' : 'blue'">
                        {{ record.isAdmin ? '管理员' : '普通用户' }}
                    </a-tag>
                </template>
                <template v-else-if="column.key === 'createdAt'">
                    {{ formatDate(record.createdAt) }}
                </template>
                <template v-else-if="column.key === 'action'">
                    <a-button type="link" @click="openEditModal(record)">编辑</a-button>
                </template>
            </template>
        </a-table>

        <a-modal
            v-model:open="modalVisible"
            title="编辑账号"
            @ok="handleUpdate"
            :confirmLoading="updateLoading"
            ok-text="保存"
            cancel-text="取消"
        >
            <a-form :model="editForm" layout="vertical" class="edit-form">
                <a-form-item label="用户名">
                    <a-input v-model:value="editForm.username" disabled />
                </a-form-item>
                <a-form-item label="昵称">
                    <a-input v-model:value="editForm.nickname" />
                </a-form-item>
                <a-form-item label="邮箱">
                    <a-input v-model:value="editForm.email" placeholder="请输入邮箱" />
                </a-form-item>
                <a-form-item label="重置密码">
                    <a-input-password v-model:value="editForm.password" placeholder="留空则不修改密码" />
                </a-form-item>
                <a-form-item label="权限控制">
                    <a-checkbox v-model:checked="editForm.isAdmin">设为管理员</a-checkbox>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { adminGetUsers, adminUpdateUser } from '../api';

const users = ref([]);
const loading = ref(false);
const modalVisible = ref(false);
const updateLoading = ref(false);
const editForm = ref({
    id: '',
    username: '',
    nickname: '',
    email: '',
    password: '',
    isAdmin: false
});

const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '权限', dataIndex: 'isAdmin', key: 'isAdmin' },
    { title: '注册时间', dataIndex: 'createdAt', key: 'createdAt' },
    { title: '操作', key: 'action' }
];

const fetchUsers = async () => {
    loading.value = true;
    try {
        const res = await adminGetUsers();
        if (res.data.success) {
            users.value = res.data.data;
        }
    } catch (err) {
        message.error('获取用户列表失败');
    } finally {
        loading.value = false;
    }
};

const openEditModal = (user) => {
    editForm.value = {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email || '',
        password: '',
        isAdmin: user.isAdmin
    };
    modalVisible.value = true;
};

const handleUpdate = async () => {
    updateLoading.value = true;
    try {
        const { id, ...data } = editForm.value;
        // Don't send empty password
        if (!data.password) delete data.password;

        const res = await adminUpdateUser(id, data);
        if (res.data.success) {
            message.success('更新成功');
            modalVisible.value = false;
            fetchUsers();
        }
    } catch (err) {
        message.error('更新失败');
    } finally {
        updateLoading.value = false;
    }
};

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

onMounted(fetchUsers);
</script>

<style scoped>
.admin-users-page {
    padding: 24px;
    background: #fff;
    border-radius: 16px;
    min-height: 500px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.page-header h2 {
    margin: 0;
    font-weight: 800;
    color: #1e293b;
}

.user-table {
    border: 1px solid #f1f5f9;
    border-radius: 12px;
    overflow: hidden;
}

.edit-form {
    padding: 10px 0;
}
</style>
