<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <div class="page-header">
        <h1>管理员账号</h1>
        <el-button type="primary" @click="openDialog()">+ 新增管理员</el-button>
      </div>

      <el-table :data="users" stripe style="margin-top:16px">
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="displayName" label="显示名" width="150" />
        <el-table-column prop="role" label="角色" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{row}">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{row}">{{ row.createdAt?.slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240">
          <template #default="{row}">
            <el-button size="small" @click="toggleStatus(row)">
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" @click="resetPwd(row)">重置密码</el-button>
            <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 新增/编辑弹窗 -->
      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="400px">
        <el-form :model="dialogForm" label-width="80px">
          <el-form-item label="用户名">
            <el-input v-model="dialogForm.username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="dialogForm.password" type="password" placeholder="最小6位" show-password />
          </el-form-item>
          <el-form-item label="显示名">
            <el-input v-model="dialogForm.displayName" placeholder="可选" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAdmin" :loading="saving">确定</el-button>
        </template>
      </el-dialog>

      <!-- 重置密码弹窗 -->
      <el-dialog v-model="pwdVisible" title="重置密码" width="360px">
        <el-form label-width="80px">
          <el-form-item label="新密码">
            <el-input v-model="newPassword" type="password" placeholder="最小6位" show-password />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="pwdVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmResetPwd" :loading="resetting">确定</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { getSysAdmins, createSysAdmin, resetSysAdminPassword, toggleSysAdminStatus, deleteSysAdmin } from '@/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';

const users = ref([]);
const dialogVisible = ref(false);
const dialogTitle = ref('新增管理员');
const saving = ref(false);
const dialogForm = reactive({ username: '', password: '', displayName: '' });

const pwdVisible = ref(false);
const resetting = ref(false);
const resetTarget = ref(null);
const newPassword = ref('');

onMounted(loadUsers);

async function loadUsers() {
  try { const res = await getSysAdmins(); users.value = res.data || []; } catch { /* ignore */ }
}

function openDialog() {
  dialogTitle.value = '新增管理员';
  dialogForm.username = ''; dialogForm.password = ''; dialogForm.displayName = '';
  dialogVisible.value = true;
}

async function saveAdmin() {
  if (!dialogForm.username || !dialogForm.password) {
    ElMessage.warning('用户名和密码为必填项'); return;
  }
  if (dialogForm.password.length < 6) {
    ElMessage.warning('密码至少6位'); return;
  }
  saving.value = true;
  try {
    await createSysAdmin({ username: dialogForm.username, password: dialogForm.password, displayName: dialogForm.displayName });
    ElMessage.success('创建成功');
    dialogVisible.value = false;
    loadUsers();
  } catch (e) {
    ElMessage.error(e.response?.data?.error?.message || '创建失败');
  } finally { saving.value = false; }
}

async function toggleStatus(row) {
  try {
    await toggleSysAdminStatus(row.id);
    loadUsers();
  } catch { /* ignore */ }
}

function resetPwd(row) {
  resetTarget.value = row;
  newPassword.value = '';
  pwdVisible.value = true;
}

async function confirmResetPwd() {
  if (!newPassword.value || newPassword.value.length < 6) {
    ElMessage.warning('密码至少6位'); return;
  }
  resetting.value = true;
  try {
    await resetSysAdminPassword(resetTarget.value.id, { password: newPassword.value });
    ElMessage.success('密码已重置');
    pwdVisible.value = false;
  } catch (e) {
    ElMessage.error(e.response?.data?.error?.message || '重置失败');
  } finally { resetting.value = false; }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定要删除管理员 "${row.username}" 吗？`, '确认', { type: 'warning' });
    await deleteSysAdmin(row.id);
    ElMessage.success('已删除');
    loadUsers();
  } catch { /* user cancelled */ }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.main { margin-left: 220px; padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
.page-header h1 { margin: 0; font-size: 20px; }
</style>
