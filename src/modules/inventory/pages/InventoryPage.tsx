import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Grid3X3,
  Filter,
  Search,
  Plus,
  Building,
  Layers,
  CheckCircle2,
  Clock,
  Receipt,
  Check,
  X,
  Edit2,
  Trash2,
  ShieldCheck,
  Info,
  DollarSign,
  Maximize2,
  Compass,
} from 'lucide-react';
import { useProjectInventory } from '../../../context/ProjectInventoryContext';
import { Unit, UnitStatus, UnitTypology } from '../../../types';
import { MetricCard } from '../../../components/common/MetricCard';
import { formatIndianCurrency } from '../../../lib/formatters';

export const InventoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get('project');

  const {
    projects,
    towers,
    units,
    selectedProjectId,
    setSelectedProjectId,
    addUnit,
    updateUnit,
    deleteUnit,
    reserveUnit,
    releaseUnit,
    updateUnitStatus,
    getProjectStats,
  } = useProjectInventory();

  // Active Project & Tower Selection
  const activeProjectId = queryProjectId || (selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id || '');
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const projectTowers = useMemo(() => {
    return towers.filter((t) => t.projectId === activeProjectId);
  }, [towers, activeProjectId]);

  const [activeTowerId, setActiveTowerId] = useState<string>(() => {
    return projectTowers[0]?.id || '';
  });

  // Ensure activeTowerId is valid if project switches
  const currentTower = useMemo(() => {
    return projectTowers.find((t) => t.id === activeTowerId) || projectTowers[0];
  }, [projectTowers, activeTowerId]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typologyFilter, setTypologyFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');

  // Selected Unit for Detail Modal
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Reserve Unit Modal State
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reservingUnit, setReservingUnit] = useState<Unit | null>(null);
  const [reserveLeadName, setReserveLeadName] = useState('');
  const [reserveDurationHours, setReserveDurationHours] = useState(24);

  // Add / Edit Unit Modal State
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitFormData, setUnitFormData] = useState({
    unitNumber: '',
    floorNumber: 1,
    typology: '3_BHK' as UnitTypology,
    facing: 'Sea Facing',
    carpetAreaSqft: 1650,
    superBuiltupAreaSqft: 2200,
    basePriceInr: 45000000,
    plcInr: 2000000,
    parkingChargesInr: 1000000,
    status: 'available' as UnitStatus,
  });

  // Current Project & Tower Units
  const towerUnits = useMemo(() => {
    if (!currentTower) return [];
    return units.filter((u) => u.projectId === activeProjectId && u.towerId === currentTower.id);
  }, [units, activeProjectId, currentTower]);

  // Project Level Stats
  const projectStats = useMemo(() => {
    return getProjectStats(activeProjectId);
  }, [getProjectStats, activeProjectId, units]);

  // Extract distinct floors in descending order for the stacking matrix (top floor down to ground floor)
  const availableFloors = useMemo(() => {
    const floorsSet = new Set<number>();
    towerUnits.forEach((u) => floorsSet.add(u.floorNumber));
    return Array.from(floorsSet).sort((a, b) => b - a);
  }, [towerUnits]);

  // Filtered units according to search and dropdowns
  const filteredUnits = useMemo(() => {
    return towerUnits.filter((u) => {
      const matchesSearch =
        u.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.typology.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.facing.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      const matchesTypology = typologyFilter === 'all' || u.typology === typologyFilter;
      const matchesFloor = floorFilter === 'all' || u.floorNumber.toString() === floorFilter;

      return matchesSearch && matchesStatus && matchesTypology && matchesFloor;
    });
  }, [towerUnits, searchQuery, statusFilter, typologyFilter, floorFilter]);

  // Group units by floor for the Stacking Matrix
  const floorStackMap = useMemo(() => {
    const map = new Map<number, Unit[]>();
    availableFloors.forEach((floor) => {
      const floorUnits = filteredUnits
        .filter((u) => u.floorNumber === floor)
        .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
      if (floorUnits.length > 0) {
        map.set(floor, floorUnits);
      }
    });
    return map;
  }, [availableFloors, filteredUnits]);

  // Status Styling Helpers
  const getStatusBadge = (status: UnitStatus) => {
    switch (status) {
      case 'available':
        return {
          label: 'Available',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotClass: 'bg-emerald-500',
          borderClass: 'border-[#E5E8EB] hover:border-emerald-500',
        };
      case 'reserved':
        return {
          label: 'Reserved',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          dotClass: 'bg-amber-500',
          borderClass: 'border-[#E5E8EB] hover:border-amber-500',
        };
      case 'booked':
        return {
          label: 'Booked',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          dotClass: 'bg-blue-500',
          borderClass: 'border-[#E5E8EB] hover:border-blue-500',
        };
      case 'sold':
        return {
          label: 'Sold',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          dotClass: 'bg-slate-500',
          borderClass: 'border-[#E5E8EB] hover:border-slate-400 opacity-80',
        };
    }
  };

  const handleOpenAddUnitModal = () => {
    setEditingUnit(null);
    setUnitFormData({
      unitNumber: `${currentTower?.name.charAt(6) || 'A'}-${Math.floor(1 + Math.random() * 9)}01`,
      floorNumber: 5,
      typology: '3_BHK',
      facing: 'Sea Facing',
      carpetAreaSqft: 1650,
      superBuiltupAreaSqft: 2200,
      basePriceInr: 48000000,
      plcInr: 2000000,
      parkingChargesInr: 1000000,
      status: 'available',
    });
    setIsUnitFormOpen(true);
  };

  const handleOpenEditUnitModal = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitFormData({
      unitNumber: unit.unitNumber,
      floorNumber: unit.floorNumber,
      typology: unit.typology,
      facing: unit.facing,
      carpetAreaSqft: unit.carpetAreaSqft,
      superBuiltupAreaSqft: unit.superBuiltupAreaSqft,
      basePriceInr: unit.basePriceInr,
      plcInr: unit.plcInr,
      parkingChargesInr: unit.parkingChargesInr,
      status: unit.status,
    });
    setIsUnitFormOpen(true);
  };

  const handleUnitFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTower || !activeProject) return;

    if (editingUnit) {
      updateUnit(editingUnit.id, {
        ...unitFormData,
        floorNumber: Number(unitFormData.floorNumber),
        carpetAreaSqft: Number(unitFormData.carpetAreaSqft),
        superBuiltupAreaSqft: Number(unitFormData.superBuiltupAreaSqft),
        basePriceInr: Number(unitFormData.basePriceInr),
        plcInr: Number(unitFormData.plcInr),
        parkingChargesInr: Number(unitFormData.parkingChargesInr),
      });
      // Update selectedUnit if currently inspecting
      if (selectedUnit && selectedUnit.id === editingUnit.id) {
        setSelectedUnit((prev) => (prev ? { ...prev, ...unitFormData } : null));
      }
    } else {
      addUnit({
        projectId: activeProject.id,
        projectName: activeProject.name,
        towerId: currentTower.id,
        towerName: currentTower.name,
        ...unitFormData,
        floorNumber: Number(unitFormData.floorNumber),
        carpetAreaSqft: Number(unitFormData.carpetAreaSqft),
        superBuiltupAreaSqft: Number(unitFormData.superBuiltupAreaSqft),
        basePriceInr: Number(unitFormData.basePriceInr),
        plcInr: Number(unitFormData.plcInr),
        parkingChargesInr: Number(unitFormData.parkingChargesInr),
      });
    }
    setIsUnitFormOpen(false);
  };

  const handleOpenReserveModal = (unit: Unit) => {
    setReservingUnit(unit);
    setReserveLeadName('Rajesh Singhania');
    setReserveDurationHours(24);
    setIsReserveModalOpen(true);
  };

  const handleConfirmReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (reservingUnit && reserveLeadName) {
      reserveUnit(reservingUnit.id, reserveLeadName, reserveDurationHours);
      if (selectedUnit && selectedUnit.id === reservingUnit.id) {
        setSelectedUnit((prev) =>
          prev
            ? {
                ...prev,
                status: 'reserved',
                reservedLeadName: reserveLeadName,
                reservedBy: 'Vikram Mehta',
              }
            : null
        );
      }
      setIsReserveModalOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Project Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-lg font-semibold text-[#1C2024] tracking-tight">Property Unit Inventory</h1>
          <p className="text-xs text-[#60646C] mt-0.5">
            Elevation stacking chart, live unit reservations, and inventory pricing.
          </p>
        </div>

        {/* Project Switcher Selector */}
        <div className="flex items-center space-x-2">
          <select
            value={activeProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              const newTowers = towers.filter((t) => t.projectId === e.target.value);
              if (newTowers[0]) setActiveTowerId(newTowers[0].id);
            }}
            className="px-2.5 py-1.5 text-xs font-medium bg-white border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.city})
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenAddUnitModal}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#1E293B] text-white rounded text-xs font-medium hover:bg-[#0F172A] transition shrink-0"
          >
            <Plus size={13} />
            <span>Add Unit</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <MetricCard
          title="Total Units"
          value={projectStats.totalUnits.toString()}
          subtitle="Configured in Tower"
          icon={Layers}
        />
        <MetricCard
          title="Available Stock"
          value={projectStats.availableUnits.toString()}
          subtitle={formatIndianCurrency(projectStats.availableValueInr)}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Reserved on Hold"
          value={projectStats.reservedUnits.toString()}
          subtitle="Temporary locks (48h)"
          icon={Clock}
        />
        <MetricCard
          title="Booked Units"
          value={projectStats.bookedUnits.toString()}
          subtitle="Token received"
          icon={Receipt}
        />
        <MetricCard
          title="Sold & Registered"
          value={projectStats.soldUnits.toString()}
          subtitle="Agreements executed"
          icon={ShieldCheck}
        />
      </div>

      {/* Tower Selector Tabs */}
      <div className="flex items-center space-x-1 border-b border-[#E5E8EB] overflow-x-auto">
        <span className="text-[11px] font-semibold text-[#80848D] uppercase tracking-wider mr-2 shrink-0">
          Towers:
        </span>
        {projectTowers.map((tower) => {
          const isActive = tower.id === currentTower?.id;
          return (
            <button
              key={tower.id}
              onClick={() => setActiveTowerId(tower.id)}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-medium border-b-2 transition shrink-0 ${
                isActive
                  ? 'border-[#1E293B] text-[#1C2024] font-semibold'
                  : 'border-transparent text-[#60646C] hover:text-[#1C2024]'
              }`}
            >
              <Building size={13} className={isActive ? 'text-[#1E293B]' : 'text-[#80848D]'} />
              <span>{tower.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-[#F1F3F5] text-[#60646C]">
                {units.filter((u) => u.projectId === activeProjectId && u.towerId === tower.id).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-md border border-[#E5E8EB] p-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#80848D]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search unit number (e.g. A-1401), facing, or typology..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] placeholder-[#80848D] focus:outline-none focus:border-[#1E293B] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter size={13} className="text-[#80848D] shrink-0" />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="booked">Booked</option>
            <option value="sold">Sold</option>
          </select>

          {/* Typology Filter */}
          <select
            value={typologyFilter}
            onChange={(e) => setTypologyFilter(e.target.value)}
            className="px-2 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
          >
            <option value="all">All Typologies</option>
            <option value="2_BHK">2 BHK</option>
            <option value="2.5_BHK">2.5 BHK</option>
            <option value="3_BHK">3 BHK</option>
            <option value="3.5_BHK">3.5 BHK</option>
            <option value="4_BHK">4 BHK</option>
            <option value="penthouse">Penthouse</option>
            <option value="duplex">Duplex</option>
          </select>

          {/* Floor Filter */}
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="px-2 py-1.5 text-xs bg-[#F8F9FA] border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
          >
            <option value="all">All Floors</option>
            {availableFloors.map((floor) => (
              <option key={floor} value={floor.toString()}>
                Floor {floor}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stacking Matrix Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs bg-white px-3.5 py-2 rounded-md border border-[#E5E8EB]">
        <span className="text-[11px] font-semibold text-[#60646C]">Legend:</span>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[#60646C]">Available ({projectStats.availableUnits})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[#60646C]">Reserved ({projectStats.reservedUnits})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-[#60646C]">Booked ({projectStats.bookedUnits})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="text-[#60646C]">Sold ({projectStats.soldUnits})</span>
          </div>
        </div>
      </div>

      {/* THE INTERACTIVE FLOOR-WISE STACKING MATRIX */}
      <div className="bg-white rounded-md border border-[#E5E8EB] p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E8EB]">
          <div>
            <h3 className="text-xs font-semibold text-[#1C2024] uppercase tracking-wider">
              {currentTower ? `${currentTower.name} — Elevation Chart` : 'Elevation Chart'}
            </h3>
            <p className="text-[11px] text-[#60646C] mt-0.5">
              Top to ground floor arrangement. Click any cell to view specs or place a hold.
            </p>
          </div>
        </div>

        {floorStackMap.size === 0 ? (
          <div className="py-12 text-center text-[#80848D]">
            <Grid3X3 size={28} className="mx-auto mb-1.5 opacity-40" />
            <p className="text-xs">No units found matching current filter selection.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from(floorStackMap.entries()).map(([floor, floorUnits]) => (
              <div
                key={floor}
                className="flex items-center space-x-3 p-2 rounded border border-[#E5E8EB] bg-[#F8F9FA]"
              >
                {/* Floor Indicator Badge */}
                <div className="w-14 shrink-0 text-center">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#1E293B] text-white">
                    FL {floor < 10 ? '0' + floor : floor}
                  </span>
                </div>

                {/* Units on this Floor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 flex-1">
                  {floorUnits.map((unit) => {
                    const badge = getStatusBadge(unit.status);
                    return (
                      <button
                        key={unit.id}
                        onClick={() => setSelectedUnit(unit)}
                        className={`text-left p-2.5 rounded border bg-white hover:border-[#1E293B] transition relative overflow-hidden group cursor-pointer ${badge.borderClass}`}
                      >
                        {/* Status color indicator bar on top */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-0.5 ${
                            unit.status === 'available'
                              ? 'bg-emerald-500'
                              : unit.status === 'reserved'
                              ? 'bg-amber-500'
                              : unit.status === 'booked'
                              ? 'bg-blue-500'
                              : 'bg-slate-400'
                          }`}
                        />

                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-semibold text-[#1C2024] font-mono tracking-tight">
                              {unit.unitNumber}
                            </span>
                            <span className="ml-1.5 text-[10px] text-[#60646C]">
                              {unit.typology.replace('_', ' ')}
                            </span>
                          </div>

                          <span className={`text-[9px] font-medium uppercase px-1 py-0.2 rounded border ${badge.badgeClass}`}>
                            {unit.status}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-baseline justify-between text-xs">
                          <span className="font-mono font-semibold text-[#1C2024]">
                            {formatIndianCurrency(unit.totalPriceInr)}
                          </span>
                          <span className="text-[#80848D] text-[10px]">
                            {unit.carpetAreaSqft} sq.ft
                          </span>
                        </div>

                        <div className="mt-1 text-[10px] text-[#80848D] truncate flex items-center gap-1">
                          <Compass size={10} className="shrink-0" />
                          <span className="truncate">{unit.facing}</span>
                        </div>

                        {unit.reservedLeadName && (
                          <div className="mt-1 text-[9px] font-medium text-amber-700 bg-amber-50 px-1 py-0.5 rounded truncate">
                            Hold: {unit.reservedLeadName}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UNIT DETAILS MODAL */}
      {selectedUnit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-[#E5E8EB] shadow-lg w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#1E293B] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold font-mono">{selectedUnit.unitNumber}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-200">
                    {selectedUnit.typology.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {selectedUnit.towerName} &bull; {selectedUnit.projectName}
                </p>
              </div>

              <button
                onClick={() => setSelectedUnit(null)}
                className="p-1 text-slate-400 hover:text-white rounded transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 rounded border border-[#E5E8EB] bg-[#F8F9FA]">
                <div>
                  <p className="text-[10px] font-semibold text-[#80848D] uppercase tracking-wider">Status</p>
                  <p className="text-xs font-semibold text-[#1C2024] capitalize mt-0.5">{selectedUnit.status}</p>
                  {selectedUnit.reservedLeadName && (
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Reserved for: <strong>{selectedUnit.reservedLeadName}</strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  {selectedUnit.status === 'available' ? (
                    <button
                      onClick={() => handleOpenReserveModal(selectedUnit)}
                      className="px-2.5 py-1.5 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 transition"
                    >
                      Reserve Unit (Hold)
                    </button>
                  ) : selectedUnit.status === 'reserved' ? (
                    <button
                      onClick={() => {
                        releaseUnit(selectedUnit.id);
                        setSelectedUnit({ ...selectedUnit, status: 'available', reservedLeadName: undefined });
                      }}
                      className="px-2.5 py-1.5 bg-slate-200 text-slate-800 rounded text-xs font-medium hover:bg-slate-300 transition"
                    >
                      Release Hold
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Area Specifications */}
              <div>
                <h4 className="text-[10px] font-semibold text-[#80848D] uppercase tracking-wider mb-1.5">
                  Space & Orientation
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded border border-[#E5E8EB] bg-[#F8F9FA]">
                    <p className="text-[10px] text-[#80848D]">Carpet Area</p>
                    <p className="text-xs font-semibold font-mono text-[#1C2024] mt-0.5">{selectedUnit.carpetAreaSqft} sq.ft</p>
                  </div>
                  <div className="p-2 rounded border border-[#E5E8EB] bg-[#F8F9FA]">
                    <p className="text-[10px] text-[#80848D]">Super Built-up</p>
                    <p className="text-xs font-semibold font-mono text-[#1C2024] mt-0.5">{selectedUnit.superBuiltupAreaSqft} sq.ft</p>
                  </div>
                  <div className="p-2 rounded border border-[#E5E8EB] bg-[#F8F9FA]">
                    <p className="text-[10px] text-[#80848D]">Orientation</p>
                    <p className="text-xs font-semibold text-[#1C2024] mt-0.5 truncate">{selectedUnit.facing}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Breakup */}
              <div>
                <h4 className="text-[10px] font-semibold text-[#80848D] uppercase tracking-wider mb-1.5">
                  Commercial Pricing (INR)
                </h4>
                <div className="rounded border border-[#E5E8EB] divide-y divide-[#E5E8EB] bg-white">
                  <div className="p-2 flex justify-between text-xs">
                    <span className="text-[#60646C]">Base Sale Price (BSP)</span>
                    <span className="font-mono font-medium text-[#1C2024]">{formatIndianCurrency(selectedUnit.basePriceInr)}</span>
                  </div>
                  <div className="p-2 flex justify-between text-xs">
                    <span className="text-[#60646C]">Preferential Location (PLC)</span>
                    <span className="font-mono font-medium text-[#1C2024]">{formatIndianCurrency(selectedUnit.plcInr)}</span>
                  </div>
                  <div className="p-2 flex justify-between text-xs">
                    <span className="text-[#60646C]">Car Parking Allotment</span>
                    <span className="font-mono font-medium text-[#1C2024]">{formatIndianCurrency(selectedUnit.parkingChargesInr)}</span>
                  </div>
                  <div className="p-2 flex justify-between bg-[#F8F9FA] text-xs font-semibold">
                    <span className="text-[#1C2024]">Total Agreement Value</span>
                    <span className="font-mono text-[#1C2024]">
                      {formatIndianCurrency(selectedUnit.totalPriceInr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Transition Quick Select */}
              <div>
                <h4 className="text-[10px] font-semibold text-[#80848D] uppercase tracking-wider mb-1.5">
                  Update State
                </h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['available', 'reserved', 'booked', 'sold'] as UnitStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        updateUnitStatus(selectedUnit.id, s);
                        setSelectedUnit({ ...selectedUnit, status: s });
                      }}
                      className={`py-1.5 rounded text-[10px] font-medium uppercase transition ${
                        selectedUnit.status === s
                          ? 'bg-[#1E293B] text-white font-semibold'
                          : 'bg-[#F1F3F5] text-[#60646C] hover:bg-[#E5E8EB]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E5E8EB]">
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete unit ${selectedUnit.unitNumber}?`)) {
                      deleteUnit(selectedUnit.id);
                      setSelectedUnit(null);
                    }
                  }}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-xs font-medium"
                >
                  <Trash2 size={13} />
                  <span>Delete Unit</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const u = selectedUnit;
                      setSelectedUnit(null);
                      handleOpenEditUnitModal(u);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1.5 border border-[#E5E8EB] rounded text-[#1C2024] text-xs font-medium hover:bg-[#F8F9FA] transition"
                  >
                    <Edit2 size={12} />
                    <span>Edit Specs</span>
                  </button>

                  <button
                    onClick={() => setSelectedUnit(null)}
                    className="px-3.5 py-1.5 bg-[#1E293B] text-white rounded text-xs font-medium hover:bg-[#0F172A] transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESERVE UNIT MODAL */}
      {isReserveModalOpen && reservingUnit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-[#E5E8EB] shadow-lg max-w-sm w-full p-5">
            <h3 className="text-sm font-semibold text-[#1C2024]">
              Reserve Unit {reservingUnit.unitNumber}
            </h3>
            <p className="text-xs text-[#60646C] mt-0.5">
              Place a temporary reservation hold to prevent double-booking.
            </p>

            <form onSubmit={handleConfirmReservation} className="mt-3.5 space-y-3 text-xs">
              <div>
                <label className="block text-[#1C2024] font-medium mb-1">Customer / Lead Name *</label>
                <input
                  type="text"
                  required
                  value={reserveLeadName}
                  onChange={(e) => setReserveLeadName(e.target.value)}
                  placeholder="e.g. Rajesh Singhania"
                  className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                />
              </div>

              <div>
                <label className="block text-[#1C2024] font-medium mb-1">Hold Duration</label>
                <select
                  value={reserveDurationHours}
                  onChange={(e) => setReserveDurationHours(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (Standard)</option>
                  <option value={48}>48 Hours</option>
                  <option value={72}>72 Hours</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReserveModalOpen(false)}
                  className="flex-1 py-1.5 border border-[#E5E8EB] rounded text-[#60646C] font-medium hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-amber-600 text-white rounded font-medium hover:bg-amber-700 transition"
                >
                  Confirm Hold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT UNIT MODAL */}
      {isUnitFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-[#E5E8EB] shadow-lg w-full max-w-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-[#1E293B] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">
                  {editingUnit ? `Edit Unit ${editingUnit.unitNumber}` : 'Add Inventory Unit'}
                </h3>
                <p className="text-[11px] text-slate-300">
                  {currentTower?.name} &bull; {activeProject?.name}
                </p>
              </div>
              <button
                onClick={() => setIsUnitFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUnitFormSubmit} className="p-5 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#1C2024] font-medium mb-1">Unit Number *</label>
                  <input
                    type="text"
                    required
                    value={unitFormData.unitNumber}
                    onChange={(e) => setUnitFormData({ ...unitFormData, unitNumber: e.target.value })}
                    placeholder="e.g. A-1401"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded font-mono text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                  />
                </div>

                <div>
                  <label className="block text-[#1C2024] font-medium mb-1">Floor Number *</label>
                  <input
                    type="number"
                    required
                    value={unitFormData.floorNumber}
                    onChange={(e) => setUnitFormData({ ...unitFormData, floorNumber: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded font-mono text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                  />
                </div>

                <div>
                  <label className="block text-[#1C2024] font-medium mb-1">Typology *</label>
                  <select
                    value={unitFormData.typology}
                    onChange={(e) => setUnitFormData({ ...unitFormData, typology: e.target.value as UnitTypology })}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                  >
                    <option value="1_BHK">1 BHK</option>
                    <option value="2_BHK">2 BHK</option>
                    <option value="2.5_BHK">2.5 BHK</option>
                    <option value="3_BHK">3 BHK</option>
                    <option value="3.5_BHK">3.5 BHK</option>
                    <option value="4_BHK">4 BHK</option>
                    <option value="penthouse">Penthouse</option>
                    <option value="duplex">Duplex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#1C2024] font-medium mb-1">Orientation / Facing *</label>
                  <input
                    type="text"
                    required
                    value={unitFormData.facing}
                    onChange={(e) => setUnitFormData({ ...unitFormData, facing: e.target.value })}
                    placeholder="e.g. Arabian Sea Facing"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                  />
                </div>

                <div>
                  <label className="block text-[#1C2024] font-medium mb-1">Carpet Area (sq.ft) *</label>
                  <input
                    type="number"
                    required
                    value={unitFormData.carpetAreaSqft}
                    onChange={(e) => setUnitFormData({ ...unitFormData, carpetAreaSqft: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded font-mono text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                  />
                </div>

                <div>
                  <label className="block text-[#1C2024] font-medium mb-1">Super Built-up (sq.ft) *</label>
                  <input
                    type="number"
                    required
                    value={unitFormData.superBuiltupAreaSqft}
                    onChange={(e) => setUnitFormData({ ...unitFormData, superBuiltupAreaSqft: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded font-mono text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E8EB]">
                <p className="font-medium text-[#1C2024] mb-1.5">Commercial Pricing (INR)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#80848D] mb-0.5">Base Price</label>
                    <input
                      type="number"
                      required
                      value={unitFormData.basePriceInr}
                      onChange={(e) => setUnitFormData({ ...unitFormData, basePriceInr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-[#E5E8EB] rounded font-mono text-xs text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#80848D] mb-0.5">PLC Charges</label>
                    <input
                      type="number"
                      value={unitFormData.plcInr}
                      onChange={(e) => setUnitFormData({ ...unitFormData, plcInr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-[#E5E8EB] rounded font-mono text-xs text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#80848D] mb-0.5">Parking Charges</label>
                    <input
                      type="number"
                      value={unitFormData.parkingChargesInr}
                      onChange={(e) => setUnitFormData({ ...unitFormData, parkingChargesInr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-[#E5E8EB] rounded font-mono text-xs text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                    />
                  </div>
                </div>

                <div className="mt-2 p-2 bg-[#F8F9FA] border border-[#E5E8EB] rounded flex justify-between items-center text-xs">
                  <span className="text-[#60646C]">Total Agreement Price:</span>
                  <span className="font-mono font-semibold text-[#1C2024]">
                    {formatIndianCurrency(
                      (Number(unitFormData.basePriceInr) || 0) +
                        (Number(unitFormData.plcInr) || 0) +
                        (Number(unitFormData.parkingChargesInr) || 0)
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#1C2024] font-medium mb-1">Status</label>
                <select
                  value={unitFormData.status}
                  onChange={(e) => setUnitFormData({ ...unitFormData, status: e.target.value as UnitStatus })}
                  className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded text-[#1C2024] focus:outline-none focus:border-[#1E293B]"
                >
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="booked">Booked</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-[#E5E8EB]">
                <button
                  type="button"
                  onClick={() => setIsUnitFormOpen(false)}
                  className="px-3 py-1.5 border border-[#E5E8EB] text-[#60646C] rounded text-xs font-medium hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1E293B] text-white rounded text-xs font-medium hover:bg-[#0F172A] transition"
                >
                  {editingUnit ? 'Save Updates' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
