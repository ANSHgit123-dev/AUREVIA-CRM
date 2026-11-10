import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { DEMO_USERS } from '../lib/mockData';
import { supabase, isSupabaseConfigured, isMockFallbackEnabled } from '../lib/supabase';
import { normalizeRole } from '../config/rbac';

interface ProvisionEmployeeInput {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  managerId?: string;
  assignedProjectIds: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  employees: UserProfile[];
  login: (email: string, password?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  switchRole: (newRole: UserRole) => void;
  provisionEmployee: (input: ProvisionEmployeeInput) => Promise<UserProfile>;
  toggleEmployeeStatus: (id: string) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<UserProfile>) => Promise<void>;
  refreshEmployees: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'aurevia_auth_session_v6';
const EMPLOYEES_STORAGE_KEY = 'aurevia_employees_directory_v6';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Directory of staff / employees
  const [employees, setEmployees] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEMO_USERS;
    } catch {
      return DEMO_USERS;
    }
  });

  // Current Logged-in User Session
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      return isMockFallbackEnabled ? DEMO_USERS[0] : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync employees to localStorage as fallback
  useEffect(() => {
    try {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
    } catch (e) {
      console.warn('Failed to save employees to localStorage:', e);
    }
  }, [employees]);

  // Sync user session to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save session to localStorage:', e);
    }
  }, [user]);

  // Fetch live profiles from Supabase
  const refreshEmployees = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const liveEmployees: UserProfile[] = data.map(p => ({
          id: p.id,
          orgId: p.org_id,
          email: p.email,
          fullName: p.full_name,
          phone: p.phone || '+91 98000 00000',
          role: normalizeRole(p.role as UserRole),
          isActive: p.is_active,
          managerId: p.reports_to || p.manager_id,
          assignedProjectIds: p.assigned_project_ids || [],
          createdAt: p.created_at,
          avatarUrl: p.avatar_url,
        }));
        setEmployees(liveEmployees);
      }
    } catch (err) {
      console.warn('Live employee directory fetch fallback:', err);
    }
  }, []);

  // Initial Supabase Session Check
  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Fetch live profile from supabase profiles table
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (!error && profile) {
              const liveUser: UserProfile = {
                id: profile.id,
                orgId: profile.org_id,
                email: profile.email,
                fullName: profile.full_name,
                phone: profile.phone || '+91 98000 00000',
                role: normalizeRole(profile.role as UserRole),
                isActive: profile.is_active,
                managerId: profile.reports_to || profile.manager_id,
                assignedProjectIds: profile.assigned_project_ids || [],
                createdAt: profile.created_at,
                avatarUrl: profile.avatar_url,
              };
              setUser(liveUser);
              await refreshEmployees();
            }
          }
        } catch (err) {
          console.warn('Supabase session fetch fallback:', err);
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, [refreshEmployees]);

  // 1. Email/Password Login
  const login = async (email: string, password = ''): Promise<UserProfile> => {
    const cleanEmail = email.trim().toLowerCase();

    // If Supabase is live and configured and NOT in mock fallback mode, try Supabase Auth first
    if (isSupabaseConfigured && supabase && !cleanEmail.endsWith('.demo') && !isMockFallbackEnabled) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data?.user) {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile && !profileErr) {
          if (!profile.is_active) {
            await supabase.auth.signOut();
            throw new Error('This employee account has been deactivated. Please contact your company administrator.');
          }

          const authedUser: UserProfile = {
            id: data.user.id,
            orgId: profile.org_id,
            email: cleanEmail,
            fullName: profile.full_name || data.user.user_metadata?.full_name || 'Aurevia User',
            phone: profile.phone || '+91 98000 00000',
            role: normalizeRole(profile.role || data.user.user_metadata?.role || 'sales_executive'),
            isActive: profile.is_active,
            managerId: profile.reports_to || profile.manager_id,
            assignedProjectIds: profile.assigned_project_ids || [],
            createdAt: profile.created_at || new Date().toISOString(),
          };

          setUser(authedUser);
          await refreshEmployees();
          return authedUser;
        }
      } else if (error) {
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }

    // Demo Mode Authentication (Permitted when in mock fallback or authenticating demo users)
    const existing = DEMO_USERS.find(d => d.email.toLowerCase() === cleanEmail) || employees.find(e => e.email.toLowerCase() === cleanEmail);
    if (existing) {
      if (!existing.isActive) {
        throw new Error('This employee account has been deactivated. Please contact your company administrator.');
      }
      setUser(existing);
      return existing;
    }

    // Fallback: If user enters e.g. "admin@aurevia.demo" or role prefix
    const roleMatch = DEMO_USERS.find(d => cleanEmail.includes(d.role.replace('_', '')) || d.email === cleanEmail);
    if (roleMatch) {
      setUser(roleMatch);
      return roleMatch;
    }

    // Default general sales consultant demo user
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      orgId: 'org-aurevia-mumbai',
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
      phone: '+91 98200 99887',
      role: 'sales_executive',
      isActive: true,
      assignedProjectIds: ['proj-grandeur', 'proj-greenfields'],
      createdAt: new Date().toISOString(),
    };

    setEmployees(prev => [newUser, ...prev]);
    setUser(newUser);
    return newUser;
  };

  // 2. Logout
  const logout = async () => {
    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signout failed:', e);
      }
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // 3. Password Reset
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        return { success: false, message: error.message };
      }
      return {
        success: true,
        message: `Password reset instructions have been dispatched to ${cleanEmail}.`,
      };
    }

    // Demo Mode notice
    return {
      success: true,
      message: `[DEMO MODE] Password reset email simulated for ${cleanEmail}. In production, Supabase Auth sends a verified email link.`,
    };
  };

  // 4. Role Switcher (Permitted in Demo Mode)
  const switchRole = (newRole: UserRole) => {
    if (isSupabaseConfigured && !isMockFallbackEnabled && !user?.email.endsWith('.demo')) {
      throw new Error('Role switching is disabled when connected to live production Supabase.');
    }
    const target = DEMO_USERS.find(d => d.role === newRole) || employees.find(e => e.role === newRole);
    if (target) {
      setUser(target);
    } else if (user) {
      setUser({ ...user, role: normalizeRole(newRole) });
    }
  };

  // 5. Employee Account Provisioning (Admin & Director only via Edge Function)
  const provisionEmployee = async (input: ProvisionEmployeeInput): Promise<UserProfile> => {
    if (user?.role !== 'company_admin' && user?.role !== 'director' && user?.role !== 'super_admin') {
      throw new Error('Unauthorized: Only Company Administrators and Directors can provision employee credentials.');
    }

    const cleanEmail = input.email.trim().toLowerCase();
    const existing = employees.find(e => e.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`An account with email ${cleanEmail} already exists.`);
    }

    const manager = employees.find(e => e.id === input.managerId);

    const newEmployee: UserProfile = {
      id: `usr-emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orgId: user.orgId || 'a0000000-0000-0000-0000-000000000000',
      email: cleanEmail,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      role: normalizeRole(input.role),
      isActive: true,
      managerId: input.managerId,
      managerName: manager?.fullName,
      assignedProjectIds: input.assignedProjectIds,
      createdAt: new Date().toISOString(),
    };

    // If Supabase live, invoke server-side Edge Function to create auth.users and profile atomically
    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('provision-employee', {
          body: {
            action: 'provision_employee',
            fullName: input.fullName.trim(),
            email: cleanEmail,
            phone: input.phone.trim(),
            role: input.role,
            managerId: input.managerId || null,
            assignedProjectIds: input.assignedProjectIds,
          },
        });

        if (error || (data && !data.success)) {
          throw new Error(data?.error || error?.message || 'Provisioning service call failed.');
        }

        if (data?.user?.id) {
          newEmployee.id = data.user.id;
        }
        await refreshEmployees();
      } catch (err: any) {
        throw new Error(`Employee provisioning failed: ${err.message}`);
      }
    }

    setEmployees(prev => [newEmployee, ...prev]);
    return newEmployee;
  };

  const toggleEmployeeStatus = async (id: string) => {
    const target = employees.find(e => e.id === id);
    if (!target) return;
    const newStatus = !target.isActive;

    setEmployees(prev =>
      prev.map(emp => (emp.id === id ? { ...emp, isActive: newStatus } : emp))
    );

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ is_active: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('Failed to update employee status in Supabase:', err);
      }
    }
  };

  const updateEmployee = async (id: string, updates: Partial<UserProfile>) => {
    setEmployees(prev =>
      prev.map(emp => (emp.id === id ? { ...emp, ...updates } : emp))
    );
    if (user && user.id === id) {
      setUser(prev => (prev ? { ...prev, ...updates } : null));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.managerId !== undefined) dbUpdates.reports_to = updates.managerId;
        if (updates.assignedProjectIds !== undefined) dbUpdates.assigned_project_ids = updates.assignedProjectIds;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

        await supabase.from('profiles').update(dbUpdates).eq('id', id);
      } catch (err) {
        console.warn('Failed to update employee in Supabase:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? normalizeRole(user.role) : 'sales_executive',
        isAuthenticated: !!user,
        isLoading,
        employees,
        login,
        logout,
        resetPassword,
        switchRole,
        provisionEmployee,
        toggleEmployeeStatus,
        updateEmployee,
        refreshEmployees,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
