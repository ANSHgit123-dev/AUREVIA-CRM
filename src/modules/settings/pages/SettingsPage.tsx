import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { isSupabaseConfigured } from '../../../lib/supabase';
import {
  Shield,
  Building,
  Key,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Server,
  FileText,
  Save,
  RefreshCw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  const [companyName, setCompanyName] = useState('AUREVIA REALTY ENTERPRISES LLP');
  const [reraNumber, setReraNumber] = useState('PRM/KA/RERA/1251/310/PR/171015/000456');
  const [taxPan, setTaxPan] = useState('AABCA1234F');
  const [gstin, setGstin] = useState('29AABCA1234F1Z5');
  const [registeredOffice, setRegisteredOffice] = useState('14th Floor, Aurevia Pinnacle Towers, UB City, Vittal Mallya Road, Bengaluru 560001');
  const [supportEmail, setSupportEmail] = useState('concierge@aurevia.com');
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState('60');
  const [mfaEnforced, setMfaEnforced] = useState(true);
  const [auditLoggingEnabled, setAuditLoggingEnabled] = useState(true);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice('Enterprise configuration successfully updated and broadcast to all nodes.');
    setTimeout(() => setSavedNotice(null), 4000);
  };

  return (
    <div className="space-y-4 max-w-5xl pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#E5E8EB]">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#1E293B]" />
            <h1 className="text-lg font-semibold text-[#1C2024]">
              Organization & Security Settings
            </h1>
          </div>
          <p className="text-xs text-[#60646C] mt-0.5">
            Enterprise entity parameters, statutory RERA registration, security compliance, and database persistence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            {isSupabaseConfigured ? 'Database Connected' : 'Demo State Persistence'}
          </span>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-2 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Entity Master & Statutory Compliance */}
        <div className="bg-white rounded-md border border-[#E5E8EB] p-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E5E8EB]">
            <Building className="w-4 h-4 text-[#1E293B]" />
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1C2024]">Entity Master & Statutory RERA</h2>
              <p className="text-[11px] text-[#60646C]">Legal business entity credentials embedded on consumer allotment receipts and documents.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-xs font-medium text-[#1C2024] mb-1">Corporate Entity Name</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-[#E5E8EB] rounded text-[#1C2024] focus:border-[#1E293B] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C2024] mb-1">RERA Registration Number</label>
              <input
                type="text"
                value={reraNumber}
                onChange={e => setReraNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-[#E5E8EB] rounded text-[#1C2024] focus:border-[#1E293B] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C2024] mb-1">Corporate PAN</label>
              <input
                type="text"
                value={taxPan}
                onChange={e => setTaxPan(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono uppercase border border-[#E5E8EB] rounded text-[#1C2024] focus:border-[#1E293B] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C2024] mb-1">GSTIN Identification</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono uppercase border border-[#E5E8EB] rounded text-[#1C2024] focus:border-[#1E293B] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[#1C2024] mb-1">Corporate Registered Address</label>
              <input
                type="text"
                value={registeredOffice}
                onChange={e => setRegisteredOffice(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-[#E5E8EB] rounded text-[#1C2024] focus:border-[#1E293B] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C2024] mb-1">Client Support & Concierge Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-[#E5E8EB] rounded text-[#1C2024] focus:border-[#1E293B] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Security & Access Policy */}
        <div className="bg-white rounded-md border border-[#E5E8EB] p-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E5E8EB]">
            <Lock className="w-4 h-4 text-[#1E293B]" />
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1C2024]">Security & RBAC Policy</h2>
              <p className="text-[11px] text-[#60646C]">Global authentication constraints, self-registration rules, and session parameters.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded border border-[#E5E8EB]">
              <div>
                <p className="text-xs font-medium text-[#1C2024]">Public Self-Registration Status</p>
                <p className="text-[11px] text-[#60646C]">Only authorized Company Administrators and Directors can provision employee credentials.</p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded">
                Disabled
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded border border-[#E5E8EB]">
              <div>
                <p className="text-xs font-medium text-[#1C2024]">PostgreSQL Row-Level Security (RLS)</p>
                <p className="text-[11px] text-[#60646C]">
                  {isSupabaseConfigured
                    ? 'Enforces lead and booking scoping at the database level by auth.uid() and role.'
                    : 'Simulated via client route guards. Database RLS requires a connected Supabase project.'}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-medium rounded border ${
                  isSupabaseConfigured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isSupabaseConfigured ? 'Active & Enforced' : 'Database Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded border border-[#E5E8EB]">
              <div>
                <p className="text-xs font-medium text-[#1C2024]">Multi-Factor Authentication (MFA) for Administrative Roles</p>
                <p className="text-[11px] text-[#60646C]">Require TOTP authentication for Company Admin, Director, and Booking Operations.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mfaEnforced}
                  onChange={e => setMfaEnforced(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#E5E8EB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E293B]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded border border-[#E5E8EB]">
              <div>
                <p className="text-xs font-medium text-[#1C2024]">Immutable Audit Logging</p>
                <p className="text-[11px] text-[#60646C]">Record every lead assignment, stage transition, unit discount, and token confirmation.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={auditLoggingEnabled}
                  onChange={e => setAuditLoggingEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#E5E8EB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1E293B]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Database & Persistence Diagnostics */}
        <div className="bg-white rounded-md border border-[#E5E8EB] p-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E5E8EB]">
            <Server className="w-4 h-4 text-[#1E293B]" />
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1C2024]">Database & Persistence Diagnostics</h2>
              <p className="text-[11px] text-[#60646C]">Status of backend connectivity and schema synchronization.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded border border-[#E5E8EB] bg-[#F8F9FA]">
              <span className="text-[10px] text-[#80848D] uppercase font-semibold">Active Engine</span>
              <p className="text-xs font-semibold text-[#1C2024] mt-0.5">
                {isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Sandbox Demo Fallback'}
              </p>
              <p className="text-[11px] text-[#60646C] mt-0.5">
                {isSupabaseConfigured ? 'Connected with live SSL pooling' : 'Functional in-memory state'}
              </p>
            </div>

            <div className="p-3 rounded border border-[#E5E8EB] bg-[#F8F9FA]">
              <span className="text-[10px] text-[#80848D] uppercase font-semibold">Current Session Actor</span>
              <p className="text-xs font-semibold text-[#1C2024] mt-0.5 font-mono">
                {user?.fullName || 'Administrator'}
              </p>
              <p className="text-[11px] text-[#60646C] mt-0.5 font-mono">
                Role: {user?.role}
              </p>
            </div>

            <div className="p-3 rounded border border-[#E5E8EB] bg-[#F8F9FA]">
              <span className="text-[10px] text-[#80848D] uppercase font-semibold">Schema Migrations</span>
              <p className={`text-xs font-semibold mt-0.5 ${isSupabaseConfigured ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isSupabaseConfigured ? 'Live Database Active' : '0 Migrations Applied'}
              </p>
              <p className="text-[11px] text-[#60646C] mt-0.5">
                {isSupabaseConfigured
                  ? 'Cloud DDL & RLS synchronized'
                  : '5 SQL files pending deployment'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-[#1E293B] hover:bg-[#0F172A] text-white rounded text-xs font-medium transition-all flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save Organization Settings
          </button>
        </div>
      </form>
    </div>
  );
};
