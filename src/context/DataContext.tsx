import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Specialty, Specialist, Publication, Efemeride, MonthlyLink, FixedLink } from '../types';

interface DataContextType {
  publications: Publication[];
  specialists: Specialist[];
  specialties: Specialty[];
  efemerides: Efemeride[];
  monthlyLinks: MonthlyLink[];
  fixedLinks: FixedLink[];
  hasFixedLinksTable: boolean;
  syncStatus: 'synced' | 'syncing' | 'error';
  errorMessage: string | null;
  activeEditing: { id: string; type: 'publication' | 'specialist'; field: string } | null;
  setActiveEditing: (editing: { id: string; type: 'publication' | 'specialist'; field: string } | null) => void;
  savePublication: (pub: Partial<Publication>) => Promise<boolean>;
  saveSpecialist: (spec: Partial<Specialist>) => Promise<boolean>;
  deletePublication: (id: string) => Promise<boolean>;
  deleteSpecialist: (id: string) => Promise<boolean>;
  importPublications: (parsedPubs: any[]) => Promise<{ successCount: number; skippedCount: number }>;
  importEfemerides: (parsedEfemerides: any[]) => Promise<{ successCount: number; skippedCount: number }>;
  saveMonthlyLink: (mes: number, anio: number, urlCanva: string | null) => Promise<boolean>;
  saveFixedLink: (link: Partial<FixedLink>) => Promise<boolean>;
  deleteFixedLink: (id: string) => Promise<boolean>;
  fetchData: () => Promise<void>;
  conflictNotification: string | null;
  setConflictNotification: (msg: string | null) => void;
  // Navigation & Focus
  activeTab: 'planificador' | 'especialistas' | 'historial';
  setActiveTab: (tab: 'planificador' | 'especialistas' | 'historial') => void;
  focusedPublicationId: string | null;
  setFocusedPublicationId: (id: string | null) => void;
  isReadOnly: boolean;
  setIsReadOnly: (readOnly: boolean) => void;
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
  const [monthlyLinks, setMonthlyLinks] = useState<MonthlyLink[]>([]);
  const [fixedLinks, setFixedLinks] = useState<FixedLink[]>([]);
  const [hasFixedLinksTable, setHasFixedLinksTable] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('syncing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'planificador' | 'especialistas' | 'historial'>('planificador');
  const [focusedPublicationId, setFocusedPublicationId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(() => {
    return localStorage.getItem('ocupamor_readonly') === 'true';
  });
  
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
        .select('*');
      if (listErr) throw listErr;
      
      const mappedSpecs = (listData || []).map(record => {
        const specIds = record.especialidades_ids || (record.especialidad_id ? [record.especialidad_id] : []);
        const matchedSpecs = specData?.filter(s => specIds.includes(s.id)) || [];
        return {
          ...record,
          especialidades: matchedSpecs
        } as Specialist;
      });
      setSpecialists(mappedSpecs);

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

      // 5. Fetch monthly links
      const { data: linkData, error: linkErr } = await supabase
        .from('enlaces_mensuales')
        .select('*');
      if (linkErr) throw linkErr;
      setMonthlyLinks(linkData || []);

      // 6. Check and fetch fixed links (Hybrid mode)
      let hasTable = false;
      try {
        const { data: fixedData, error: fixedErr } = await supabase
          .from('enlaces_fijos')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (!fixedErr) {
          hasTable = true;
          setFixedLinks(fixedData || []);
          setHasFixedLinksTable(true);
        } else {
          console.warn('Fixed links table not found or not accessible. Using fallback JSON storage in monthly links.', fixedErr.message);
          setHasFixedLinksTable(false);
        }
      } catch (err) {
        console.warn('Error checking enlaces_fijos table, falling back.', err);
        setHasFixedLinksTable(false);
      }

      if (!hasTable) {
        const fallbackRecord = (linkData || []).find(l => l.mes === 12 && l.anio === 9999);
        if (fallbackRecord && fallbackRecord.url_canva) {
          try {
            setFixedLinks(JSON.parse(fallbackRecord.url_canva) as FixedLink[]);
          } catch (e) {
            console.error('Error parsing fixed links fallback JSON:', e);
            setFixedLinks([]);
          }
        } else {
          setFixedLinks([]);
        }
      }

      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Error fetching data from Supabase:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error de conexión con la base de datos.');
    }
  };

