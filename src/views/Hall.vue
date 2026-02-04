<template>
    <div class="hall-page">
        <div class="page-tip">
            <h1 class="tip-title">芝麻分组队</h1>
            <p class="tip-subtitle">快速凑够 2026 分，一起解锁更多权益</p>
        </div>

        <div class="search-box">
            <a-input-search
                v-model:value="searchText"
                placeholder="搜索分数"
                enter-button="搜索"
                size="large"
                @search="onSearch"
            />
        </div>

        <div class="mode-filter">
            <a-radio-group v-model:value="filterMode" button-style="solid" @change="onSearch">
                <a-radio-button value="single">单人列表</a-radio-button>
                <a-radio-button value="duo">双人列表</a-radio-button>
            </a-radio-group>
        </div>

        <div class="list-container">
            <a-list
                :grid="{ gutter: 12, xs: 1, sm: 2, md: 3, lg: 3, xl: 3, xxl: 3 }"
                :data-source="list"
                :loading="loading"
            >
                <template #renderItem="{ item, index }">
                    <a-list-item>
                        <a-card hoverable class="grouping-card">
                            <div class="card-header">
                                <span class="serial-no">{{ getSerialNo(index) }}</span>
                                <span class="time">{{ formatTime(item.createdAt) }}</span>
                            </div>
                            <div class="card-body">
                                <div class="score-display">
                                    <span class="score-label">{{
                                        item.mode === 'single' ? '单人组队' : '双人组队'
                                    }}</span>
                                    <span class="score-value danger"
                                        >缺 {{ 2026 - item.scores.reduce((a, b) => a + b, 0) }}</span
                                    >
                                    <div class="publisher-scores">
                                        <span class="label">已有：</span>
                                        <span class="vals">{{ item.scores.join(' + ') }}</span>
                                    </div>
                                </div>
                                <div class="qr-preview" @click="handlePreview(item)">
                                    <img :src="item.qrCodes[0]" alt="qr" v-if="item.qrCodes && item.qrCodes[0]" />
                                    <div class="placeholder" v-else>
                                        <loading-outlined v-if="item.loading" />
                                        <span v-else>点击查看详情</span>
                                    </div>
                                </div>
                                <div class="card-footer-actions">
                                    <a-button type="primary" block @click="handleJoin(item)">立即加入</a-button>
                                    <a-popconfirm
                                        v-if="user?.isAdmin"
                                        title="确定要物理删除这条数据吗？"
                                        ok-text="确认"
                                        cancel-text="再想想"
                                        @confirm="handleAdminDelete(item.id)"
                                    >
                                        <a-button type="link" danger block class="admin-del-btn">删除条目</a-button>
                                    </a-popconfirm>
                                </div>
                            </div>
                        </a-card>
                    </a-list-item>
                </template>
            </a-list>
        </div>

        <div class="pagination pc-only">
            <a-pagination
                v-model:current="page"
                v-model:pageSize="pageSize"
                :total="total"
                simple
                @change="fetchData(false)"
            />
        </div>

        <div class="mobile-loading-tip" v-if="isMobile">
            <template v-if="loading"><loading-outlined /> 加载中...</template>
            <template v-else-if="!hasMore">已经到底啦</template>
            <template v-else>滑动加载更多</template>
        </div>

        <!-- Join Modal -->
        <a-modal
            v-model:open="modalVisible"
            :title="selectedItem?.mode === 'single' ? '加入单人组队' : '加入组队'"
            @ok="handleConfirmJoin"
            ok-text="确认加入"
            cancel-text="取消"
            width="600px"
        >
            <div class="join-modal-content" v-if="selectedItem">
                <div class="join-info-alert">
                    <div v-if="selectedItem.mode === 'single'">
                        对方：<span class="highlight">{{ selectedItem.scores[0] }}</span> 分 需要两人总分：<span
                            class="highlight danger"
                            >{{ 2026 - selectedItem.scores[0] }}</span
                        >
                        分
                    </div>
                    <div v-else>
                        需要
                        <span class="highlight danger">{{
                            2026 - selectedItem.scores.reduce((a, b) => a + b, 0)
                        }}</span>
                        分
                    </div>
                </div>

                <div class="join-form">
                    <div v-for="(scoreVal, index) in joinForm.scores" :key="index" class="person-form-item">
                        <h4 class="person-title">第{{ index === 0 ? '一' : '二' }}人信息</h4>
                        <div class="qr-uploader-wrapper">
                            <a-upload
                                list-type="picture-card"
                                class="avatar-uploader"
                                :show-upload-list="false"
                                :customRequest="() => {}"
                                @change="(info) => handleJoinUpload(info, index)"
                            >
                                <img
                                    v-if="joinForm.qrCodes[index]"
                                    :src="joinForm.qrCodes[index]"
                                    alt="qr"
                                    style="width: 100%"
                                />
                                <div v-else>
                                    <plus-outlined />
                                    <div style="margin-top: 8px">点此上传</div>
                                </div>
                            </a-upload>
                        </div>
                        <a-input-number
                            v-model:value="joinForm.scores[index]"
                            placeholder="信用分 350-950"
                            :min="350"
                            :max="950"
                            class="join-score-input"
                        />
                    </div>
                </div>
            </div>
        </a-modal>
    </div>
