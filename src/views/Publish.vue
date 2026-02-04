<template>
    <div class="publish-page">
        <div class="stats-card">
            <div class="stat-item">
                <span class="label">当前在线</span>
                <span class="value blue">{{ stats.online || 0 }}</span>
            </div>
            <div class="stat-item">
                <span class="label">单人待组</span>
                <span class="value blue">{{ stats.singleCount || 0 }}</span>
            </div>
            <div class="stat-item">
                <span class="label">双人待组</span>
                <span class="value blue">{{ stats.duoCount || 0 }}</span>
            </div>
        </div>

        <div class="mode-toggle">
            <a-radio-group v-model:value="mode" button-style="solid" size="large">
                <a-radio-button value="single">单人组队</a-radio-button>
                <a-radio-button value="duo">双人组队</a-radio-button>
            </a-radio-group>
        </div>

        <div class="upload-container">
            <div v-if="mode === 'single'" class="single-upload">
                <p class="upload-tip">请上传单人芝麻分二维码</p>
                <a-upload
                    name="file"
                    list-type="picture-card"
                    class="qr-uploader"
                    :show-upload-list="false"
                    @change="handleUpload"
                >
                    <div v-if="imageUrl">
                        <img :src="imageUrl" alt="qr" style="width: 100%" />
                    </div>
                    <div v-else>
                        <plus-outlined />
                        <div style="margin-top: 8px">上传二维码</div>
                    </div>
                </a-upload>
            </div>

            <div v-else class="duo-upload">
                <div class="upload-box">
                    <p class="upload-tip">人员1 二维码</p>
                    <a-upload
                        list-type="picture-card"
                        :show-upload-list="false"
                        @change="(info) => handleDuoUpload(info, 0)"
                    >
                        <img v-if="duoImages[0]" :src="duoImages[0]" alt="qr1" style="width: 100%" />
                        <div v-else>
                            <plus-outlined />
                            <div>人员1</div>
                        </div>
                    </a-upload>
                </div>
                <div class="upload-box">
                    <p class="upload-tip">人员2 二维码</p>
                    <a-upload
                        list-type="picture-card"
                        :show-upload-list="false"
                        @change="(info) => handleDuoUpload(info, 1)"
                    >
                        <img v-if="duoImages[1]" :src="duoImages[1]" alt="qr2" style="width: 100%" />
                        <div v-else>
                            <plus-outlined />
                            <div>人员2</div>
                        </div>
                    </a-upload>
                </div>
            </div>
        </div>

        <div class="score-input">
            <template v-if="mode === 'single'">
                <a-input-number
                    v-model:value="score"
                    :min="350"
                    :max="950"
                    placeholder="输入您的芝麻分"
                    style="width: 100%"
                    size="large"
                />
            </template>
            <div v-else class="duo-score-inputs">
                <a-input-number
                    v-model:value="duoScores[0]"
                    :min="350"
                    :max="950"
                    placeholder="输入人员1分值"
                    style="width: 100%"
                    size="large"
                />
                <a-input-number
                    v-model:value="duoScores[1]"
                    :min="350"
                    :max="950"
                    placeholder="输入人员2分值"
                    style="width: 100%"
                    size="large"
                />
            </div>
        </div>

        <div class="rules-box">
            <info-circle-outlined class="info-icon" />
            <div class="rules-content">
                <p>组队逻辑：单人模式将自动匹配2个单人或1对双人。</p>
                <p>如需快速匹配，建议确认分数准确。</p>
            </div>
        </div>

        <a-button type="primary" block size="large" class="submit-btn" :loading="loading" @click="handleSubmit">
            立即发布
        </a-button>

        <footer class="disclaimer">
            <h3>平台说明</h3>
            <p>1. 本平台仅提供匹配信息，不涉及任何交易。</p>
            <p>2. 请勿发布虚假信息，一旦发现永久封号。</p>
            <p>3. 请确保上传的二维码清晰且包含分数信息。</p>
        </footer>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { PlusOutlined, InfoCircleOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { getStats, createGrouping } from '../api';

const router = useRouter();
const user = ref(JSON.parse(localStorage.getItem('sesame_user') || 'null'));
const mode = ref('single');
const score = ref(null);
const duoScores = ref([null, null]);
const loading = ref(false);
const imageUrl = ref('');
const duoImages = ref(['', '']);
const stats = ref({ online: 0, singleCount: 0, duoCount: 0 });

const checkAuth = () => {
    if (!user.value) {
        message.warning('请先登录后发布');
        router.push('/auth');
        return false;
    }
    return true;
};

const fetchStats = async () => {
    try {
        const res = await getStats();
        if (res.data.success) {
            stats.value = res.data.data;
        }
    } catch (err) {
        console.error(err);
    }
};

onMounted(() => {
    fetchStats();
    setInterval(fetchStats, 10000);
});

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

const handleUpload = async (info) => {
    if (info.file.status === 'done' || info.file.originFileObj) {
        const res = await validateQR(info.file.originFileObj);
        if (res.success) {
            imageUrl.value = res.data;
        } else {
            message.error('未检测到有效的二维码，请重新上传');
        }
    }
};

const handleDuoUpload = async (info, index) => {
    if (info.file.status === 'done' || info.file.originFileObj) {
        const res = await validateQR(info.file.originFileObj);
        if (res.success) {
            duoImages.value[index] = res.data;
        } else {
            message.error('未检测到有效的二维码，请重新上传');
        }
    }
};

const handleSubmit = async () => {
    if (!checkAuth()) return;

    if (mode.value === 'single') {
        if (!score.value) return message.warning('请输入分数');
        if (!imageUrl.value) return message.warning('请上传二维码');
    } else {
        if (!duoScores.value[0] || !duoScores.value[1]) return message.warning('请输入两位人员的分数');
        if (!duoImages.value[0] || !duoImages.value[1]) return message.warning('请上传两位人员的二维码');
    }

    loading.value = true;
    try {
        const res = await createGrouping({
            mode: mode.value,
            scores: mode.value === 'single' ? [score.value] : [duoScores.value[0], duoScores.value[1]],
            qrCodes: mode.value === 'single' ? [imageUrl.value] : [duoImages.value[0], duoImages.value[1]],
            userId: user.value.id
        });
        if (res.data.success) {
            message.success('发布成功');
            // Reset
            score.value = null;
            imageUrl.value = '';
            duoImages.value = ['', ''];
            fetchStats();
            router.push('/hall');
        }
    } catch (err) {
        message.error('发布失败');
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.publish-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 800px;
    margin: 0 auto;
}

.stats-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    padding: 20px;
    border-radius: 16px;
    display: flex;
    justify-content: space-around;
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05);
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.2s ease;
}

