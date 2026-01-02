
import { UserProfile, InstagramPost, AutomationRule, ActivityLog } from './types';

// Mock Database State
const DB = {
  users: [] as any[],
  igAccounts: [] as any[],
  rules: [] as AutomationRule[],
  logs: [] as ActivityLog[]
};

export const DatabaseService = {
  // User Management
  saveUser: (userData: any) => {
    DB.users.push(userData);
    return userData;
  },

  // Instagram Account Persistence
  linkIGAccount: (userId: string, accountData: any) => {
    const account = { ...accountData, userId, id: Math.random().toString(36).substr(2, 9) };
    DB.igAccounts.push(account);
    return account;
  },

  getAccountByUserId: (userId: string) => {
    return DB.igAccounts.find(acc => acc.userId === userId);
  },

  // Rules Persistence
  saveRule: (rule: AutomationRule) => {
    DB.rules.push(rule);
    return rule;
  },

  getRulesByPostId: (postId: string) => {
    return DB.rules.filter(r => r.postId === postId && r.active);
  },

  getAllRules: () => [...DB.rules],

  updateRule: (id: string, updates: Partial<AutomationRule>) => {
    const idx = DB.rules.findIndex(r => r.id === id);
    if (idx !== -1) DB.rules[idx] = { ...DB.rules[idx], ...updates };
  },

  deleteRule: (id: string) => {
    DB.rules = DB.rules.filter(r => r.id !== id);
  },

  // Logging
  logActivity: (log: ActivityLog) => {
    DB.logs.unshift(log);
    if (DB.logs.length > 100) DB.logs.pop();
  },

  getLogs: () => [...DB.logs]
};