</template>

<script setup>
import { ref, onMounted, onActivated, onUnmounted } from 'vue';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { getGroupings, getGroupingDetails, deleteGrouping } from '../api';

const searchText = ref('');
const filterMode = ref('single');
const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const list = ref([]);
const loading = ref(false);
const isMobile = ref(window.innerWidth <= 640);
const hasMore = ref(true);
const user = ref(JSON.parse(localStorage.getItem('sesame_user') || 'null'));

// Modal state
const modalVisible = ref(false);
const selectedItem = ref(null);
const joinForm = ref({
    scores: [],
    qrCodes: []
});

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

const handleJoin = (item) => {
    selectedItem.value = item;
    joinForm.value = {
        scores: item.mode === 'single' ? [null, null] : [null],
        qrCodes: item.mode === 'single' ? ['', ''] : ['']
    };
    modalVisible.value = true;
};

const handleAdminDelete = async (id) => {
    try {
        const res = await deleteGrouping(id);
        if (res.data.success) {
            message.success('已从大厅物理删除');
            onSearch(); // Refresh list
        }
    } catch (err) {
        message.error('删除失败');
    }
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

const handleJoinUpload = async (info, index) => {
    if (info.file.status === 'done' || info.file.originFileObj) {
        const res = await validateQR(info.file.originFileObj);
        if (res.success) {
            joinForm.value.qrCodes[index] = res.data;
        } else {
            message.error('未检测到有效的二维码，请重新上传');
        }
    }
};

const handleConfirmJoin = async () => {
    if (joinForm.value.scores.some((s) => !s)) return message.warning('请填写完整信用分');
    if (joinForm.value.qrCodes.some((q) => !q)) return message.warning('请上传完整二维码');

    message.success('加入成功（模拟结果，待后端对接）');
    modalVisible.value = false;
};

const fetchData = async (loadMore = false) => {
    if (loading.value) return;
    if (loadMore && !hasMore.value) return;

    if (!loadMore) {
        page.value = 1;
        hasMore.value = true;
    } else {
        page.value++;
    }

    loading.value = true;
    try {
        const res = await getGroupings({
            page: page.value,
            pageSize: pageSize.value,
            mode: filterMode.value,
            score: searchText.value
        });
        if (res.data.success) {
            const newList = res.data.data.list;
            if (loadMore) {
                list.value = [...list.value, ...newList];
            } else {
                list.value = newList;
            }
            total.value = res.data.data.total;
            hasMore.value = list.value.length < total.value;
        }
    } catch (err) {
        console.error(err);
    } finally {
        loading.value = false;
    }
};

const handleScroll = () => {
    if (!isMobile.value) return;
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - 300) {
        fetchData(true);
    }
};

const onSearch = () => {
    fetchData(false);
};

