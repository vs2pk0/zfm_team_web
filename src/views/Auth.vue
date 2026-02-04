<template>
    <div class="auth-page">
        <div class="auth-card">
            <div class="auth-header">
                <h2 class="title">{{ isLogin ? '登 录' : '注 册' }}</h2>
                <p class="subtitle">芝麻凑分 - 摸鱼组队</p>
            </div>

            <a-form :model="form" layout="vertical" @finish="handleSubmit">
                <a-form-item label="用户名" name="username" :rules="[{ required: true, message: '请输入用户名' }]">
                    <a-input v-model:value="form.username" placeholder="请输入您的账号" size="large" />
                </a-form-item>

                <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
                    <a-input-password v-model:value="form.password" placeholder="请输入您的密码" size="large" />
                </a-form-item>

                <a-button type="primary" block size="large" html-type="submit" class="auth-btn" :loading="loading">
                    {{ isLogin ? '立即登录' : '注册账号' }}
                </a-button>
            </a-form>

            <div class="auth-footer">
                <a-button type="link" @click="isLogin = !isLogin">
                    {{ isLogin ? '还早没有账号？去注册' : '已有账号？去登录' }}
                </a-button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { register, login } from '../api';

const router = useRouter();
const isLogin = ref(true);
const loading = ref(false);

const form = reactive({
    username: '',
    password: ''
});

const handleSubmit = async () => {
    loading.value = true;
    try {
        if (isLogin.value) {
            const res = await login(form);
            if (res.data.success) {
                message.success('登录成功');
                localStorage.setItem('sesame_token', res.data.data.token);
                localStorage.setItem('sesame_user', JSON.stringify(res.data.data.user));
                router.push('/');
            } else {
                message.error(res.data.message);
            }
        } else {
            const res = await register(form);
            if (res.data.success) {
                message.success('注册成功，请登录');
                isLogin.value = true;
            } else {
                message.error(res.data.message);
            }
        }
    } catch (err) {
        message.error('操作失败');
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.auth-page {
    min-height: calc(100vh - 200px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.auth-card {
    width: 100%;
    max-width: 400px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    padding: 40px;
    border-radius: 24px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.auth-header {
    text-align: center;
    margin-bottom: 32px;
}

.title {
    font-size: 28px;
    font-weight: 800;
    margin-bottom: 8px;
    color: #1e293b;
}

.subtitle {
    color: #64748b;
    font-size: 14px;
}

.auth-btn {
    height: 48px;
    border-radius: 12px;
    font-weight: 700;
    margin-top: 16px;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    border: none;
}

.auth-footer {
    text-align: center;
    margin-top: 24px;
}
</style>
