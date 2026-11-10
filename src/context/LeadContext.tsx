import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Lead,
  Activity,
  PipelineStage,
  ContactHistoryItem,
  LeadNote,
  FollowUpTask,
  ExecutivePerformance,
} from '../types';
import { MOCK_LEADS, MOCK_ACTIVITIES, MOCK_FOLLOWUPS, CURRENT_USER } from '../lib/mockData';
import { normalizePhoneNumber, getStageLabel, getSourceLabel } from '../lib/formatters';
import { supabase, isSupabaseConfigured, isMockFallbackEnabled } from '../lib/supabase';
import { useAuth } from './AuthContext';

export const SALES_EXECUTIVES = [
  'Vikram Mehta',
  'Arjun Verma',
  'Priya Nair',
  'Rohit Sharma',
  'Neha Patel',
];

export const PIPELINE_STAGES_ORDER: PipelineStage[] = [
  'new',
  'contacted',
  'qualified',
  'site_visit_scheduled',
  'site_visit_conducted',
  'negotiation',
  'token_paid',
  'booked',
  'lost',
];

export interface LeadStats {
  totalLeads: number;
  newLeadsToday: number;
  uncontactedLeads: number;
  qualifiedLeads: number;
  hotLeads: number;
  conversionRate: number;
}

export interface FollowUpStats {
  total: number;
  todayCount: number;
  upcomingCount: number;
  overdueCount: number;
  completedCount: number;
}

export interface StageSummary {
  stage: PipelineStage;
  count: number;
  totalValueInr: number;
  leads: Lead[];
}

interface LeadContextType {
  leads: Lead[];
  activities: Activity[];
  followUps: FollowUpTask[];
  salesExecutives: string[];
  leadStats: LeadStats;
  followUpStats: FollowUpStats;
  pipelineStagesSummary: StageSummary[];
  totalPipelineValueInr: number;
  executivePerformanceList: ExecutivePerformance[];

  // Lead Operations
  addLead: (leadData: Omit<Lead, 'id' | 'orgId' | 'createdAt'>) => Promise<Lead>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  updateLeadStage: (id: string, newStage: PipelineStage, reasonOrNote?: string) => Promise<void>;
  reassignLead: (id: string, newExecutiveName: string) => Promise<void>;
  addLeadNote: (leadId: string, content: string) => Promise<void>;
  logContactHistory: (leadId: string, item: Omit<ContactHistoryItem, 'id' | 'leadId'>) => Promise<void>;
  checkDuplicatePhone: (phone: string, excludeLeadId?: string) => Lead | undefined;
  getLeadById: (id: string) => Lead | undefined;

  // Follow-up Operations
  addFollowUp: (taskData: Omit<FollowUpTask, 'id' | 'createdAt'>) => Promise<FollowUpTask>;
  updateFollowUp: (id: string, updates: Partial<FollowUpTask>) => Promise<void>;
  completeFollowUp: (id: string, outcome: string) => Promise<void>;
  cancelFollowUp: (id: string, reason?: string) => Promise<void>;
  rescheduleFollowUp: (id: string, newDateTime: string, notes?: string) => Promise<void>;
  deleteFollowUp: (id: string) => Promise<void>;
  refreshLeads: () => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

const LEADS_STORAGE_KEY = 'aurevia_leads_v2';
const ACTIVITIES_STORAGE_KEY = 'aurevia_activities_v2';
const FOLLOWUPS_STORAGE_KEY = 'aurevia_followups_v2';

export const LeadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [leads, setLeads] = useState<Lead[]>(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return [];
    try {
      const saved = localStorage.getItem(LEADS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : MOCK_LEADS;
    } catch {
      return MOCK_LEADS;
    }
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return [];
    try {
      const saved = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : MOCK_ACTIVITIES;
    } catch {
      return MOCK_ACTIVITIES;
    }
  });

  const [followUps, setFollowUps] = useState<FollowUpTask[]>(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return [];
    try {
      const saved = localStorage.getItem(FOLLOWUPS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : MOCK_FOLLOWUPS;
    } catch {
      return MOCK_FOLLOWUPS;
    }
  });

