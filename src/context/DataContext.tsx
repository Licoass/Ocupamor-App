import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Specialty, Specialist, Publication, Efemeride } from '../types';

interface DataContextType {
  publications: Publication[];
  specialists: Specialist[];
  specialties: Specialty[];
  efemerides: Efemeride[];
  syncStatus: 'synced' | 'syncing' | 'error';
  errorMessage: string | null;
  activeEditing: { id: string; type: 'publication' | 'specialist'; field: string } | null;
  setActiveEditing: (editing: { id: string; type: 'publication' | 'specialist'; field: string } | null) => void;
  savePublication: (pub: Partial<Publication>) => Promise<boolean>;
  saveSpecialist: (spec: Partial<Specialist>) => Promise<boolean>;
  deletePublication: (id: string) => Promise<boolean>;
  deleteSpecialist: (id: string) => Promise<boolean>;
  fetchData: () => Promise<void>;
  conflictNotification: string | null;
  setConflictNotification: (msg: string | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [efemerides, setEfemerides] = useState<Efemeride[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('syncing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track what field the current user is active in, to identify edits conflicts
  const [activeEditing, setActiveEditing] = useState<{ id: string; type: 'publication' | 'specialist'; field: string } | null>(null);
  const activeEditingRef = useRef(activeEditing);
  useEffect(() => {
    activeEditingRef.current = activeEditing;
  }, [activeEditing]);

  const [conflictNotification, setConflictNotification] = useState<string | null>(null);

  // Load all initial data from Supabase
  const fetchData = async () => {
    setSyncStatus('syncing');
    setErrorMessage(null);
    try {
      // 1. Fetch specialties
      const { data: specData, error: specErr } = await supabase
        .from('especialidades')
        .select('*')
        .order('orden', { ascending: true });
      if (specErr) throw specErr;
      setSpecialties(specData || []);

      // 2. Fetch specialists
      const { data: listData, error: listErr } = await supabase
        .from('especialistas')
        .select('*, especialidades:especialidad_id(*)');
      if (listErr) throw listErr;
      setSpecialists(listData || []);

      // 3. Fetch publications
      const { data: pubData, error: pubErr } = await supabase
        .from('publicaciones')
        .select('*, especialidades:especialidad_id(*)');
      if (pubErr) throw pubErr;
      setPublications(pubData || []);

      // 4. Fetch holidays
      const { data: holidayData, error: holidayErr } = await supabase
        .from('efemerides')
        .select('*');
      if (holidayErr) throw holidayErr;
      setEfemerides(holidayData || []);

      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Error fetching data from Supabase:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error de conexión con la base de datos.');
    }
  };

  useEffect(() => {
    fetchData();

    // 5. Setup Realtime subscriptions
    const pubChannel = supabase.channel('realtime-publications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        setPublications(current => {
          if (eventType === 'INSERT') {
            // Append with specialty joined
            const specialtyObj = specialties.find(s => s.id === newRecord.especialidad_id);
            const inserted = { ...newRecord, especialidades: specialtyObj } as Publication;
            return [...current, inserted];
          }
          if (eventType === 'UPDATE') {
            // Conflict check:
            // If the local user is currently editing a field of this record, and the received record's field differs from local
            const editing = activeEditingRef.current;
            if (editing && editing.type === 'publication' && editing.id === newRecord.id) {
              const localField = editing.field as keyof Publication;
              if (newRecord[localField] !== undefined && newRecord[localField] !== oldRecord[localField]) {
                // Trigger conflict notification
                setConflictNotification(`El campo "${String(localField)}" fue actualizado por otro usuario.`);
              }
            }

            const specialtyObj = specialties.find(s => s.id === newRecord.especialidad_id);
            return current.map(p => p.id === newRecord.id ? { ...newRecord, especialidades: specialtyObj } as Publication : p);
          }
          if (eventType === 'DELETE') {
            return current.filter(p => p.id === oldRecord.id);
          }
          return current;
        });
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setSyncStatus('error');
        } else if (status === 'SUBSCRIBED') {
          setSyncStatus('synced');
        }
      });

    const specChannel = supabase.channel('realtime-specialists-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'especialistas' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        setSpecialists(current => {
          if (eventType === 'INSERT') {
            const specialtyObj = specialties.find(s => s.id === newRecord.especialidad_id);
            const inserted = { ...newRecord, especialidades: specialtyObj } as Specialist;
            return [...current, inserted];
          }
          if (eventType === 'UPDATE') {
            const editing = activeEditingRef.current;
            if (editing && editing.type === 'specialist' && editing.id === newRecord.id) {
              const localField = editing.field as keyof Specialist;
              if (newRecord[localField] !== undefined && newRecord[localField] !== oldRecord[localField]) {
                setConflictNotification(`El especialista fue actualizado por otro usuario.`);
              }
            }

            const specialtyObj = specialties.find(s => s.id === newRecord.especialidad_id);
            return current.map(s => s.id === newRecord.id ? { ...newRecord, especialidades: specialtyObj } as Specialist : s);
          }
          if (eventType === 'DELETE') {
            return current.filter(s => s.id === oldRecord.id);
          }
          return current;
        });
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setSyncStatus('error');
        }
      });

    return () => {
      supabase.removeChannel(pubChannel);
      supabase.removeChannel(specChannel);
    };
  }, []);

  // Operations: Publications
  const savePublication = async (pub: Partial<Publication>) => {
    setSyncStatus('syncing');
    try {
      const isNew = !pub.id;
      const payload = {
        ...pub,
        updated_at: new Date().toISOString()
      };

      let error;
      if (isNew) {
        ({ error } = await supabase.from('publicaciones').insert(payload));
      } else {
        ({ error } = await supabase.from('publicaciones').update(payload).eq('id', pub.id));
      }

      if (error) throw error;
      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      console.error('Error saving publication:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error al guardar la publicación.');
      return false;
    }
  };

  const deletePublication = async (id: string) => {
    setSyncStatus('syncing');
    try {
      const { error } = await supabase.from('publicaciones').delete().eq('id', id);
      if (error) throw error;
      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      console.error('Error deleting publication:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error al eliminar la publicación.');
      return false;
    }
  };

  // Operations: Specialists
  const saveSpecialist = async (spec: Partial<Specialist>) => {
    setSyncStatus('syncing');
    try {
      const isNew = !spec.id;
      const payload = {
        ...spec,
        updated_at: new Date().toISOString()
      };

      let error;
      if (isNew) {
        ({ error } = await supabase.from('especialistas').insert(payload));
      } else {
        ({ error } = await supabase.from('especialistas').update(payload).eq('id', spec.id));
      }

      if (error) throw error;
      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      console.error('Error saving specialist:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error al guardar especialista.');
      return false;
    }
  };

  const deleteSpecialist = async (id: string) => {
    setSyncStatus('syncing');
    try {
      const { error } = await supabase.from('especialistas').delete().eq('id', id);
      if (error) throw error;
      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      console.error('Error deleting specialist:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error al eliminar especialista.');
      return false;
    }
  };

  return (
    <DataContext.Provider value={{
      publications,
      specialists,
      specialties,
      efemerides,
      syncStatus,
      errorMessage,
      activeEditing,
      setActiveEditing,
      savePublication,
      saveSpecialist,
      deletePublication,
      deleteSpecialist,
      fetchData,
      conflictNotification,
      setConflictNotification
    }}>
      {children}
    </DataContext.Provider>
  );
};