const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${date.getMonth() + 1}-${date.getDate()}`;
};

const getSerialNo = (index) => {
    return (page.value - 1) * pageSize.value + index + 1;
};

onMounted(() => {
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', () => {
        isMobile.value = window.innerWidth <= 640;
    });
    fetchData();
});

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});

onActivated(fetchData);
</script>

<style scoped>
.hall-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.page-tip {
    text-align: center;
    padding: 20px 0;
}

.tip-title {
    font-size: 32px;
    font-weight: 800;
    color: #3b82f6; /* Matching the blue in the image */
    margin-bottom: 8px;
    letter-spacing: 2px;
}

.tip-subtitle {
    font-size: 18px;
    color: #64748b;
    font-weight: 500;
}

.search-box {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    padding: 24px;
    border-radius: 16px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
}

:deep(.ant-input-search .ant-input) {
    border-radius: 12px 0 0 12px !important;
    height: 48px;
    font-size: 16px;
    border-right: none;
}

:deep(.ant-input-search .ant-input-search-button) {
    border-radius: 0 12px 12px 0 !important;
    height: 48px;
    background: #4f46e5;
    border-color: #4f46e5;
    padding: 0 24px;
    margin-left: -1px;
}

.mode-filter {
    display: flex;
    justify-content: center;
}

:deep(.ant-radio-button-wrapper) {
    height: 40px;
    line-height: 38px;
    padding: 0 24px;
    font-weight: 600;
    border-radius: 10px !important;
    margin: 0 6px;
}

:deep(.ant-radio-button-wrapper:first-child) {
    border-inline-start: 1px solid #d9d9d9 !important;
}

.list-container {
    min-height: 400px;
}

.grouping-card {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid #f1f5f9;
    transition: all 0.3s ease;
    background: #fff;
}

.grouping-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1);
    border-color: rgba(79, 70, 229, 0.1);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
}

.card-header .serial-no {
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    font-family: 'Outfit', sans-serif;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
}

.card-header .time {
    font-size: 11px;
    color: #94a3b8;
}

.card-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.score-display {
    text-align: center;
    width: 100%;
}

.score-label {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 600;
    margin-bottom: 2px;
    display: block;
}

.score-value {
    font-size: 20px;
    font-weight: 800;
    color: #1e293b;
    font-family: 'Outfit', sans-serif;
    letter-spacing: -0.5px;
}

.publisher-scores {
    margin-top: 4px;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
}

.publisher-scores .label {
    font-weight: 500;
}

.publisher-scores .vals {
    font-weight: 700;
    color: #4f46e5;
}

.card-footer-actions {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
}

.admin-del-btn {
    height: 24px !important;
    padding: 0 !important;
    font-size: 11px !important;
}

@media (max-width: 640px) {
    .search-box {
        padding: 12px;
        margin-bottom: 0;
    }
    :deep(.ant-input-search .ant-input) {
        height: 40px;
        font-size: 14px;
    }
    :deep(.ant-input-search .ant-input-search-button) {
        height: 40px;
        padding: 0 16px;
    }
    .card-header {
        padding: 10px 12px;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        background: #f8fafc;
    }
    .card-header .serial-no {
        font-size: 11px;
        padding: 2px 8px;
        background: #e0f2fe;
        color: #0369a1;
        font-weight: 700;
        border-radius: 6px;
    }
    .card-header .time {
        font-size: 11px;
        color: #94a3b8;
    }
    .card-body {
        padding: 16px;
        gap: 12px;
    }
    .score-value {
        font-size: 24px !important;
        margin: 4px 0;
    }
    .score-label {
        font-size: 12px;
    }
    .publisher-scores {
        font-size: 12px;
    }
    :deep(.ant-btn-primary) {
        height: 38px !important;
        font-size: 14px !important;
        border-radius: 10px !important;
    }
}

.qr-preview {
    width: 100%;
    aspect-ratio: 1;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #f1f5f9;
}

.qr-preview img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 8px;
}

.placeholder {
    color: #cbd5e1;
    font-size: 13px;
    font-weight: 500;
}

.pagination {
    display: flex;
    justify-content: center;
    padding: 32px 0;
}

.mobile-loading-tip {
    text-align: center;
    padding: 20px 0;
    color: #94a3b8;
    font-size: 14px;
}

@media (max-width: 640px) {
    .pc-only {
        display: none !important;
    }
}

.score-value.danger {
    color: #ef4444;
}

.join-modal-content {
    padding: 12px 0;
}

.join-info-alert {
    background: #f0f9ff;
    border: 1px solid #e0f2fe;
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 24px;
    text-align: center;
    font-size: 16px;
    color: #334155;
    font-weight: 500;
}

.highlight {
    color: #4f46e5;
    font-weight: 700;
    font-size: 20px;
}

.highlight.danger {
    color: #ef4444;
}

.join-form {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.person-form-item {
    background: #f8fafc;
    padding: 20px;
    border-radius: 16px;
    border: 1px solid #f1f5f9;
}

.person-title {
    margin-bottom: 16px;
    color: #1e293b;
    font-weight: 700;
    font-size: 15px;
}

.qr-uploader-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
}

.join-score-input {
    width: 100%;
}

:deep(.ant-upload-select-picture-card) {
    border-radius: 12px !important;
    width: 120px !important;
    height: 120px !important;
}
</style>
