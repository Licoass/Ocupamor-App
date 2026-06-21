import React, { useState } from 'react';
import { RealtimeIndicator } from './RealtimeIndicator';
import { Calendar, Users, BarChart3, LogOut, Menu, X } from 'lucide-react';
import logo from '../../Logo Ocupamor Editable.png'; // Will resolve Vite assets

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'planificador' | 'especialistas' | 'historial';
  setActiveTab: (tab: 'planificador' | 'especialistas' | 'historial') => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'planificador', label: 'Planificador', icon: Calendar },
    { id: 'especialistas', label: 'Especialistas', icon: Users },
    { id: 'historial', label: 'Historial de Diseños', icon: BarChart3 },
  ] as const;

  const handleNavClick = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 shadow-sm z-30">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Ocupamor Logo" className="h-9 w-auto object-contain" />
          <span className="font-display font-bold text-slate-800 text-sm tracking-tight">Ocupamor</span>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeIndicator />
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-slate-600 hover:bg-slate-50 rounded"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Navigation Sidebar (Desktop) */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-100 shadow-sm flex flex-col z-40 transform transition-transform duration-300 md:relative md:transform-none
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand header */}
        <div className="p-5 border-b border-slate-50 hidden md:flex items-center gap-3">
          <img src={logo} alt="Ocupamor Logo" className="h-10 w-auto object-contain hover-lift" />
          <div className="flex flex-col">
            <span className="font-display font-bold text-slate-800 text-base tracking-tight">Ocupamor</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Centro Ocupacional</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                  ${isActive 
                    ? 'bg-brand-moradoDesarrollo text-white shadow-sm shadow-brand-moradoDesarrollo/20' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-brand-moradoDesarrollo'
                  }
                `}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-moradoDesarrollo'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-50 space-y-3">
          <div className="hidden md:block">
            <RealtimeIndicator />
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors duration-150"
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Desktop Top Header (Hidden on Mobile) */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100 shadow-sm z-20">
          <h1 className="text-xl font-bold text-slate-800 capitalize">
            {activeTab === 'planificador' ? 'Calendario de Redes' : activeTab === 'especialistas' ? 'Directorio de Especialistas' : 'Historial General'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-xs font-semibold text-slate-500 bg-slate-100/70 px-3 py-1.5 rounded-lg border border-slate-200/50">
              Gestión Ocupamor 2026
            </div>
          </div>
        </header>

        {/* Page Container */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
