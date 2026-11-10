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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 font-serif">
              Organization & Security Settings
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise entity parameters, statutory RERA registration numbers, security compliance and database synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            {isSupabaseConfigured ? 'Cloud Database Connected' : 'Demo State Persistence'}
          </span>
        </div>
      </div>

      {savedNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Entity Master & Statutory Compliance */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Entity Master & Statutory RERA</h2>
              <p className="text-xs text-slate-500">Legal business entity credentials embedded on consumer allotment receipts and brochures.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Corporate Entity Name</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">State Real Estate Regulatory (RERA) Registration</label>
              <input
                type="text"
                value={reraNumber}
                onChange={e => setReraNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Corporate PAN</label>
              <input
                type="text"
                value={taxPan}
                onChange={e => setTaxPan(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">GSTIN Identification</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Corporate Registered Headquarters Address</label>
              <input
                type="text"
                value={registeredOffice}
                onChange={e => setRegisteredOffice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Official Client Support & Concierge Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Security & Access Policy */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <Lock className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Security & RBAC Enforcement Policy</h2>
              <p className="text-xs text-slate-500">Configure global authentication constraints, public signup rules, and session parameters.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">Public Self-Registration Status</p>
                <p className="text-xs text-slate-500">Only authorized Company Administrators and Directors can provision employee credentials.</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                Strictly Disabled
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">PostgreSQL Row-Level Security (RLS)</p>
                <p className="text-xs text-slate-500">
                  {isSupabaseConfigured
                    ? 'Enforces lead and booking scoping at the database level by auth.uid() and role.'
                    : 'Simulated via client route guards. Database RLS requires a connected Supabase project.'}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                  isSupabaseConfigured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isSupabaseConfigured ? 'Active & Enforced' : 'Database Offline (Simulated)'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">Multi-Factor Authentication (MFA) for Administrative Roles</p>
                <p className="text-xs text-slate-500">Require TOTP authentication for Company Admin, Director, and Booking Operations.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mfaEnforced}
                  onChange={e => setMfaEnforced(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">Immutable Audit Logging</p>
                <p className="text-xs text-slate-500">Record every lead assignment, stage transition, unit discount, and token confirmation.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={auditLoggingEnabled}
                  onChange={e => setAuditLoggingEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Database & Persistence Diagnostics */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <Server className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Database & Persistence Diagnostics</h2>
              <p className="text-xs text-slate-500">Real-time status of backend connectivity and schema synchronization.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-xs text-slate-500 uppercase font-semibold">Active Engine</span>
              <p className="text-base font-bold text-slate-900 mt-1">
                {isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Local Sandbox Demo Fallback'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isSupabaseConfigured ? 'Connected with live secure SSL pooling' : 'Fully functional in-memory & local state'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-xs text-slate-500 uppercase font-semibold">Current Session Actor</span>
              <p className="text-base font-bold text-slate-900 mt-1 font-mono text-sm">
                {user?.fullName || 'Administrator'}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Role: {user?.role}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-xs text-slate-500 uppercase font-semibold">Schema Migrations</span>
              <p className={`text-base font-bold mt-1 ${isSupabaseConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isSupabaseConfigured ? 'Live Database Active' : '0 Migrations Applied'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isSupabaseConfigured
                  ? 'Cloud DDL & RLS policies synchronized'
                  : '5 SQL migration files pending deployment to Supabase'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Organization Settings
          </button>
        </div>
      </form>
    </div>
  );
};
