import apiClient from './api';
import { mockUsers, mockAuditLogs, mockAiModels, mockResearchAnalytics } from '../data/mockData';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const getStoredData = (key, defaultVal) => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  return JSON.parse(stored);
};

const saveStoredData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const adminService = {
  // Systems dashboard stats
  getSystemDashboard: async () => {
    try {
      const res = await apiClient.get('/admin/dashboard');
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn('[adminService] API system dashboard failed. Using local storage:', e.message);
    }

    await delay(250);
    const users = getStoredData('hf_users', mockUsers);
    const models = getStoredData('hf_models', mockAiModels);
    const datasets = getStoredData('hf_datasets', mockResearchAnalytics.datasets);
    const logs = getStoredData('hf_audit_logs', mockAuditLogs);
    return {
      usersCount: users.length,
      modelsCount: models.length,
      datasetsCount: datasets.length,
      logsCount: logs.length,
      recentLogs: logs.slice(0, 10).map((l) => ({
        id: l.id,
        user: l.user,
        role: l.user === 'System Admin' || l.user.includes('SysAdmin') ? 'system-admin' : l.user.includes('Admin') ? 'hospital-admin' : 'doctor',
        action: l.action,
        timestamp: l.timestamp.split(' ')[1] || l.timestamp,
        details: `${l.module} - status: ${l.status}`
      }))
    };
  },

  // Users management
  getUsers: async () => {
    try {
      const res = await apiClient.get('/admin/users');
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        saveStoredData('hf_users', res.data.data);
        return res.data.data;
      }
    } catch (e) {
      console.warn('[adminService] API getUsers failed. Using local storage:', e.message);
    }

    await delay(250);
    const data = getStoredData('hf_users', mockUsers);
    return data.map(u => ({
      ...u,
      active: u.active !== false,
      status: u.active === false ? 'Suspended' : 'Active'
    }));
  },

  toggleUserStatus: async (userId) => {
    try {
      const res = await apiClient.put(`/admin/users/${userId}/status`);
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        saveStoredData('hf_users', res.data.data);
        return res.data.data;
      }
    } catch (e) {
      console.warn('[adminService] API toggleUserStatus failed. Modifying local storage fallback:', e.message);
    }

    await delay(250);
    const users = getStoredData('hf_users', mockUsers);
    const index = users.findIndex(u => u.id === userId || u.userId === userId);
    if (index !== -1) {
      const active = users[index].active !== false;
      users[index].active = !active;
      saveStoredData('hf_users', users);
      
      adminService.logAction(
        'System Admin',
        `${!active ? 'Activated' : 'Deactivated'} User account ${users[index].name} (${users[index].role})`,
        'User Management',
        'Success'
      );
    }
    return users.map(u => ({
      ...u,
      active: u.active !== false,
      status: u.active === false ? 'Suspended' : 'Active'
    }));
  },

  addUser: async (userObj) => {
    return adminService.createUser(userObj);
  },

  updateUserRole: async (userId, newRole) => {
    try {
      const res = await apiClient.put(`/admin/users/${userId}/role`, { role: newRole });
      if (res.data && res.data.success) {
        return adminService.getUsers();
      }
    } catch (e) {
      console.warn('[adminService] API updateUserRole failed. Modifying local storage fallback:', e.message);
    }

    await delay(300);
    const users = getStoredData('hf_users', mockUsers);
    const index = users.findIndex(u => u.id === userId || u.userId === userId);
    if (index !== -1) {
      const oldRole = users[index].role;
      users[index].role = newRole;
      saveStoredData('hf_users', users);

      adminService.logAction(
        'System Admin',
        `Reassigned role of ${users[index].name} from ${oldRole} to ${newRole}`,
        'User Management',
        'Success'
      );
    }
    return users;
  },

  createUser: async (userObj) => {
    try {
      const res = await apiClient.post('/admin/users', userObj);
      if (res.data && res.data.success && res.data.data) {
        const users = getStoredData('hf_users', mockUsers);
        users.push(res.data.data);
        saveStoredData('hf_users', users);
        return res.data.data;
      }
    } catch (e) {
      console.warn('[adminService] API createUser failed. Modifying local storage fallback:', e.message);
    }

    await delay(350);
    const users = getStoredData('hf_users', mockUsers);
    const nextId = `U-${users.length + 101}`;
    
    const newUser = {
      id: nextId,
      active: true,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
      ...userObj
    };
    
    users.push(newUser);
    saveStoredData('hf_users', users);

    adminService.logAction(
      'System Admin',
      `Created new user ${newUser.name} with role ${newUser.role}`,
      'User Management',
      'Success'
    );
    
    return newUser;
  },

  // Audit Logs
  getAuditLogs: async () => {
    try {
      const res = await apiClient.get('/admin/audit-logs');
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (e) {
      console.warn('[adminService] API getAuditLogs failed. Using local storage:', e.message);
    }

    await delay(250);
    return getStoredData('hf_audit_logs', mockAuditLogs);
  },

  logAction: (user, action, module, status) => {
    const logs = getStoredData('hf_audit_logs', mockAuditLogs);
    const newLog = {
      id: `AL-${logs.length + 5801}`,
      user,
      action,
      module,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status
    };
    logs.unshift(newLog);
    saveStoredData('hf_audit_logs', logs);
  },

  // Datasets Management
  getDatasets: async () => {
    try {
      const res = await apiClient.get('/admin/datasets');
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (e) {
      console.warn('[adminService] API getDatasets failed. Using local storage:', e.message);
    }

    await delay(250);
    return getStoredData('hf_datasets', mockResearchAnalytics.datasets);
  },

  uploadDataset: async (fileMeta) => {
    try {
      const res = await apiClient.post('/admin/datasets', {
        name: fileMeta.name,
        recordsCount: fileMeta.recordsCount || 101766,
        format: fileMeta.format || 'CSV'
      });
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn('[adminService] API uploadDataset failed. Using local storage:', e.message);
    }

    await delay(800);
    const datasets = getStoredData('hf_datasets', mockResearchAnalytics.datasets);
    
    const newDataset = {
      id: `D-${new Date().getFullYear()}-${String.fromCharCode(65 + datasets.length)}`,
      version: `v1.0`,
      name: fileMeta.name,
      recordsCount: fileMeta.recordsCount || Math.floor(Math.random() * 50000) + 5000,
      format: fileMeta.format || 'CSV',
      status: 'Active',
      lastUpdated: new Date().toISOString().slice(0, 10)
    };

    datasets.unshift(newDataset);
    saveStoredData('hf_datasets', datasets);

    adminService.logAction(
      'System Admin',
      `Uploaded and validated medical dataset: ${newDataset.name}`,
      'Dataset Management',
      'Success'
    );

    return newDataset;
  },

  // AI Model Management
  getAiModels: async () => {
    try {
      const res = await apiClient.get('/admin/ai-models');
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (e) {
      console.warn('[adminService] API getAiModels failed. Using local storage:', e.message);
    }

    await delay(250);
    return getStoredData('hf_models', mockAiModels);
  },

  triggerModelAction: async (modelId, action) => {
    try {
      const res = await apiClient.post(`/admin/ai-models/${modelId}/action`, { action });
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        saveStoredData('hf_models', res.data.data);
        return res.data.data;
      }
    } catch (e) {
      console.warn('[adminService] API triggerModelAction failed. Using local storage fallback:', e.message);
    }

    await delay(800);
    
    const models = getStoredData('hf_models', mockAiModels);
    const index = models.findIndex(m => m.id === modelId);
    if (index === -1) throw new Error("Model not found");

    const modelName = models[index].name;

    if (action === 'train') {
      models[index].accuracy = parseFloat((models[index].accuracy + (Math.random() * 1.5 - 0.75)).toFixed(1));
      models[index].f1Score = parseFloat((models[index].f1Score + (Math.random() * 1.5 - 0.75)).toFixed(1));
      models[index].lastTrained = new Date().toISOString().slice(0, 10);
    } else if (action === 'deploy') {
      models.forEach((m, idx) => {
        if (m.status.includes('Active')) {
          m.status = 'Standby (Ready)';
        }
      });
      models[index].status = 'Active (Deployed)';
    } else if (action === 'rollback') {
      models[index].status = 'Standby (Ready)';
      models[0].status = 'Active (Deployed)';
    }

    saveStoredData('hf_models', models);
    
    adminService.logAction(
      'System Admin',
      `Triggered '${action}' action on AI Model: ${modelName}`,
      'AI Model Management',
      'Success'
    );

    return models;
  }
};
