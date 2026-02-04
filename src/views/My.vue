<template>
    <div class="my-page">
        <div class="user-profile">
            <a-avatar :size="64" class="avatar">
                <template #icon><user-outlined /></template>
            </a-avatar>
            <div class="info" v-if="user">
                <h2>{{ user.nickname }}</h2>
                <p>欢迎回来，您可以查看您的发布记录</p>
            </div>
        </div>

        <div class="history-section">
            <div class="section-header">
                <h3>我的发布</h3>
                <span class="count" v-if="list.length">共 {{ list.length }} 条</span>
            </div>

            <div v-if="list.length === 0 && !loading" class="empty-state">
                <a-empty description="暂无发布记录">
                    <a-button type="primary" @click="$router.push('/publish')">立即发布</a-button>
                </a-empty>
            </div>

            <a-list
                v-else
                :grid="{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }"
                :data-source="list"
                :loading="loading"
                class="history-list"
            >
                <template #renderItem="{ item }">
                    <a-list-item>
                        <a-card hoverable class="history-card">
                            <div class="card-header-top">
                                <span class="mode-tag" :class="item.mode">{{
                                    item.mode === 'single' ? '单人组队' : '双人组队'
                                }}</span>
                                <span class="date">{{ formatDate(item.createdAt) }}</span>
                            </div>
                            <div class="card-body-content">
                                <div class="scores-info-list">
                                    <div class="score-row" v-for="(s, idx) in item.scores" :key="idx">
                                        <span class="label">分值 {{ idx + 1 }}</span>
                                        <span class="value">{{ s }}</span>
                                    </div>
                                </div>
                                <div class="qr-preview-thumb" @click="handlePreview(item)">
                                    <img :src="item.qrCodes[0]" alt="qr" v-if="item.qrCodes && item.qrCodes[0]" />
                                    <div class="placeholder-small" v-else>
                                        <loading-outlined v-if="item.loading" />
                                        <span v-else>查看二维码</span>
                                    </div>
                                </div>
                            </div>
                            <div class="card-actions-footer">
                                <a-button type="link" @click="handleEdit(item)">
                                    <template #icon><edit-outlined /></template>编辑
                                </a-button>
                                <div class="footer-divider"></div>
                                <a-popconfirm
                                    title="确定要删除这条发布吗？"
                                    ok-text="确定"
                                    cancel-text="取消"
                                    @confirm="handleDelete(item.id)"
                                >
                                    <a-button type="link" danger>
                                        <template #icon><delete-outlined /></template>删除
                                    </a-button>
                                </a-popconfirm>
                            </div>
                        </a-card>
                    </a-list-item>
                </template>
            </a-list>
        </div>

        <!-- Edit Modal -->
        <a-modal
            v-model:open="editModalVisible"
            title="修改发布"
            @ok="handleConfirmUpdate"
            :confirmLoading="updateLoading"
            ok-text="保存修改"
            cancel-text="取消"
            width="550px"
        >
            <div class="edit-modal-body" v-if="editingItem">
                <div class="edit-item-row" v-for="(scoreVal, index) in editForm.scores" :key="index">
                    <h4 class="row-label">人员 {{ index + 1 }}</h4>
                    <div class="row-content">
                        <div class="qr-col">
                            <a-upload
                                list-type="picture-card"
                                class="edit-qr-uploader"
                                :show-upload-list="false"
                                :customRequest="() => {}"
                                @change="(info) => handleEditUpload(info, index)"
                            >
                                <img
                                    v-if="editForm.qrCodes[index]"
                                    :src="editForm.qrCodes[index]"
                                    alt="qr"
                                    class="qr-img-preview"
                                />
                                <div v-else class="upload-trigger">
                                    <plus-outlined />
                                    <span>重传</span>
                                </div>
                            </a-upload>
                        </div>
                        <div class="info-col">
                            <div class="score-input-box">
                                <span class="input-label">信用分：</span>
                                <a-input-number
                                    v-model:value="editForm.scores[index]"
                                    placeholder="350-950"
                                    :min="350"
                                    :max="950"
                                    class="score-number-input"
                                />
                            </div>
                            <p class="edit-tip-text">
                                注意：修改分数必须同步替换对应的二维码图片，否则会导致他人扫码失败。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </a-modal>
    </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { UserOutlined, LoadingOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { getGroupings, deleteGrouping, getGroupingDetails, updateGrouping } from '../api';

const router = useRouter();
const user = ref(null);
const list = ref([]);
const loading = ref(false);

// Edit Modal State
const editModalVisible = ref(false);
const updateLoading = ref(false);
const editingItem = ref(null);
const editForm = ref({
    scores: [],
    qrCodes: []
});

const checkAuth = () => {
    const userData = localStorage.getItem('sesame_user');
    if (!userData) {
        message.warning('请先登录');
        router.push('/auth');
        return;
    }
    user.value = JSON.parse(userData);
};

const fetchMyHistory = async () => {
    if (!user.value) return;
    loading.value = true;
    try {
        const res = await getGroupings({
            page: 1,
            pageSize: 50,
            userId: user.value.id
        });
        if (res.data.success) {
            list.value = res.data.data.list;
        }
    } catch (err) {
        console.error(err);
    } finally {
        loading.value = false;
    }
};

const handlePreview = async (item) => {
    if (item.qrCodes && item.qrCodes.length > 0) return;

    item.loading = true;
    try {
        const res = await getGroupingDetails(item.id);
        if (res.data.success) {
            item.qrCodes = res.data.data.qrCodes;
        }
    } catch (err) {
        message.error('获取详情失败');
    } finally {
        item.loading = false;
    }
};

const handleEdit = async (item) => {
    editingItem.value = item;

    // Fetch full details if qrCodes are missing (due to list optimization)
    if (!item.qrCodes || item.qrCodes.length === 0) {
        try {
            const res = await getGroupingDetails(item.id);
            if (res.data.success) {
                item.qrCodes = res.data.data.qrCodes;
            }
        } catch (err) {
            return message.error('获取数据失败');
        }
    }

    editForm.value = {
        scores: [...item.scores],
        qrCodes: [...item.qrCodes]
    };
    editModalVisible.value = true;
};

const validateQR = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    try {
                        // Regenerate clean QR code from content
                        const cleanDataUrl = await QRCode.toDataURL(code.data, {
                            margin: 2,
                            width: 400,
                            color: {
                                dark: '#000000',
                                light: '#ffffff'
                            }
                        });
                        resolve({ success: true, data: cleanDataUrl });
                    } catch (err) {
                        console.error('QR Regeneration failed:', err);
                        resolve({ success: true, data: e.target.result });
                    }
                } else {
                    resolve({ success: false });
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

const handleEditUpload = async (info, index) => {
    if (info.file.status === 'done' || info.file.originFileObj) {
        const res = await validateQR(info.file.originFileObj);
        if (res.success) {
            editForm.value.qrCodes[index] = res.data;
        } else {
            message.error('未检测到有效的二维码，请重新上传');
        }
    }
};

const handleConfirmUpdate = async () => {
    if (editForm.value.scores.some((s) => !s)) return message.warning('请填写完整评分');

    updateLoading.value = true;
    try {
        const res = await updateGrouping(editingItem.value.id, {
            scores: editForm.value.scores,
            qrCodes: editForm.value.qrCodes
        });
        if (res.data.success) {
            message.success('更新成功');
            editModalVisible.value = false;
            fetchMyHistory();
        }
    } catch (err) {
        message.error('更新失败');
    } finally {
        updateLoading.value = false;
    }
};

const handleDelete = async (id) => {
    try {
        const res = await deleteGrouping(id);
        if (res.data.success) {
            message.success('删除成功');
            fetchMyHistory();
        }
    } catch (err) {
        message.error('删除失败');
    }
};

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

onMounted(() => {
    checkAuth();
    fetchMyHistory();
});

onActivated(() => {
    checkAuth();
    fetchMyHistory();
});
</script>

<style scoped>
.my-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.user-profile {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    padding: 32px;
    border-radius: 24px;
    display: flex;
    align-items: center;
    gap: 24px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
}

.avatar {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    border: 4px solid #fff;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
    width: 72px !important;
    height: 72px !important;
    line-height: 64px !important;
}

.info h2 {
    margin: 0 0 4px;
    font-size: 24px;
    font-weight: 800;
    color: #1e293b;
    font-family: 'Outfit', sans-serif;
    letter-spacing: -0.5px;
}

.info p {
    margin: 0;
    color: #64748b;
    font-size: 14px;
}

.history-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;
}

