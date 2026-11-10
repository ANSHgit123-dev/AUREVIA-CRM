import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Project, Tower, Unit, UnitStatus } from '../types';
import { INITIAL_PROJECTS, INITIAL_TOWERS, INITIAL_UNITS } from '../lib/mockData';
import { supabase, isSupabaseConfigured, isMockFallbackEnabled } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface InventoryStats {
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  bookedUnits: number;
  soldUnits: number;
  totalValueInr: number;
  availableValueInr: number;
  soldValueInr: number;
}

interface ProjectInventoryContextType {
  projects: Project[];
  towers: Tower[];
  units: Unit[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  isLoading: boolean;
  error: string | null;

  // Project CRUD
  addProject: (project: Omit<Project, 'id' | 'orgId'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Unit CRUD
  addUnit: (unit: Omit<Unit, 'id' | 'orgId' | 'totalPriceInr'>) => Promise<Unit>;
  updateUnit: (id: string, updates: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  reserveUnit: (unitId: string, leadName: string, durationHours?: number) => Promise<void>;
  releaseUnit: (unitId: string) => Promise<void>;
  updateUnitStatus: (unitId: string, status: UnitStatus) => Promise<void>;

  // Derived metrics
  getProjectStats: (projectId?: string) => InventoryStats;
  overallStats: InventoryStats;
  refreshInventory: () => Promise<void>;
}

const ProjectInventoryContext = createContext<ProjectInventoryContextType | undefined>(undefined);

const PROJECTS_STORAGE_KEY = 'aurevia_projects_v2';
const UNITS_STORAGE_KEY = 'aurevia_units_v2';
const TOWERS_STORAGE_KEY = 'aurevia_towers_v2';

export const ProjectInventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return [];
    try {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    } catch {
      return INITIAL_PROJECTS;
    }
  });

  const [towers, setTowers] = useState<Tower[]>(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return [];
    try {
      const saved = localStorage.getItem(TOWERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_TOWERS;
    } catch {
      return INITIAL_TOWERS;
    }
  });

  const [units, setUnits] = useState<Unit[]>(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return [];
    try {
      const saved = localStorage.getItem(UNITS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_UNITS;
    } catch {
      return INITIAL_UNITS;
    }
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Persistence to localStorage (strictly for offline demo mode)
  useEffect(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return;
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn('Failed to save projects to localStorage:', e);
    }
  }, [projects]);

