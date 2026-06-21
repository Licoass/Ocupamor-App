import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logo from '../../Logo Ocupamor Editable.png';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    // Validate password input
    if (password !== 'Ocupamor2026') {
      setError('Contraseña incorrecta. Por favor, intente de nuevo.');
      setLoading(false);
      return;
    }

    try {
      // Authenticate with Supabase Auth using a shared admin account
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@ocupamor.com',
        password: 'Ocupamor2026',
      });

      if (authError) {
        // If the user does not exist in Supabase Auth yet, we can register them or fallback
        // to a frontend-validated mock session for testing if the user has not configured Supabase yet.
        if (authError.message.includes('Invalid login credentials')) {
          setError('Contraseña incorrecta o cuenta de administración no configurada en Supabase.');
        } else {
          setError(authError.message);
        }
        
        // Fallback: If Supabase connection fails or is not setup yet (e.g. localhost testing with placeholders), 
        // allow bypass in development if the user types Ocupamor2026, but warn them.
        if (import.meta.env.DEV) {
          console.warn('Supabase Auth error. Falling back to mock session for development.');
          localStorage.setItem('ocupamor_session_mock', 'true');
          onLoginSuccess();
          return;
        }
      } else {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError('Error de red al intentar conectar con Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6 hover-glow transition-all duration-300">
        
        {/* Brand Logo & Name */}
        <div className="flex flex-col items-center text-center space-y-3">
          <img src={logo} alt="Ocupamor Logo" className="h-24 w-auto object-contain hover-lift" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800 font-display">Ocupamor</h2>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Centro de Atención Ocupacional</p>
          </div>
        </div>

        {/* Brand Mission Quote */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50 text-center">
          <p className="text-xs text-slate-500 italic leading-relaxed">
            "Generar bienestar a nuestros niños y sus hogares con amor y ciencia."
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduzca la contraseña"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/20 focus:border-brand-moradoDesarrollo transition-all duration-200"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100">
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-brand-moradoDesarrollo text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md shadow-brand-moradoDesarrollo/20 hover:bg-brand-moradoDesarrollo/95 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>
        
        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-400 font-semibold">
          © {new Date().getFullYear()} Ocupamor · Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
};