.stat-item:hover {
    transform: translateY(-2px);
}

.stat-item .label {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 4px;
    font-weight: 500;
}

.stat-item .value {
    font-size: 24px;
    font-weight: 700;
    color: #4f46e5;
    font-family: 'Outfit', sans-serif;
}

.mode-toggle {
    display: flex;
    justify-content: center;
    margin-bottom: 8px;
}

:deep(.ant-radio-group-solid .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
    background: #4f46e5;
    border-color: #4f46e5;
}

:deep(.ant-radio-button-wrapper) {
    height: 44px;
    line-height: 42px;
    padding: 0 32px;
    font-weight: 600;
    border-radius: 12px !important;
    margin: 0 4px;
}

:deep(.ant-radio-button-wrapper:first-child) {
    border-inline-start: 1px solid #d9d9d9 !important;
}

.upload-container {
    background: #fff;
    padding: 40px;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 1px solid #f1f5f9;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.02);
}

.upload-tip {
    color: #1e293b;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 24px;
    text-align: center;
}

.qr-uploader :deep(.ant-upload-select-picture-card) {
    width: 180px;
    height: 180px;
    border-radius: 16px;
    background-color: #f8fafc;
    border: 2px dashed #e2e8f0;
    transition: all 0.3s ease;
}

.qr-uploader :deep(.ant-upload-select-picture-card:hover) {
    border-color: #4f46e5;
    background-color: rgba(79, 70, 229, 0.02);
}

.duo-upload {
    display: flex;
    gap: 32px;
}

.upload-box {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.score-input :deep(.ant-input-number) {
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
}

.score-input :deep(.ant-input-number-input) {
    height: 54px;
    font-size: 18px;
    font-weight: 600;
    text-align: center;
}

.rules-box {
    background: rgba(79, 70, 229, 0.05);
    border: 1px solid rgba(79, 70, 229, 0.1);
    padding: 16px;
    border-radius: 12px;
    display: flex;
    gap: 12px;
    font-size: 14px;
    color: #475569;
}

.info-icon {
    color: #4f46e5;
    margin-top: 3px;
    font-size: 16px;
}

.submit-btn {
    height: 56px;
    font-weight: 700;
    font-size: 18px;
    border-radius: 14px;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    border: none;
    box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
    transition: all 0.3s ease;
}

.submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 20px -3px rgba(79, 70, 229, 0.4);
    background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
}

.disclaimer {
    margin-top: 20px;
    padding: 24px;
    background: rgba(241, 245, 249, 0.5);
    border-radius: 16px;
    color: #64748b;
    font-size: 13px;
}

.disclaimer h3 {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 12px;
}

.disclaimer p {
    margin-bottom: 6px;
    line-height: 1.6;
}
.score-input {
    margin-top: 8px;
}

.duo-score-inputs {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
</style>