  const specialtiesRef = useRef(specialties);
  useEffect(() => {
    specialtiesRef.current = specialties;
  }, [specialties]);

  useEffect(() => {
    fetchData();

    // 5. Setup Realtime subscriptions
    const pubChannel = supabase.channel('realtime-publications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        setPublications(current => {
          if (eventType === 'INSERT') {
            // Check for duplicates
            if (current.some(p => p.id === newRecord.id)) return current;
            
            // Append with specialty joined
            const specialtyObj = specialtiesRef.current.find(s => s.id === newRecord.especialidad_id);
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

            const specialtyObj = specialtiesRef.current.find(s => s.id === newRecord.especialidad_id);
            return current.map(p => p.id === newRecord.id ? { ...newRecord, especialidades: specialtyObj } as Publication : p);
          }
          if (eventType === 'DELETE') {
            return current.filter(p => p.id !== oldRecord.id);
          }
          return current;
        });
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('Realtime channel warning: Publications replication offline. Falling back to REST polling.');
        } else if (status === 'SUBSCRIBED') {
          console.log('Realtime channel subscribed.');
        }
      });

    const specChannel = supabase.channel('realtime-specialists-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'especialistas' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        setSpecialists(current => {
          if (eventType === 'INSERT') {
            if (current.some(s => s.id === newRecord.id)) return current;
            const specIds = newRecord.especialidades_ids || (newRecord.especialidad_id ? [newRecord.especialidad_id] : []);
            const matchedSpecs = specialtiesRef.current.filter(s => specIds.includes(s.id));
            const inserted = { ...newRecord, especialidades: matchedSpecs } as Specialist;
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

            const specIds = newRecord.especialidades_ids || (newRecord.especialidad_id ? [newRecord.especialidad_id] : []);
            const matchedSpecs = specialtiesRef.current.filter(s => specIds.includes(s.id));
            return current.map(s => s.id === newRecord.id ? { ...newRecord, especialidades: matchedSpecs } as Specialist : s);
          }
          if (eventType === 'DELETE') {
            return current.filter(s => s.id !== oldRecord.id);
          }
          return current;
        });
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('Realtime channel warning: Specialists replication offline. Falling back to REST polling.');
        }
      });

    const linkChannel = supabase.channel('realtime-links-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enlaces_mensuales' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        setMonthlyLinks(current => {
          if (eventType === 'INSERT') {
            if (current.some(l => l.id === newRecord.id)) return current;
            return [...current, newRecord as MonthlyLink];
          }
          if (eventType === 'UPDATE') {
            return current.map(l => l.id === newRecord.id ? (newRecord as MonthlyLink) : l);
          }
          if (eventType === 'DELETE') {
            return current.filter(l => l.id !== oldRecord.id);
          }
          return current;
        });
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('Realtime channel warning: Monthly links replication offline. Falling back to REST polling.');
        }
      });

    return () => {
      supabase.removeChannel(pubChannel);
      supabase.removeChannel(specChannel);
      supabase.removeChannel(linkChannel);
    };
  }, []);

  // Setup Realtime subscription for enlaces_fijos if table exists
  useEffect(() => {
    if (!hasFixedLinksTable) return;

    const fixedChannel = supabase.channel('realtime-fixed-links-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enlaces_fijos' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        setFixedLinks(current => {
          if (eventType === 'INSERT') {
            if (current.some(l => l.id === newRecord.id)) return current;
            return [...current, newRecord as FixedLink];
          }
          if (eventType === 'UPDATE') {
            return current.map(l => l.id === newRecord.id ? (newRecord as FixedLink) : l);
          }
          if (eventType === 'DELETE') {
            return current.filter(l => l.id !== oldRecord.id);
          }
          return current;
        });
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('Realtime channel warning: Fixed links replication offline. Falling back to REST polling.');
        }
      });

    return () => {
      supabase.removeChannel(fixedChannel);
    };
  }, [hasFixedLinksTable]);

  // Keep fixed links in sync with monthly links when using the fallback JSON storage
  useEffect(() => {
    if (!hasFixedLinksTable) {
      const record = monthlyLinks.find(l => l.mes === 12 && l.anio === 9999);
      if (record && record.url_canva) {
        try {
          const parsed = JSON.parse(record.url_canva) as FixedLink[];
          if (JSON.stringify(parsed) !== JSON.stringify(fixedLinks)) {
            setFixedLinks(parsed);
          }
        } catch (e) {
          console.error('Error parsing fallback fixed links:', e);
        }
      } else {
        if (fixedLinks.length > 0) {
          setFixedLinks([]);
        }
      }
    }
  }, [monthlyLinks, hasFixedLinksTable, fixedLinks]);

  // Operations: Publications
  const savePublication = async (pub: Partial<Publication>) => {
    setSyncStatus('syncing');
    try {
      const isNew = !pub.id || pub.id === '';
      const payload = {
        ...pub,
        updated_at: new Date().toISOString()
      };

      if (isNew) {
        delete payload.id;
      }

      if (payload.deadline === '') {
        payload.deadline = null;
      }

      if ('especialidades' in payload) {
        delete payload.especialidades;
      }

      let data, error;
      if (isNew) {
        ({ data, error } = await supabase.from('publicaciones').insert(payload).select());
      } else {
        ({ data, error } = await supabase.from('publicaciones').update(payload).eq('id', pub.id).select());
      }

      if (error) throw error;

      if (data && data.length > 0) {
        const savedRecord = data[0];
        setPublications(current => {
          const specialtyObj = specialtiesRef.current.find(s => s.id === savedRecord.especialidad_id);
          const formatted = { ...savedRecord, especialidades: specialtyObj } as Publication;
          if (isNew) {
            if (current.some(p => p.id === formatted.id)) return current;
            return [...current, formatted];
          } else {
            return current.map(p => p.id === formatted.id ? formatted : p);
          }
        });
      }

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
      
      setPublications(current => current.filter(p => p.id !== id));
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

      if (payload.fecha_cumpleanos === '') {
        payload.fecha_cumpleanos = null;
      }

      if (payload.especialidades_ids && payload.especialidades_ids.length > 0) {
        payload.especialidad_id = payload.especialidades_ids[0];
      } else {
        payload.especialidad_id = null;
      }

      if ('especialidades' in payload) {
        delete payload.especialidades;
      }

      let data, error;
      if (isNew) {
        ({ data, error } = await supabase.from('especialistas').insert(payload).select());
      } else {
        ({ data, error } = await supabase.from('especialistas').update(payload).eq('id', spec.id).select());
      }

      if (error) throw error;

      if (data && data.length > 0) {
        const savedRecord = data[0];
        setSpecialists(current => {
          const specIds = savedRecord.especialidades_ids || (savedRecord.especialidad_id ? [savedRecord.especialidad_id] : []);
          const matchedSpecs = specialtiesRef.current.filter(s => specIds.includes(s.id));
          const formatted = { ...savedRecord, especialidades: matchedSpecs } as Specialist;
          if (isNew) {
            if (current.some(s => s.id === formatted.id)) return current;
            return [...current, formatted];
          } else {
            return current.map(s => s.id === formatted.id ? formatted : s);
          }
        });
      }

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
      
      setSpecialists(current => current.filter(s => s.id !== id));
      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      console.error('Error deleting specialist:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error al eliminar especialista.');
      return false;
    }
  };

  // Bulk imports
  const importPublications = async (parsedPubs: any[]) => {
    setSyncStatus('syncing');
    try {
      // Fetch existing publications to filter duplicates
      const { data: existingPubs, error: fetchErr } = await supabase
        .from('publicaciones')
        .select('mes, anio, titulo');

      if (fetchErr) throw fetchErr;

      const normalizeText = (t: string) => {
        if (!t) return '';
        return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      };

      const existingSet = new Set(
        existingPubs.map(p => `${p.mes}_${p.anio}_${normalizeText(p.titulo)}`)
      );

      const filteredInserts = parsedPubs.filter(p => {
        const key = `${p.mes}_${p.anio}_${normalizeText(p.titulo)}`;
        return !existingSet.has(key);
      });

      if (filteredInserts.length === 0) {
        setSyncStatus('synced');
        return { successCount: 0, skippedCount: parsedPubs.length };
      }

      const { data: insertedData, error: insertErr } = await supabase
        .from('publicaciones')
        .insert(filteredInserts)
        .select();

      if (insertErr) throw insertErr;

      if (insertedData && insertedData.length > 0) {
        const formatted = insertedData.map(record => {
          const specialtyObj = specialtiesRef.current.find(s => s.id === record.especialidad_id);
          return { ...record, especialidades: specialtyObj } as Publication;
        });

        setPublications(current => {
          const currentIds = new Set(current.map(p => p.id));
          const newOnly = formatted.filter(p => !currentIds.has(p.id));
          return [...current, ...newOnly];
        });
      }

      setSyncStatus('synced');
      return { successCount: insertedData?.length || 0, skippedCount: parsedPubs.length - (insertedData?.length || 0) };
    } catch (err: any) {
      console.error('Error importing publications:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error al importar las publicaciones.');
      throw err;
    }
  };

  const importEfemerides = async (parsedEfemerides: any[]) => {
    setSyncStatus('syncing');
    try {
      // Fetch existing efemerides
      const { data: existingEfemerides, error: fetchErr } = await supabase
        .from('efemerides')
        .select('nombre, dia, mes');

      if (fetchErr) throw fetchErr;

      const normalizeText = (t: string) => {
        if (!t) return '';
        return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      };

      const existingSet = new Set(
        existingEfemerides.map(e => `${e.dia}_${e.mes}_${normalizeText(e.nombre)}`)
      );

      const filteredInserts = parsedEfemerides.filter(e => {
        const key = `${e.dia}_${e.mes}_${normalizeText(e.nombre)}`;
        return !existingSet.has(key);
      });

      if (filteredInserts.length === 0) {
        setSyncStatus('synced');
        return { successCount: 0, skippedCount: parsedEfemerides.length };
      }

      const { data: insertedData, error: insertErr } = await supabase
        .from('efemerides')
        .insert(filteredInserts)
        .select();

      if (insertErr) throw insertErr;

      if (insertedData && insertedData.length > 0) {
        setEfemerides(current => {
          const currentIds = new Set(current.map(e => e.id));
          const newOnly = (insertedData as Efemeride[]).filter(e => !currentIds.has(e.id));
          return [...current, ...newOnly];
        });
      }

      setSyncStatus('synced');
      return { successCount: insertedData?.length || 0, skippedCount: parsedEfemerides.length - (insertedData?.length || 0) };
    } catch (err: any) {
      console.error('Error importing efemerides:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error al importar las efemérides.');
      throw err;
    }
  };

  const saveMonthlyLink = async (mes: number, anio: number, urlCanva: string | null) => {
    setSyncStatus('syncing');
    try {
      const { data, error } = await supabase
        .from('enlaces_mensuales')
        .upsert({ mes, anio, url_canva: urlCanva }, { onConflict: 'mes,anio' })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setMonthlyLinks(current => {
          const updated = data[0] as MonthlyLink;
          if (current.some(l => l.id === updated.id || (l.mes === updated.mes && l.anio === updated.anio))) {
            return current.map(l => (l.id === updated.id || (l.mes === updated.mes && l.anio === updated.anio)) ? updated : l);
          } else {
            return [...current, updated];
          }
        });
      }

      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      console.error('Error saving monthly link:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error al guardar el enlace de Canva.');
      return false;
    }
  };

  const saveFixedLink = async (link: Partial<FixedLink>) => {
    setSyncStatus('syncing');
    try {
      if (hasFixedLinksTable) {
        // Native table mode
        const isNew = !link.id;
        const payload = {
          ...link,
          updated_at: new Date().toISOString()
        };
        if (isNew) {
          delete payload.id;
        }

        let data, error;
        if (isNew) {
          ({ data, error } = await supabase.from('enlaces_fijos').insert(payload).select());
        } else {
          ({ data, error } = await supabase.from('enlaces_fijos').update(payload).eq('id', link.id).select());
        }

        if (error) throw error;

        if (data && data.length > 0) {
          const saved = data[0] as FixedLink;
          setFixedLinks(current => {
            if (isNew) {
              if (current.some(l => l.id === saved.id)) return current;
              return [...current, saved];
            } else {
              return current.map(l => l.id === saved.id ? saved : l);
            }
          });
        }
      } else {
        // Fallback JSON mode in enlaces_mensuales (mes = 12, anio = 9999)
        const record = monthlyLinks.find(l => l.mes === 12 && l.anio === 9999);
        let currentLinks: FixedLink[] = [];
        if (record && record.url_canva) {
          try {
            currentLinks = JSON.parse(record.url_canva);
          } catch (e) {
            console.error(e);
          }
        }

        const isNew = !link.id;
        let updatedLink: FixedLink;
        let newLinks: FixedLink[];

        if (isNew) {
          updatedLink = {
            id: Math.random().toString(36).substring(2, 11),
            nombre: link.nombre || '',
            url: link.url || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          newLinks = [...currentLinks, updatedLink];
        } else {
          updatedLink = {
            ...(currentLinks.find(l => l.id === link.id) || {}),
            ...link,
            updated_at: new Date().toISOString()
          } as FixedLink;
          newLinks = currentLinks.map(l => l.id === link.id ? updatedLink : l);
        }

        const jsonStr = JSON.stringify(newLinks);
        const { data, error } = await supabase
          .from('enlaces_mensuales')
          .upsert({ mes: 12, anio: 9999, url_canva: jsonStr }, { onConflict: 'mes,anio' })
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setMonthlyLinks(current => {
            const updated = data[0] as MonthlyLink;
            if (current.some(l => l.id === updated.id || (l.mes === updated.mes && l.anio === updated.anio))) {
              return current.map(l => (l.id === updated.id || (l.mes === updated.mes && l.anio === updated.anio)) ? updated : l);
            } else {
              return [...current, updated];
            }
          });
        }
      }

      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      console.error('Error saving fixed link:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error al guardar el enlace fijo.');
      return false;
    }
  };

  const deleteFixedLink = async (id: string) => {
    setSyncStatus('syncing');
    try {
      if (hasFixedLinksTable) {
        // Native table mode
        const { error } = await supabase.from('enlaces_fijos').delete().eq('id', id);
        if (error) throw error;

        setFixedLinks(current => current.filter(l => l.id !== id));
      } else {
        // Fallback JSON mode
        const record = monthlyLinks.find(l => l.mes === 12 && l.anio === 9999);
        if (!record || !record.url_canva) return false;

        let currentLinks: FixedLink[] = [];
        try {
          currentLinks = JSON.parse(record.url_canva);
        } catch (e) {
          console.error(e);
        }

        const newLinks = currentLinks.filter(l => l.id !== id);
        const jsonStr = JSON.stringify(newLinks);

        const { data, error } = await supabase
          .from('enlaces_mensuales')
          .upsert({ mes: 12, anio: 9999, url_canva: jsonStr }, { onConflict: 'mes,anio' })
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setMonthlyLinks(current => {
            const updated = data[0] as MonthlyLink;
            if (current.some(l => l.id === updated.id || (l.mes === updated.mes && l.anio === updated.anio))) {
              return current.map(l => (l.id === updated.id || (l.mes === updated.mes && l.anio === updated.anio)) ? updated : l);
            } else {
              return [...current, updated];
            }
          });
        }
      }

      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      console.error('Error deleting fixed link:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Error al eliminar el enlace fijo.');
      return false;
    }
  };

  return (
    <DataContext.Provider value={{
      publications,
      specialists,
      specialties,
      efemerides,
      monthlyLinks,
      fixedLinks,
      hasFixedLinksTable,
      syncStatus,
      errorMessage,
      activeEditing,
      setActiveEditing,
      savePublication,
      saveSpecialist,
      deletePublication,
      deleteSpecialist,
      importPublications,
      importEfemerides,
      saveMonthlyLink,
      saveFixedLink,
      deleteFixedLink,
      fetchData,
      conflictNotification,
      setConflictNotification,
      activeTab,
      setActiveTab,
      focusedPublicationId,
      setFocusedPublicationId,
      isReadOnly,
      setIsReadOnly
    }}>
      {children}
    </DataContext.Provider>
  );
};
