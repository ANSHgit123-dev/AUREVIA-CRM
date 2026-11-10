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
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
          dotClass: 'bg-emerald-500',
          borderClass: 'border-emerald-300 hover:border-emerald-500 hover:shadow-emerald-100',
        };
      case 'reserved':
        return {
          label: 'Reserved (Hold)',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/60',
          dotClass: 'bg-amber-500',
          borderClass: 'border-amber-300 hover:border-amber-500 hover:shadow-amber-100',
        };
      case 'booked':
        return {
          label: 'Booked (Token)',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/60',
          dotClass: 'bg-blue-500',
          borderClass: 'border-blue-300 hover:border-blue-500 hover:shadow-blue-100',
        };
      case 'sold':
        return {
          label: 'Sold & Registered',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          dotClass: 'bg-slate-500',
          borderClass: 'border-slate-200 hover:border-slate-400 opacity-90',
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
    <div className="space-y-6">
      {/* Top Header & Project Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Property Unit Inventory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Interactive floor-by-floor stacking matrix, live unit reservation locks, and inventory pricing breakdown.
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
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-900 text-slate-800 shadow-sm"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.city})
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenAddUnitModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-800 transition shadow-card shrink-0"
          >
            <Plus size={15} />
            <span>Add Unit</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
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
          variant="emerald"
        />
        <MetricCard
          title="Reserved on Hold"
          value={projectStats.reservedUnits.toString()}
          subtitle="Temporary locks (48h)"
          icon={Clock}
          variant="gold"
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
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 shrink-0">
          Towers:
        </span>
        {projectTowers.map((tower) => {
          const isActive = tower.id === currentTower?.id;
          return (
            <button
              key={tower.id}
              onClick={() => setActiveTowerId(tower.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                isActive
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building size={14} className={isActive ? 'text-gold-500' : 'text-slate-400'} />
              <span>{tower.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-navy-800 text-slate-200' : 'bg-slate-100 text-slate-500'}`}>
                {units.filter((u) => u.projectId === activeProjectId && u.towerId === tower.id).length} units
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-surface-border p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search unit number (e.g. A-1401), facing, or typology..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter size={14} className="text-slate-400 shrink-0" />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available (Green)</option>
            <option value="reserved">Reserved (Amber)</option>
            <option value="booked">Booked (Blue)</option>
            <option value="sold">Sold (Slate)</option>
          </select>

          {/* Typology Filter */}
          <select
            value={typologyFilter}
            onChange={(e) => setTypologyFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
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
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
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
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white px-5 py-3 rounded-xl border border-surface-border shadow-subtle">
        <span className="font-semibold text-slate-600">Unit Stacking Matrix Legend:</span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-md bg-emerald-500 shadow-sm" />
            <span className="text-slate-700">Available ({projectStats.availableUnits})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-md bg-amber-500 shadow-sm" />
            <span className="text-slate-700">Reserved / Hold ({projectStats.reservedUnits})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-md bg-blue-500 shadow-sm" />
            <span className="text-slate-700">Booked / Token ({projectStats.bookedUnits})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded-md bg-slate-400 shadow-sm" />
            <span className="text-slate-700">Sold ({projectStats.soldUnits})</span>
          </div>
        </div>
      </div>

      {/* THE INTERACTIVE FLOOR-WISE STACKING MATRIX */}
      <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {currentTower ? `${currentTower.name} — Elevation Stacking Chart` : 'Unit Stacking Chart'}
            </h3>
            <p className="text-xs text-slate-500">
              Vertical structural layout ordered by floor height (top to ground). Click any unit cell to inspect or reserve.
            </p>
          </div>
        </div>

        {floorStackMap.size === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Grid3X3 size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No units found matching current filter selection.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(floorStackMap.entries()).map(([floor, floorUnits]) => (
              <div
                key={floor}
                className="flex items-center space-x-4 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 transition"
              >
                {/* Floor Indicator Badge */}
                <div className="w-20 shrink-0 text-center">
                  <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold font-mono bg-navy-900 text-white shadow-sm">
                    FL {floor < 10 ? '0' + floor : floor}
                  </span>
                </div>

                {/* Units on this Floor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 flex-1">
                  {floorUnits.map((unit) => {
                    const badge = getStatusBadge(unit.status);
                    return (
                      <button
                        key={unit.id}
                        onClick={() => setSelectedUnit(unit)}
                        className={`text-left p-3 rounded-xl border bg-white shadow-sm hover:shadow-card transition-all relative overflow-hidden group cursor-pointer ${badge.borderClass}`}
                      >
                        {/* Status color indicator bar on top */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-1 ${
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
                            <span className="text-xs font-bold text-slate-900 font-mono tracking-tight">
                              {unit.unitNumber}
                            </span>
                            <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {unit.typology.replace('_', ' ')}
                            </span>
                          </div>

                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${badge.badgeClass}`}>
                            {unit.status}
                          </span>
                        </div>

                        <div className="mt-2 flex items-baseline justify-between text-[11px]">
                          <span className="font-mono font-bold text-navy-900">
                            {formatIndianCurrency(unit.totalPriceInr)}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {unit.carpetAreaSqft} sq.ft
                          </span>
                        </div>

                        <div className="mt-1 text-[10px] text-slate-400 truncate flex items-center gap-1">
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

      {/* UNIT DETAILS SLIDE-OUT / MODAL */}
      {selectedUnit && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-base font-bold font-mono">{selectedUnit.unitNumber}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30">
                    {selectedUnit.typology.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {selectedUnit.towerName} &bull; {selectedUnit.projectName}
                </p>
              </div>

              <button
                onClick={() => setSelectedUnit(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Inventory Status</p>
                  <p className="text-sm font-bold text-slate-900 capitalize">{selectedUnit.status}</p>
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
                      className="px-3 py-1.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition shadow-sm"
                    >
                      Reserve Unit (Hold)
                    </button>
                  ) : selectedUnit.status === 'reserved' ? (
                    <button
                      onClick={() => {
                        releaseUnit(selectedUnit.id);
                        setSelectedUnit({ ...selectedUnit, status: 'available', reservedLeadName: undefined });
                      }}
                      className="px-3 py-1.5 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition"
                    >
                      Release Hold
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Area Specifications */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Space & Orientation
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] text-slate-400">Carpet Area</p>
                    <p className="text-xs font-bold font-mono text-slate-900 mt-0.5">{selectedUnit.carpetAreaSqft} sq.ft</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] text-slate-400">Super Built-up</p>
                    <p className="text-xs font-bold font-mono text-slate-900 mt-0.5">{selectedUnit.superBuiltupAreaSqft} sq.ft</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] text-slate-400">Orientation</p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">{selectedUnit.facing}</p>
                  </div>
                </div>
              </div>

              {/* Pricing Breakup */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Commercial Pricing Breakdown (INR)
                </h4>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                  <div className="p-2.5 flex justify-between">
                    <span className="text-slate-600">Base Sale Price (BSP)</span>
                    <span className="font-mono font-semibold text-slate-900">{formatIndianCurrency(selectedUnit.basePriceInr)}</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="text-slate-600">Preferential Location Charges (PLC)</span>
                    <span className="font-mono font-semibold text-slate-900">{formatIndianCurrency(selectedUnit.plcInr)}</span>
                  </div>
                  <div className="p-2.5 flex justify-between">
                    <span className="text-slate-600">Covered Car Parking Allotment</span>
                    <span className="font-mono font-semibold text-slate-900">{formatIndianCurrency(selectedUnit.parkingChargesInr)}</span>
                  </div>
                  <div className="p-3 flex justify-between bg-navy-900 text-white rounded-b-xl">
                    <span className="font-bold">Total Agreement Value</span>
                    <span className="font-mono font-bold text-gold-400 text-sm">
                      {formatIndianCurrency(selectedUnit.totalPriceInr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Transition Quick Select */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Update Inventory State
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {(['available', 'reserved', 'booked', 'sold'] as UnitStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        updateUnitStatus(selectedUnit.id, s);
                        setSelectedUnit({ ...selectedUnit, status: s });
                      }}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase transition ${
                        selectedUnit.status === s
                          ? 'bg-navy-900 text-white shadow-sm ring-2 ring-navy-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete unit ${selectedUnit.unitNumber}?`)) {
                      deleteUnit(selectedUnit.id);
                      setSelectedUnit(null);
                    }
                  }}
                  className="flex items-center space-x-1 text-rose-600 hover:text-rose-700 text-xs font-semibold"
                >
                  <Trash2 size={14} />
                  <span>Delete Unit</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const u = selectedUnit;
                      setSelectedUnit(null);
                      handleOpenEditUnitModal(u);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                  >
                    <Edit2 size={13} />
                    <span>Edit Specs</span>
                  </button>
                  <button
                    onClick={() => setSelectedUnit(null)}
                    className="px-4 py-1.5 bg-navy-900 text-white rounded-lg font-semibold hover:bg-navy-800 transition"
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
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900">
              Reserve Unit {reservingUnit.unitNumber}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Place a temporary reservation hold on this apartment to prevent double-booking.
            </p>

            <form onSubmit={handleConfirmReservation} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer / Lead Name *</label>
                <input
                  type="text"
                  required
                  value={reserveLeadName}
                  onChange={(e) => setReserveLeadName(e.target.value)}
                  placeholder="e.g. Rajesh Singhania"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Hold Duration (Hours)</label>
                <select
                  value={reserveDurationHours}
                  onChange={(e) => setReserveDurationHours(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900 font-medium"
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (Standard)</option>
                  <option value={48}>48 Hours (Closer Max)</option>
                  <option value={72}>72 Hours (Manager Approval)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsReserveModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 shadow-sm"
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
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingUnit ? `Edit Unit ${editingUnit.unitNumber}` : 'Add Inventory Unit'}
                </h3>
                <p className="text-[11px] text-slate-300">
                  {currentTower?.name} &bull; {activeProject?.name}
                </p>
              </div>
              <button
                onClick={() => setIsUnitFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUnitFormSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Number *</label>
                  <input
                    type="text"
                    required
                    value={unitFormData.unitNumber}
                    onChange={(e) => setUnitFormData({ ...unitFormData, unitNumber: e.target.value })}
                    placeholder="e.g. A-1401"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Floor Number *</label>
                  <input
                    type="number"
                    required
                    value={unitFormData.floorNumber}
                    onChange={(e) => setUnitFormData({ ...unitFormData, floorNumber: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Typology *</label>
                  <select
                    value={unitFormData.typology}
                    onChange={(e) => setUnitFormData({ ...unitFormData, typology: e.target.value as UnitTypology })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                  <label className="block text-slate-700 font-semibold mb-1">Orientation / Facing *</label>
                  <input
                    type="text"
                    required
                    value={unitFormData.facing}
                    onChange={(e) => setUnitFormData({ ...unitFormData, facing: e.target.value })}
                    placeholder="e.g. Arabian Sea Facing"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Carpet Area (sq.ft) *</label>
                  <input
                    type="number"
                    required
                    value={unitFormData.carpetAreaSqft}
                    onChange={(e) => setUnitFormData({ ...unitFormData, carpetAreaSqft: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Super Built-up (sq.ft) *</label>
                  <input
                    type="number"
                    required
                    value={unitFormData.superBuiltupAreaSqft}
                    onChange={(e) => setUnitFormData({ ...unitFormData, superBuiltupAreaSqft: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="font-semibold text-slate-700 mb-2">Commercial Pricing (INR)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Base Price</label>
                    <input
                      type="number"
                      required
                      value={unitFormData.basePriceInr}
                      onChange={(e) => setUnitFormData({ ...unitFormData, basePriceInr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">PLC Charges</label>
                    <input
                      type="number"
                      value={unitFormData.plcInr}
                      onChange={(e) => setUnitFormData({ ...unitFormData, plcInr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Parking Charges</label>
                    <input
                      type="number"
                      value={unitFormData.parkingChargesInr}
                      onChange={(e) => setUnitFormData({ ...unitFormData, parkingChargesInr: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="mt-2 p-2 bg-slate-100 rounded-lg flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-600">Total Calculated Agreement Price:</span>
                  <span className="font-mono font-bold text-navy-900">
                    {formatIndianCurrency(
                      (Number(unitFormData.basePriceInr) || 0) +
                        (Number(unitFormData.plcInr) || 0) +
                        (Number(unitFormData.parkingChargesInr) || 0)
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Status</label>
                <select
                  value={unitFormData.status}
                  onChange={(e) => setUnitFormData({ ...unitFormData, status: e.target.value as UnitStatus })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="booked">Booked</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUnitFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-navy-900 text-white rounded-xl font-semibold hover:bg-navy-800 shadow-sm"
                >
                  {editingUnit ? 'Save Updates' : 'Add to Stacking Matrix'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