  // LocalStorage Persistence as offline cache / demo mode only
  useEffect(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return;
    try {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
    } catch (e) {
      console.warn('Failed to save leads to localStorage:', e);
    }
  }, [leads]);

  useEffect(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return;
    try {
      localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
    } catch (e) {
      console.warn('Failed to save activities to localStorage:', e);
    }
  }, [activities]);

  useEffect(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return;
    try {
      localStorage.setItem(FOLLOWUPS_STORAGE_KEY, JSON.stringify(followUps));
    } catch (e) {
      console.warn('Failed to save follow-ups to localStorage:', e);
    }
  }, [followUps]);

  // Supabase Live Fetch (Phase 6.2.4: Clears stale mock state on empty array)
  const refreshLeads = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const [leadsRes, activitiesRes, followupsRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('lead_activities').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks_and_followups').select('*').order('scheduled_for', { ascending: true }),
      ]);

      if (leadsRes.data && leadsRes.data.length > 0) {
        const liveLeads: Lead[] = leadsRes.data.map(l => ({
          id: l.id,
          orgId: l.org_id,
          projectId: l.project_id,
          projectName: l.project_name || 'Aurevia Grand Reserve',
          firstName: l.first_name,
          lastName: l.last_name,
          phone: l.phone,
          email: l.email || '',
          budgetMinInr: Number(l.budget_min_inr) || 0,
          budgetMaxInr: Number(l.budget_max_inr) || 0,
          preferredTypology: l.preferred_typology || '3_BHK',
          source: l.source,
          priority: l.priority,
          currentStage: l.current_stage,
          assignedExecutiveName: l.assigned_executive_name || 'Unassigned',
          createdAt: l.created_at,
          lastContactedAt: l.last_contacted_at,
          nextFollowUpAt: l.next_follow_up_at,
          city: l.city,
        }));
        setLeads(liveLeads);
      } else if (isMockFallbackEnabled) {
        setLeads(prev => prev.length > 0 ? prev : MOCK_LEADS);
      }

      if (activitiesRes.data && activitiesRes.data.length > 0) {
        const liveActivities: Activity[] = activitiesRes.data.map(a => ({
          id: a.id,
          leadId: a.lead_id,
          leadName: a.lead_name || 'Client',
          actorName: a.actor_name || 'Staff',
          activityType: a.activity_type,
          title: a.title,
          description: a.description || '',
          createdAt: a.created_at,
        }));
        setActivities(liveActivities);
      } else if (isMockFallbackEnabled) {
        setActivities(prev => prev.length > 0 ? prev : MOCK_ACTIVITIES);
      }

      if (followupsRes.data && followupsRes.data.length > 0) {
        const liveFollowups: FollowUpTask[] = followupsRes.data.map(f => ({
          id: f.id,
          leadId: f.lead_id,
          leadName: f.lead_name || 'Client',
          leadPhone: f.lead_phone || '',
          assignedExecutiveName: f.assigned_executive_name || 'Sales Executive',
          projectName: f.project_name,
          scheduledFor: f.scheduled_for,
          activityType: f.activity_type,
          status: f.status,
          priority: f.priority || 'warm',
          remarks: f.remarks || '',
          completedAt: f.completed_at,
          completionOutcome: f.completion_outcome,
          createdAt: f.created_at,
        }));
        setFollowUps(liveFollowups);
      } else if (isMockFallbackEnabled) {
        setFollowUps(prev => prev.length > 0 ? prev : MOCK_FOLLOWUPS);
      }
    } catch (err) {
      console.warn('Supabase leads fetch fallback:', err);
    }
  }, []);

  useEffect(() => {
    refreshLeads();
  }, [refreshLeads, user]);

  // Duplicate Phone Detection Helper
  const checkDuplicatePhone = (phone: string, excludeLeadId?: string): Lead | undefined => {
    const normalized = normalizePhoneNumber(phone);
    if (!normalized || normalized.length < 7) return undefined;

    return leads.find(l => {
      if (excludeLeadId && l.id === excludeLeadId) return false;
      return normalizePhoneNumber(l.phone) === normalized;
    });
  };

  const getLeadById = (id: string): Lead | undefined => {
    return leads.find(l => l.id === id);
  };

  // Add Lead with explicit error handling & state rollback (CRIT-03)
  const addLead = async (leadData: Omit<Lead, 'id' | 'orgId' | 'createdAt'>): Promise<Lead> => {
    const orgId = user?.orgId || 'a0000000-0000-0000-0000-000000000000';
    const nowIso = new Date().toISOString();

    let newLead: Lead = {
      ...leadData,
      id: `ld-${Date.now()}`,
      orgId,
      createdAt: nowIso,
      notes: leadData.notes || [],
      contactHistory: leadData.contactHistory || [],
    };

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const { data, error } = await supabase.from('leads').insert({
        org_id: orgId,
        project_id: leadData.projectId,
        project_name: leadData.projectName,
        first_name: leadData.firstName,
        last_name: leadData.lastName,
        email: leadData.email,
        phone: leadData.phone,
        city: leadData.city || 'Bengaluru',
        budget_min_inr: leadData.budgetMinInr,
        budget_max_inr: leadData.budgetMaxInr,
        preferred_typology: leadData.preferredTypology,
        source: leadData.source,
        priority: leadData.priority,
        current_stage: leadData.currentStage,
        assigned_executive_name: leadData.assignedExecutiveName,
        last_contacted_at: leadData.lastContactedAt,
        next_follow_up_at: leadData.nextFollowUpAt,
      }).select().single();

      if (error || !data) {
        throw new Error(`Failed to save lead in database: ${error?.message || 'Database insert failed'}`);
      }

      newLead = {
        ...newLead,
        id: data.id,
      };

      // Record activity in database
      await supabase.from('lead_activities').insert({
        org_id: orgId,
        lead_id: data.id,
        lead_name: `${newLead.firstName} ${newLead.lastName}`,
        actor_name: user?.fullName || CURRENT_USER.fullName,
        activity_type: 'internal_note',
        title: `New Lead Ingested: ${newLead.firstName} ${newLead.lastName}`,
        description: `Ingested via ${getSourceLabel(newLead.source)} for ${newLead.projectName} (${newLead.preferredTypology}). Priority: ${newLead.priority.toUpperCase()}. Assigned to ${newLead.assignedExecutiveName}.`,
      });
    }

    // Commit to state only after database success
    setLeads(prev => [newLead, ...prev]);

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      leadId: newLead.id,
      leadName: `${newLead.firstName} ${newLead.lastName}`,
      actorName: user?.fullName || CURRENT_USER.fullName,
      activityType: 'internal_note',
      title: `New Lead Ingested: ${newLead.firstName} ${newLead.lastName}`,
      description: `Ingested via ${getSourceLabel(newLead.source)} for ${newLead.projectName} (${newLead.preferredTypology}). Priority: ${newLead.priority.toUpperCase()}. Assigned to ${newLead.assignedExecutiveName}.`,
      createdAt: nowIso,
    };
    setActivities(prev => [newActivity, ...prev]);

    if (newLead.nextFollowUpAt) {
      const initialTask: FollowUpTask = {
        id: `tsk-${Date.now()}`,
        leadId: newLead.id,
        leadName: `${newLead.firstName} ${newLead.lastName}`,
        leadPhone: newLead.phone,
        assignedExecutiveName: newLead.assignedExecutiveName,
        projectName: newLead.projectName,
        scheduledFor: newLead.nextFollowUpAt,
        activityType: 'phone_call',
        status: 'pending',
        priority: newLead.priority,
        remarks: `Introductory outreach and requirements discussion for ${newLead.preferredTypology}.`,
        createdAt: nowIso,
      };
      setFollowUps(prev => [initialTask, ...prev]);
    }

    return newLead;
  };

  // Update Lead with explicit database verification
  const updateLead = async (id: string, updates: Partial<Lead>) => {
    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.budgetMinInr !== undefined) dbUpdates.budget_min_inr = updates.budgetMinInr;
      if (updates.budgetMaxInr !== undefined) dbUpdates.budget_max_inr = updates.budgetMaxInr;
      if (updates.preferredTypology !== undefined) dbUpdates.preferred_typology = updates.preferredTypology;
      if (updates.source !== undefined) dbUpdates.source = updates.source;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.currentStage !== undefined) dbUpdates.current_stage = updates.currentStage;
      if (updates.assignedExecutiveName !== undefined) dbUpdates.assigned_executive_name = updates.assignedExecutiveName;
      if (updates.lastContactedAt !== undefined) dbUpdates.last_contacted_at = updates.lastContactedAt;
      if (updates.nextFollowUpAt !== undefined) dbUpdates.next_follow_up_at = updates.nextFollowUpAt;
      if (updates.city !== undefined) dbUpdates.city = updates.city;

      const { data: updatedRows, error } = await supabase.from('leads').update(dbUpdates).eq('id', id).select();
      if (error) {
        throw new Error(`Failed to update lead in database: ${error.message}`);
      }
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Permission denied or lead not found: Update rejected by security policy.');
      }
    }

    setLeads(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        return { ...l, ...updates };
      })
    );
  };

  // Delete Lead with database verification
  const deleteLead = async (id: string) => {
    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const { data: deletedRows, error } = await supabase.from('leads').delete().eq('id', id).select();
      if (error) {
        throw new Error(`Failed to delete lead from database: ${error.message}`);
      }
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error('Permission denied or lead not found: Deletion rejected by security policy.');
      }
    }

    setLeads(prev => prev.filter(l => l.id !== id));
    setActivities(prev => prev.filter(a => a.leadId !== id));
    setFollowUps(prev => prev.filter(f => f.leadId !== id));
  };

  // Update Lead Stage with database verification
  const updateLeadStage = async (id: string, newStage: PipelineStage, reasonOrNote?: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    const oldStage = lead.currentStage;
    if (oldStage === newStage) return;

    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const { error: stageErr } = await supabase.from('leads').update({
        current_stage: newStage,
        lost_reason: newStage === 'lost' ? (reasonOrNote || 'Lost') : null,
        last_contacted_at: nowIso,
        updated_at: nowIso,
      }).eq('id', id);

      if (stageErr) {
        throw new Error(`Failed to update lead stage in database: ${stageErr.message}`);
      }

      await supabase.from('lead_activities').insert({
        org_id: lead.orgId || user?.orgId || 'a0000000-0000-0000-0000-000000000000',
        lead_id: id,
        lead_name: `${lead.firstName} ${lead.lastName}`,
        actor_name: user?.fullName || CURRENT_USER.fullName,
        activity_type: 'stage_change',
        title: `Stage Changed: ${getStageLabel(newStage)}`,
        description: `Moved from ${getStageLabel(oldStage)} to ${getStageLabel(newStage)}${reasonOrNote ? ` — Note: ${reasonOrNote}` : ''}.`,
      });
    }

    setLeads(prev =>
      prev.map(l => (l.id === id ? { ...l, currentStage: newStage, lastContactedAt: nowIso } : l))
    );

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      leadId: id,
      leadName: `${lead.firstName} ${lead.lastName}`,
      actorName: user?.fullName || CURRENT_USER.fullName,
      activityType: 'stage_change',
      title: `Stage Changed: ${getStageLabel(newStage)}`,
      description: `Moved from ${getStageLabel(oldStage)} to ${getStageLabel(newStage)}${reasonOrNote ? ` — Note: ${reasonOrNote}` : ''}.`,
      createdAt: nowIso,
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  // Reassign Lead
  const reassignLead = async (id: string, newExecutiveName: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead || lead.assignedExecutiveName === newExecutiveName) return;

    const oldExecutive = lead.assignedExecutiveName;
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const { error } = await supabase.from('leads').update({
        assigned_executive_name: newExecutiveName,
        updated_at: nowIso,
      }).eq('id', id);

      if (error) {
        throw new Error(`Failed to reassign lead in database: ${error.message}`);
      }

      await supabase.from('lead_activities').insert({
        org_id: lead.orgId || user?.orgId || 'a0000000-0000-0000-0000-000000000000',
        lead_id: id,
        lead_name: `${lead.firstName} ${lead.lastName}`,
        actor_name: user?.fullName || CURRENT_USER.fullName,
        activity_type: 'internal_note',
        title: `Executive Reassigned: ${newExecutiveName}`,
        description: `Lead reassigned from ${oldExecutive} to ${newExecutiveName}.`,
      });
    }

    setLeads(prev =>
      prev.map(l => (l.id === id ? { ...l, assignedExecutiveName: newExecutiveName } : l))
    );

    setFollowUps(prev =>
      prev.map(f => (f.leadId === id ? { ...f, assignedExecutiveName: newExecutiveName } : f))
    );

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      leadId: id,
      leadName: `${lead.firstName} ${lead.lastName}`,
      actorName: user?.fullName || CURRENT_USER.fullName,
      activityType: 'internal_note',
      title: `Executive Reassigned: ${newExecutiveName}`,
      description: `Lead reassigned from ${oldExecutive} to ${newExecutiveName}.`,
      createdAt: nowIso,
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  // Add Note
  const addLeadNote = async (leadId: string, content: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const { error } = await supabase.from('lead_activities').insert({
        org_id: lead.orgId || user?.orgId || 'a0000000-0000-0000-0000-000000000000',
        lead_id: leadId,
        lead_name: `${lead.firstName} ${lead.lastName}`,
        actor_name: user?.fullName || CURRENT_USER.fullName,
        activity_type: 'internal_note',
        title: `Note Added by ${user?.fullName || CURRENT_USER.fullName}`,
        description: content,
      });

      if (error) {
        throw new Error(`Failed to add note to database: ${error.message}`);
      }
    }

    const newNote: LeadNote = {
      id: `note-${Date.now()}`,
      leadId,
      authorName: user?.fullName || CURRENT_USER.fullName,
      content,
      createdAt: nowIso,
    };

    setLeads(prev =>
      prev.map(l => (l.id === leadId ? { ...l, notes: [newNote, ...(l.notes || [])] } : l))
    );

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      leadId,
      leadName: `${lead.firstName} ${lead.lastName}`,
      actorName: user?.fullName || CURRENT_USER.fullName,
      activityType: 'internal_note',
      title: `Note Added by ${user?.fullName || CURRENT_USER.fullName}`,
      description: content,
      createdAt: nowIso,
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  // Log Contact History
  const logContactHistory = async (
    leadId: string,
    item: Omit<ContactHistoryItem, 'id' | 'leadId'>
  ) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const nowIso = item.date || new Date().toISOString();

    let actType: Activity['activityType'] = 'phone_call';
    if (item.type === 'whatsapp') actType = 'whatsapp_message';
    else if (item.type === 'site_visit' || item.type === 'meeting') actType = 'site_visit_update';

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const { error: leadErr } = await supabase.from('leads').update({
        last_contacted_at: nowIso,
      }).eq('id', leadId);

      if (leadErr) {
        throw new Error(`Failed to log contact in database: ${leadErr.message}`);
      }

      await supabase.from('lead_activities').insert({
        org_id: lead.orgId || user?.orgId || 'a0000000-0000-0000-0000-000000000000',
        lead_id: leadId,
        lead_name: `${lead.firstName} ${lead.lastName}`,
        actor_name: item.performedBy || user?.fullName || CURRENT_USER.fullName,
        activity_type: actType,
        title: `${item.type.toUpperCase()}: ${item.summary}`,
        description: item.outcome ? `Outcome: ${item.outcome}` : item.summary,
      });
    }

    const newHistoryItem: ContactHistoryItem = {
      ...item,
      id: `ch-${Date.now()}`,
      leadId,
    };

    setLeads(prev =>
      prev.map(l =>
        l.id === leadId
          ? {
              ...l,
              contactHistory: [newHistoryItem, ...(l.contactHistory || [])],
              lastContactedAt: nowIso,
            }
          : l
      )
    );

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      leadId,
      leadName: `${lead.firstName} ${lead.lastName}`,
      actorName: item.performedBy || user?.fullName || CURRENT_USER.fullName,
      activityType: actType,
      title: `${item.type.toUpperCase()}: ${item.summary}`,
      description: item.outcome ? `Outcome: ${item.outcome}` : item.summary,
      createdAt: nowIso,
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  // Follow-up Task Management
  const addFollowUp = async (taskData: Omit<FollowUpTask, 'id' | 'createdAt'>): Promise<FollowUpTask> => {
    const orgId = user?.orgId || 'a0000000-0000-0000-0000-000000000000';
    const nowIso = new Date().toISOString();

    let newTask: FollowUpTask = {
      ...taskData,
      id: `tsk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: nowIso,
    };

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const { data, error } = await supabase.from('tasks_and_followups').insert({
        org_id: orgId,
        lead_id: taskData.leadId,
        lead_name: taskData.leadName,
        lead_phone: taskData.leadPhone,
        project_name: taskData.projectName,
        assigned_executive_name: taskData.assignedExecutiveName,
        activity_type: taskData.activityType,
        priority: taskData.priority,
        scheduled_for: taskData.scheduledFor,
        status: taskData.status,
        remarks: taskData.remarks,
      }).select().single();

      if (error || !data) {
        throw new Error(`Failed to schedule follow-up in database: ${error?.message || 'Insert failed'}`);
      }

      newTask = {
        ...newTask,
        id: data.id,
      };

      await supabase.from('leads').update({
        next_follow_up_at: taskData.scheduledFor,
      }).eq('id', taskData.leadId);
    }

    setFollowUps(prev => [newTask, ...prev]);
    setLeads(prev =>
      prev.map(l => (l.id === taskData.leadId ? { ...l, nextFollowUpAt: taskData.scheduledFor } : l))
    );

    return newTask;
  };

  const updateFollowUp = async (id: string, updates: Partial<FollowUpTask>) => {
    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks;
      if (updates.completionOutcome !== undefined) dbUpdates.completion_outcome = updates.completionOutcome;
      if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
      if (updates.scheduledFor !== undefined) dbUpdates.scheduled_for = updates.scheduledFor;

      const { error } = await supabase.from('tasks_and_followups').update(dbUpdates).eq('id', id);
      if (error) {
        throw new Error(`Failed to update follow-up in database: ${error.message}`);
      }
    }

    setFollowUps(prev =>
      prev.map(f => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const completeFollowUp = async (id: string, outcome: string) => {
    const task = followUps.find(f => f.id === id);
    if (!task) return;

    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const { error } = await supabase.from('tasks_and_followups').update({
        status: 'completed',
        completed_at: nowIso,
        completion_outcome: outcome,
        updated_at: nowIso,
      }).eq('id', id);

      if (error) {
        throw new Error(`Failed to complete follow-up in database: ${error.message}`);
      }
    }

    setFollowUps(prev =>
      prev.map(f =>
        f.id === id
          ? {
              ...f,
              status: 'completed',
              completedAt: nowIso,
              completionOutcome: outcome,
            }
          : f
      )
    );

    let actType: Activity['activityType'] = 'phone_call';
    if (task.activityType === 'whatsapp_message') actType = 'whatsapp_message';
    else if (task.activityType === 'site_visit' || task.activityType === 'in_person_meeting') actType = 'site_visit_update';

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      leadId: task.leadId,
      leadName: task.leadName,
      actorName: task.assignedExecutiveName || user?.fullName || CURRENT_USER.fullName,
      activityType: actType,
      title: `Follow-up Completed: ${task.activityType.replace('_', ' ').toUpperCase()}`,
      description: `${task.remarks}${outcome ? ` — Outcome: ${outcome}` : ''}`,
      createdAt: nowIso,
    };
    setActivities(prev => [newActivity, ...prev]);

    const lead = leads.find(l => l.id === task.leadId);
    if (lead) {
      const contactItem: ContactHistoryItem = {
        id: `ch-${Date.now()}`,
        leadId: lead.id,
        type: task.activityType === 'whatsapp_message' ? 'whatsapp' : task.activityType === 'site_visit' ? 'site_visit' : 'call',
        summary: task.remarks,
        performedBy: task.assignedExecutiveName,
        date: nowIso,
        outcome: outcome || 'Completed successfully',
      };

      setLeads(prev =>
        prev.map(l =>
          l.id === lead.id
            ? {
                ...l,
                contactHistory: [contactItem, ...(l.contactHistory || [])],
                lastContactedAt: nowIso,
                nextFollowUpAt: l.nextFollowUpAt === task.scheduledFor ? undefined : l.nextFollowUpAt,
              }
            : l
        )
      );
    }
  };

  const cancelFollowUp = async (id: string, reason?: string) => {
    const task = followUps.find(f => f.id === id);
    if (!task) return;

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const { error } = await supabase.from('tasks_and_followups').update({
        status: 'cancelled',
        completion_outcome: reason || 'Cancelled by agent',
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (error) {
        throw new Error(`Failed to cancel follow-up in database: ${error.message}`);
      }
    }

    setFollowUps(prev =>
      prev.map(f =>
        f.id === id
          ? {
              ...f,
              status: 'cancelled',
              completionOutcome: reason || 'Cancelled by agent',
            }
          : f
      )
    );

    const lead = leads.find(l => l.id === task.leadId);
    if (lead && lead.nextFollowUpAt === task.scheduledFor) {
      setLeads(prev =>
        prev.map(l => (l.id === lead.id ? { ...l, nextFollowUpAt: undefined } : l))
      );
    }
  };

  const rescheduleFollowUp = async (id: string, newDateTime: string, notes?: string) => {
    const task = followUps.find(f => f.id === id);
    if (!task) return;

    const isOverdueNow = new Date(newDateTime).getTime() < Date.now();
    const newRemarks = notes ? `${task.remarks} [Rescheduled: ${notes}]` : task.remarks;

    if (isSupabaseConfigured && supabase) {
      const { error: tskErr } = await supabase.from('tasks_and_followups').update({
        scheduled_for: newDateTime,
        status: isOverdueNow ? 'overdue' : 'pending',
        remarks: newRemarks,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (tskErr) {
        throw new Error(`Failed to reschedule follow-up in database: ${tskErr.message}`);
      }

      await supabase.from('leads').update({
        next_follow_up_at: newDateTime,
      }).eq('id', task.leadId);
    }

    setFollowUps(prev =>
      prev.map(f =>
        f.id === id
          ? {
              ...f,
              scheduledFor: newDateTime,
              status: isOverdueNow ? 'overdue' : 'pending',
              remarks: newRemarks,
            }
          : f
      )
    );

    setLeads(prev =>
      prev.map(l => (l.id === task.leadId ? { ...l, nextFollowUpAt: newDateTime } : l))
    );
  };

  const deleteFollowUp = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('tasks_and_followups').delete().eq('id', id);
      if (error) {
        throw new Error(`Failed to delete follow-up from database: ${error.message}`);
      }
    }

    setFollowUps(prev => prev.filter(f => f.id !== id));
  };

  // Lead Dashboard KPIs
  const leadStats = useMemo<LeadStats>(() => {
    const totalLeads = leads.length;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const newLeadsToday = leads.filter(l => {
      try {
        return new Date(l.createdAt).getTime() >= oneDayAgo;
      } catch {
        return false;
      }
    }).length;

    const uncontactedLeads = leads.filter(
      l => l.currentStage === 'new' || !l.lastContactedAt
    ).length;

    const qualifiedLeads = leads.filter(
      l =>
        l.currentStage === 'qualified' ||
        l.currentStage === 'site_visit_scheduled' ||
        l.currentStage === 'site_visit_conducted' ||
        l.currentStage === 'negotiation' ||
        l.currentStage === 'token_paid' ||
        l.currentStage === 'booked'
    ).length;

    const hotLeads = leads.filter(l => l.priority === 'hot').length;

    const bookedCount = leads.filter(
      l => l.currentStage === 'booked' || l.currentStage === 'token_paid'
    ).length;

    const conversionRate = totalLeads > 0 ? (bookedCount / totalLeads) * 100 : 0;

    return {
      totalLeads,
      newLeadsToday,
      uncontactedLeads,
      qualifiedLeads,
      hotLeads,
      conversionRate,
    };
  }, [leads]);

  // Dynamic Follow-up Stats
  const followUpStats = useMemo<FollowUpStats>(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 3600 * 1000;

    let todayCount = 0;
    let upcomingCount = 0;
    let overdueCount = 0;
    let completedCount = 0;

    followUps.forEach(f => {
      if (f.status === 'completed') {
        completedCount++;
        return;
      }
      if (f.status === 'cancelled') {
        return;
      }

      const taskTime = new Date(f.scheduledFor).getTime();
      if (taskTime < Date.now() || f.status === 'overdue') {
        overdueCount++;
      } else if (taskTime >= startOfToday && taskTime < endOfToday) {
        todayCount++;
      } else if (taskTime >= endOfToday) {
        upcomingCount++;
      }
    });

    return {
      total: followUps.length,
      todayCount,
      upcomingCount,
      overdueCount,
      completedCount,
    };
  }, [followUps]);

  // Dynamic Pipeline Stages Summary (for all 9 stages)
  const pipelineStagesSummary = useMemo<StageSummary[]>(() => {
    return PIPELINE_STAGES_ORDER.map(stage => {
      const stageLeads = leads.filter(l => l.currentStage === stage);
      const totalVal = stageLeads.reduce((acc, curr) => acc + (curr.budgetMaxInr || curr.budgetMinInr || 0), 0);
      return {
        stage,
        count: stageLeads.length,
        totalValueInr: totalVal,
        leads: stageLeads,
      };
    });
  }, [leads]);

  const totalPipelineValueInr = useMemo(() => {
    return leads
      .filter(l => l.currentStage !== 'lost')
      .reduce((acc, curr) => acc + (curr.budgetMaxInr || curr.budgetMinInr || 0), 0);
  }, [leads]);

  // Dynamic Executive Performance Metrics
  const executivePerformanceList = useMemo<ExecutivePerformance[]>(() => {
    return SALES_EXECUTIVES.map(exec => {
      const assigned = leads.filter(l => l.assignedExecutiveName === exec);
      const contacted = assigned.filter(l => l.currentStage !== 'new' || Boolean(l.lastContactedAt));
      const qualified = assigned.filter(l =>
        ['qualified', 'site_visit_scheduled', 'site_visit_conducted', 'negotiation', 'token_paid', 'booked'].includes(l.currentStage)
      );
      const visits = assigned.filter(l =>
        ['site_visit_scheduled', 'site_visit_conducted', 'negotiation', 'token_paid', 'booked'].includes(l.currentStage)
      );
      const booked = assigned.filter(l => l.currentStage === 'booked' || l.currentStage === 'token_paid');

      const execFollowUps = followUps.filter(f => f.assignedExecutiveName === exec);
      const pendingFollowUps = execFollowUps.filter(f => f.status === 'pending' || f.status === 'overdue').length;
      const overdueFollowUps = execFollowUps.filter(f =>
        (f.status === 'overdue' || new Date(f.scheduledFor).getTime() < Date.now()) &&
        f.status !== 'completed' &&
        f.status !== 'cancelled'
      ).length;

      const totalSalesValueInr = booked.reduce((acc, curr) => acc + (curr.budgetMaxInr || 0), 0);
      const conversionRate = assigned.length > 0 ? (booked.length / assigned.length) * 100 : 0;

      return {
        executiveName: exec,
        assignedLeads: assigned.length,
        contactedLeads: contacted.length,
        qualifiedLeads: qualified.length,
        siteVisitsGenerated: visits.length,
        bookingsAchieved: booked.length,
        pendingFollowUps,
        overdueFollowUps,
        conversionRate,
        totalSalesValueInr,
      };
    });
  }, [leads, followUps]);

  return (
    <LeadContext.Provider
      value={{
        leads,
        activities,
        followUps,
        salesExecutives: SALES_EXECUTIVES,
        leadStats,
        followUpStats,
        pipelineStagesSummary,
        totalPipelineValueInr,
        executivePerformanceList,
        addLead,
        updateLead,
        deleteLead,
        updateLeadStage,
        reassignLead,
        addLeadNote,
        logContactHistory,
        checkDuplicatePhone,
        getLeadById,
        addFollowUp,
        updateFollowUp,
        completeFollowUp,
        cancelFollowUp,
        rescheduleFollowUp,
        deleteFollowUp,
        refreshLeads,
      }}
    >
      {children}
    </LeadContext.Provider>
  );
};

export const useLeads = () => {
  const context = useContext(LeadContext);
  if (!context) {
    throw new Error('useLeads must be used within a LeadProvider');
  }
  return context;
};
