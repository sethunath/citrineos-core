import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { config } from '../config/config';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  tenantId: number;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setTenantId: (tenantId: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,
      tenantId: config.tenant.defaultTenantId,

      login: async (username: string, password: string) => {
        // Simple authentication against env variables
        if (
          username === config.auth.username &&
          password === config.auth.password
        ) {
          set({ isAuthenticated: true, username });
          localStorage.setItem('tenantId', String(config.tenant.defaultTenantId));
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false, username: null });
        localStorage.removeItem('tenantId');
      },

      setTenantId: (tenantId: number) => {
        set({ tenantId });
        localStorage.setItem('tenantId', String(tenantId));
      },
    }),
    {
      name: 'citrineos-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        username: state.username,
        tenantId: state.tenantId,
      }),
    }
  )
);