  useEffect(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return;
    try {
      localStorage.setItem(TOWERS_STORAGE_KEY, JSON.stringify(towers));
    } catch (e) {
      console.warn('Failed to save towers to localStorage:', e);
    }
  }, [towers]);

  useEffect(() => {
    if (isSupabaseConfigured && !isMockFallbackEnabled) return;
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
    } catch (e) {
      console.warn('Failed to save units to localStorage:', e);
    }
  }, [units]);

  // Supabase Live Fetch (Phase 6.2.4: Clears stale mock data on empty array & surfaces errors)
  const refreshInventory = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    setIsLoading(true);
    setError(null);

    try {
      const [projRes, towerRes, unitRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: true }),
        supabase.from('towers').select('*').order('name', { ascending: true }),
        supabase.from('units').select('*').order('unit_number', { ascending: true }),
      ]);

      if (projRes.error) {
        if (!isMockFallbackEnabled) {
          setError(`Failed to load projects: ${projRes.error.message}`);
        }
      } else if (projRes.data) {
        if (projRes.data.length === 0 && isMockFallbackEnabled) {
          setProjects(prev => (prev.length > 0 ? prev : INITIAL_PROJECTS));
        } else {
          const liveProjects: Project[] = projRes.data.map(p => ({
            id: p.id,
            orgId: p.org_id,
            name: p.name,
            code: p.code,
            reraNumber: p.rera_number,
            locationArea: p.location_area,
            city: p.city,
            projectType: p.project_type,
            description: p.description || '',
            configurations: p.configurations || [],
            totalAreaAcres: Number(p.total_area_acres) || 0,
            totalUnits: p.total_units || 0,
            status: p.status,
            launchDate: p.launch_date || '',
            expectedCompletion: p.expected_completion || '',
            coverImageUrl: p.cover_image_url,
          }));
          setProjects(liveProjects);
        }
      }

      if (towerRes.error) {
        if (!isMockFallbackEnabled) {
          setError(prev => (prev ? `${prev}; Failed to load towers: ${towerRes.error!.message}` : `Failed to load towers: ${towerRes.error!.message}`));
        }
      } else if (towerRes.data) {
        if (towerRes.data.length === 0 && isMockFallbackEnabled) {
          setTowers(prev => (prev.length > 0 ? prev : INITIAL_TOWERS));
        } else {
          const liveTowers: Tower[] = towerRes.data.map(t => ({
            id: t.id,
            projectId: t.project_id,
            name: t.name,
            totalFloors: t.total_floors,
            totalUnits: t.total_units,
            reraPhaseNumber: t.rera_phase_number,
          }));
          setTowers(liveTowers);
        }
      }

      if (unitRes.error) {
        if (!isMockFallbackEnabled) {
          setError(prev => (prev ? `${prev}; Failed to load units: ${unitRes.error!.message}` : `Failed to load units: ${unitRes.error!.message}`));
        }
      } else if (unitRes.data) {
        if (unitRes.data.length === 0 && isMockFallbackEnabled) {
          setUnits(prev => (prev.length > 0 ? prev : INITIAL_UNITS));
        } else {
          const liveUnits: Unit[] = unitRes.data.map(u => ({
            id: u.id,
            orgId: u.org_id,
            projectId: u.project_id,
            projectName: u.project_name || '',
            towerId: u.tower_id,
            towerName: u.tower_name || '',
            unitNumber: u.unit_number,
            floorNumber: u.floor_number,
            typology: u.typology,
            facing: u.facing || '',
            carpetAreaSqft: Number(u.carpet_area_sqft) || 0,
            superBuiltupAreaSqft: Number(u.super_builtup_area_sqft) || 0,
            basePriceInr: Number(u.base_price_inr) || 0,
            plcInr: Number(u.plc_inr) || 0,
            parkingChargesInr: Number(u.parking_charges_inr) || 0,
            totalPriceInr: Number(u.total_price_inr) || (Number(u.base_price_inr) + Number(u.plc_inr) + Number(u.parking_charges_inr)),
            status: u.status,
            floorPlanUrl: u.floor_plan_url,
            reservedBy: u.reserved_by,
            reservedLeadName: u.reserved_lead_name,
            reservedUntil: u.reserved_until,
          }));
          setUnits(liveUnits);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory, user]);

  // Project CRUD with Transactional RPC (Phase 6.2.4)
  const addProject = async (projectData: Omit<Project, 'id' | 'orgId'>): Promise<Project> => {
    let newProject: Project;

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      // Transactional creation of Project + Default Tower (Phase 6.2.4)
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_project_with_tower_atomic', {
        p_name: projectData.name,
        p_code: projectData.code,
        p_rera_number: projectData.reraNumber,
        p_location_area: projectData.locationArea,
        p_city: projectData.city,
        p_project_type: projectData.projectType,
        p_description: projectData.description || '',
        p_configurations: projectData.configurations || [],
        p_total_area_acres: projectData.totalAreaAcres || null,
        p_total_units: projectData.totalUnits || 0,
        p_status: projectData.status,
        p_default_tower_name: 'Tower 1 - Primary',
        p_default_tower_floors: 10,
        p_cover_image_url: projectData.coverImageUrl || null,
      });

      if (rpcErr || !rpcRes?.success) {
        throw new Error(`Failed to create project in database: ${rpcErr?.message || 'Transaction failed'}`);
      }

      newProject = {
        ...projectData,
        id: rpcRes.project_id,
        orgId: rpcRes.org_id,
      };

      setTowers(prev => [
        ...prev,
        {
          id: rpcRes.tower_id,
          projectId: rpcRes.project_id,
          name: 'Tower 1 - Primary',
          totalFloors: 10,
          totalUnits: projectData.totalUnits || 20,
        },
      ]);
    } else {
      // Offline Demo Mode
      newProject = {
        ...projectData,
        id: `proj-${Date.now()}`,
        orgId: user?.orgId || 'org-demo-1',
      };

      const defaultTower: Tower = {
        id: `twr-${newProject.id}-1`,
        projectId: newProject.id,
        name: 'Tower 1 - Primary',
        totalFloors: 10,
        totalUnits: newProject.totalUnits || 20,
      };
      setTowers(prev => [...prev, defaultTower]);
    }

    setProjects(prev => [newProject, ...prev]);
    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.code !== undefined) dbUpdates.code = updates.code;
      if (updates.reraNumber !== undefined) dbUpdates.rera_number = updates.reraNumber;
      if (updates.locationArea !== undefined) dbUpdates.location_area = updates.locationArea;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.projectType !== undefined) dbUpdates.project_type = updates.projectType;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.configurations !== undefined) dbUpdates.configurations = updates.configurations;
      if (updates.totalAreaAcres !== undefined) dbUpdates.total_area_acres = updates.totalAreaAcres;
      if (updates.totalUnits !== undefined) dbUpdates.total_units = updates.totalUnits;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      // Verify affected row counts (Phase 6.2.4: Reject local state update if RLS filtered it out)
      const { data: updatedRows, error: updateErr } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', id)
        .select();

      if (updateErr) {
        throw new Error(`Failed to update project in database: ${updateErr.message}`);
      }
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Permission denied or project not found: Update rejected by security policy.');
      }
    }

    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
    if (updates.name) {
      setUnits(prev => prev.map(u => (u.projectId === id ? { ...u, projectName: updates.name! } : u)));
    }
  };

  const deleteProject = async (id: string) => {
    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      // Verify affected row counts (Phase 6.2.4: Reject local state update if RLS filtered it out)
      const { data: deletedRows, error: deleteErr } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .select();

      if (deleteErr) {
        throw new Error(`Failed to delete project from database: ${deleteErr.message}`);
      }
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error('Permission denied or project not found: Deletion rejected by security policy.');
      }
    }

    setProjects(prev => prev.filter(p => p.id !== id));
    setTowers(prev => prev.filter(t => t.projectId !== id));
    setUnits(prev => prev.filter(u => u.projectId !== id));
    if (selectedProjectId === id) {
      setSelectedProjectId('all');
    }
  };

  // Unit CRUD with Explicit Row Verification & Role Permission Guard (Phase 6.2.4)
  const addUnit = async (unitData: Omit<Unit, 'id' | 'orgId' | 'totalPriceInr'>): Promise<Unit> => {
    const base = Number(unitData.basePriceInr) || 0;
    const plc = Number(unitData.plcInr) || 0;
    const parking = Number(unitData.parkingChargesInr) || 0;
    const total = base + plc + parking;

    let newUnit: Unit = {
      ...unitData,
      id: `unit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orgId: user?.orgId || 'org-demo-1',
      totalPriceInr: total,
    };

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      // Database trigger automatically computes total_price_inr and sets org_id
      const { data, error: insertErr } = await supabase.from('units').insert({
        project_id: unitData.projectId,
        project_name: unitData.projectName,
        tower_id: unitData.towerId,
        tower_name: unitData.towerName,
        unit_number: unitData.unitNumber,
        floor_number: unitData.floorNumber,
        typology: unitData.typology,
        facing: unitData.facing,
        carpet_area_sqft: unitData.carpetAreaSqft,
        super_builtup_area_sqft: unitData.superBuiltupAreaSqft,
        base_price_inr: base,
        plc_inr: plc,
        parking_charges_inr: parking,
        status: unitData.status,
        floor_plan_url: unitData.floorPlanUrl,
      }).select().single();

      if (insertErr || !data) {
        throw new Error(`Failed to create unit in database: ${insertErr?.message || 'Database error'}`);
      }

      newUnit = {
        ...newUnit,
        id: data.id,
        orgId: data.org_id,
        totalPriceInr: Number(data.total_price_inr) || total,
      };
    }

    setUnits(prev => [newUnit, ...prev]);
    return newUnit;
  };

  const updateUnit = async (id: string, updates: Partial<Unit>) => {
    // Restrict sales executives from modifying unit pricing (Phase 6.2.4)
    if (
      user?.role === 'sales_executive' &&
      (updates.basePriceInr !== undefined || updates.plcInr !== undefined || updates.parkingChargesInr !== undefined)
    ) {
      throw new Error('Permission denied: Sales executives are not permitted to modify unit pricing. Contact management.');
    }

    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.basePriceInr !== undefined) dbUpdates.base_price_inr = updates.basePriceInr;
      if (updates.plcInr !== undefined) dbUpdates.plc_inr = updates.plcInr;
      if (updates.parkingChargesInr !== undefined) dbUpdates.parking_charges_inr = updates.parkingChargesInr;
      if (updates.reservedBy !== undefined) dbUpdates.reserved_by = updates.reservedBy;
      if (updates.reservedLeadName !== undefined) dbUpdates.reserved_lead_name = updates.reservedLeadName;
      if (updates.reservedUntil !== undefined) dbUpdates.reserved_until = updates.reservedUntil;

      // Verify affected row counts (Phase 6.2.4: Reject local state update if RLS filtered it out)
      const { data: updatedRows, error: updateErr } = await supabase
        .from('units')
        .update(dbUpdates)
        .eq('id', id)
        .select();

      if (updateErr) {
        throw new Error(`Failed to update unit in database: ${updateErr.message}`);
      }
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Permission denied or unit not found: Update rejected by security policy.');
      }
    }

    setUnits(prev =>
      prev.map(u => {
        if (u.id !== id) return u;
        const merged = { ...u, ...updates };
        const base = Number(merged.basePriceInr) || 0;
        const plc = Number(merged.plcInr) || 0;
        const parking = Number(merged.parkingChargesInr) || 0;
        merged.totalPriceInr = base + plc + parking;
        return merged;
      })
    );
  };

  const deleteUnit = async (id: string) => {
    if (isSupabaseConfigured && !isMockFallbackEnabled && supabase) {
      // Verify affected row counts (Phase 6.2.4: Reject local state update if RLS filtered it out)
      const { data: deletedRows, error: deleteErr } = await supabase
        .from('units')
        .delete()
        .eq('id', id)
        .select();

      if (deleteErr) {
        throw new Error(`Failed to delete unit from database: ${deleteErr.message}`);
      }
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error('Permission denied or unit not found: Deletion rejected by security policy.');
      }
    }

    setUnits(prev => prev.filter(u => u.id !== id));
  };

  const reserveUnit = async (unitId: string, leadName: string, durationHours: number = 24) => {
    const expiryDate = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
    await updateUnit(unitId, {
      status: 'reserved',
      reservedBy: user?.fullName || 'Sales Executive',
      reservedLeadName: leadName,
      reservedUntil: expiryDate,
    });
  };

  const releaseUnit = async (unitId: string) => {
    await updateUnit(unitId, {
      status: 'available',
      reservedBy: undefined,
      reservedLeadName: undefined,
      reservedUntil: undefined,
    });
  };

  const updateUnitStatus = async (unitId: string, status: UnitStatus) => {
    if (status === 'available') {
      await releaseUnit(unitId);
    } else {
      await updateUnit(unitId, { status });
    }
  };

  // Stats calculation
  const getProjectStats = (projectId?: string): InventoryStats => {
    const targetUnits = projectId && projectId !== 'all'
      ? units.filter(u => u.projectId === projectId)
      : units;

    let availableUnits = 0;
    let reservedUnits = 0;
    let bookedUnits = 0;
    let soldUnits = 0;
    let totalValueInr = 0;
    let availableValueInr = 0;
    let soldValueInr = 0;

    for (const u of targetUnits) {
      totalValueInr += u.totalPriceInr;
      if (u.status === 'available') {
        availableUnits++;
        availableValueInr += u.totalPriceInr;
      } else if (u.status === 'reserved') {
        reservedUnits++;
      } else if (u.status === 'booked') {
        bookedUnits++;
        soldValueInr += u.totalPriceInr;
      } else if (u.status === 'sold') {
        soldUnits++;
        soldValueInr += u.totalPriceInr;
      }
    }

    return {
      totalUnits: targetUnits.length,
      availableUnits,
      reservedUnits,
      bookedUnits,
      soldUnits,
      totalValueInr,
      availableValueInr,
      soldValueInr,
    };
  };

  const overallStats = useMemo(() => getProjectStats('all'), [units]);

  const value = {
    projects,
    towers,
    units,
    selectedProjectId,
    setSelectedProjectId,
    isLoading,
    error,
    addProject,
    updateProject,
    deleteProject,
    addUnit,
    updateUnit,
    deleteUnit,
    reserveUnit,
    releaseUnit,
    updateUnitStatus,
    getProjectStats,
    overallStats,
    refreshInventory,
  };

  return (
    <ProjectInventoryContext.Provider value={value}>
      {children}
    </ProjectInventoryContext.Provider>
  );
};

export const useProjectInventory = () => {
  const context = useContext(ProjectInventoryContext);
  if (!context) {
    throw new Error('useProjectInventory must be used within a ProjectInventoryProvider');
  }
  return context;
};