.section-header h3 {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}

.count {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 600;
}

.history-card {
    border-radius: 20px;
    border: 1px solid #f1f5f9;
    transition: all 0.3s ease;
    background: #fff;
    overflow: hidden;
}

.history-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1);
}

.card-header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
}

.mode-tag {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 6px;
}

.mode-tag.single {
    background: rgba(79, 70, 229, 0.1);
    color: #4f46e5;
}

.mode-tag.duo {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.date {
    font-size: 11px;
    color: #94a3b8;
}

.card-body-content {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.scores-info-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.score-row {
    display: flex;
    flex-direction: column;
}

.score-row .label {
    font-size: 11px;
    color: #64748b;
    margin-bottom: 2px;
}

.score-row .value {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    font-family: 'Outfit', sans-serif;
}

.qr-preview-thumb {
    width: 64px;
    height: 64px;
    background: #f8fafc;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #f1f5f9;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.qr-preview-thumb img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 4px;
}

.placeholder-small {
    font-size: 10px;
    color: #94a3b8;
    text-align: center;
    line-height: 1.2;
}

.card-actions-footer {
    display: flex;
    padding: 8px 12px;
    background: #f8fafc;
    border-top: 1px solid #f1f5f9;
}

.card-actions-footer :deep(.ant-btn) {
    flex: 1;
    height: 32px;
    font-weight: 600;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.footer-divider {
    width: 1px;
    height: 16px;
    background: #e2e8f0;
    margin-top: 8px;
}

.empty-state {
    padding: 64px 32px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 24px;
    border: 2px dashed #e2e8f0;
}

/* Modal Styles */
/* Modal Styles */
.edit-modal-body {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 10px 0;
}

.edit-item-row {
    border-bottom: 1px dashed #f1f5f9;
    padding-bottom: 20px;
}

.edit-item-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.row-label {
    font-size: 15px;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 12px;
}

.row-content {
    display: flex;
    gap: 20px;
    align-items: flex-start;
}

.qr-col {
    flex: 0 0 102px;
}

.info-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.score-input-box {
    display: flex;
    align-items: center;
    gap: 8px;
}

.input-label {
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    white-space: nowrap;
}

.score-number-input {
    width: 140px !important;
}

.edit-tip-text {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.6;
    margin: 0;
}

.qr-img-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
}

.upload-trigger {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 12px;
    color: #64748b;
}

:deep(.edit-qr-uploader.ant-upload-select-picture-card) {
    width: 102px !important;
    height: 102px !important;
    margin: 0 !important;
    border-radius: 12px !important;
    overflow: hidden;
}
</style>
