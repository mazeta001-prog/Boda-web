"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  supabase, 
  isSupabaseConfigured, 
  ensureAdminSession 
} from '@/lib/supabaseClient';
import { 
  Guest, 
  EventItem, 
  TableItem, 
  GiftItem, 
  InvitationItem, 
  BudgetItem, 
  ActivityLog, 
  NotificationItem, 
  DashboardMetrics,
  SearchResults 
} from '@/types/database';

import { useAuth } from '@/context/AuthContext';

export function useDashboardData() {
  const { session: authSession, refreshSession } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [totalBudgetGoal, setTotalBudgetGoal] = useState<number>(1000000);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Refresh data function
  const fetchData = useCallback(async () => {
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase no está configurado correctamente en las variables de entorno.');
      }

      let activeSession = authSession;
      if (!activeSession) {
        activeSession = await refreshSession();
      }

      if (!activeSession) {
        console.warn("No active session found. Redirecting to /login...");
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return;
      }

      const [
        { data: guestsData, error: guestsErr },
        { data: eventsData, error: eventsErr },
        { data: tablesData, error: tablesErr },
        { data: giftsData, error: giftsErr },
        { data: invsData, error: invsErr },
        { data: budgetData, error: budgetErr },
        { data: logsData, error: logsErr },
        { data: notifsData, error: notifsErr }
      ] = await Promise.all([
        supabase.from('guests').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('*').order('date', { ascending: true }),
        supabase.from('tables').select('*').order('created_at', { ascending: true }),
        supabase.from('gifts').select('*').order('created_at', { ascending: false }),
        supabase.from('invitations').select('*').order('created_at', { ascending: false }),
        supabase.from('budget').select('*').order('created_at', { ascending: true }),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false })
      ]);

      if (guestsErr) console.error('Error al cargar invitados desde Supabase:', guestsErr.message);
      if (eventsErr) console.error('Error al cargar eventos desde Supabase:', eventsErr.message);
      if (tablesErr) console.error('Error al cargar mesas desde Supabase:', tablesErr.message);
      if (giftsErr) console.error('Error al cargar regalos desde Supabase:', giftsErr.message);
      if (invsErr) console.error('Error al cargar invitaciones desde Supabase:', invsErr.message);
      if (budgetErr) console.error('Error al cargar presupuesto desde Supabase:', budgetErr.message);
      if (logsErr) console.error('Error al cargar historial desde Supabase:', logsErr.message);
      if (notifsErr) console.error('Error al cargar notificaciones desde Supabase:', notifsErr.message);

      const hasCriticalError = guestsErr || eventsErr || tablesErr || giftsErr || budgetErr;

      setGuests((guestsData as Guest[]) || []);
      setEvents((eventsData as EventItem[]) || []);
      setTables((tablesData as TableItem[]) || []);
      setGifts((giftsData as GiftItem[]) || []);
      setInvitations((invsData as InvitationItem[]) || []);
      setBudget((budgetData as BudgetItem[]) || []);
      setActivityLogs((logsData as ActivityLog[]) || []);
      setNotifications((notifsData as NotificationItem[]) || []);

      if (hasCriticalError) {
        setError('Error al consultar datos en la base de datos de Supabase.');
      } else {
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data from Supabase:', err);
      setError(err.message || 'Error al conectar con la base de datos de Supabase.');
      setGuests([]);
      setEvents([]);
      setTables([]);
      setGifts([]);
      setInvitations([]);
      setBudget([]);
      setActivityLogs([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [authSession, refreshSession]);

  useEffect(() => {
    fetchData();

    // Realtime Supabase subscription
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          () => {
            fetchData();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchData]);

  // Calculate live statistics
  const metrics: DashboardMetrics = useMemo(() => {
    const totalGuestsCount = guests.length;

    const confirmedGuestsCount = guests.filter(g => g.status === 'confirmed').length;
    const pendingGuestsCount = guests.filter(g => g.status === 'pending').length;
    const declinedGuestsCount = guests.filter(g => g.status === 'declined').length;

    const totalEventsCount = events.length;
    const guestsPerEventAvg = totalEventsCount > 0 
      ? Math.round((confirmedGuestsCount || totalGuestsCount) / totalEventsCount) 
      : 0;

    const totalTablesCount = tables.length;
    const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
    const occupiedSeatsCount = tables.reduce((sum, t) => sum + (t.occupied_seats || 0), 0);
    const remainingSeatsCount = Math.max(0, totalCapacity - occupiedSeatsCount);

    const giftsReservedCount = gifts.filter(g => g.status === 'reserved').length;
    const giftsPurchasedCount = gifts.filter(g => g.status === 'purchased').length;

    const invitationsSentCount = guests.filter(g => g.invitation_sent).length || invitations.filter(i => i.status !== 'sent').length;
    const invitationsOpenedCount = guests.filter(g => g.invitation_opened).length || invitations.filter(i => i.status === 'opened' || i.status === 'accepted').length;
    const invitationsAcceptedCount = guests.filter(g => g.status === 'confirmed').length || invitations.filter(i => i.status === 'accepted').length;

    const budgetUsedTotal = budget.reduce((sum, b) => sum + (b.used || 0), 0);
    const sumAllocated = budget.reduce((sum, b) => sum + (b.allocated || 0), 0);
    const totalBudgetAllocated = totalBudgetGoal > 0 ? totalBudgetGoal : sumAllocated;
    const budgetRemainingTotal = Math.max(0, totalBudgetAllocated - budgetUsedTotal);

    return {
      totalGuests: totalGuestsCount,
      confirmedGuests: confirmedGuestsCount,
      pendingGuests: pendingGuestsCount,
      declinedGuests: declinedGuestsCount,
      totalEvents: totalEventsCount,
      guestsPerEvent: guestsPerEventAvg,
      totalTables: totalTablesCount,
      occupiedSeats: occupiedSeatsCount,
      remainingSeats: remainingSeatsCount,
      giftsReserved: giftsReservedCount,
      giftsPurchased: giftsPurchasedCount,
      invitationsSent: invitationsSentCount,
      invitationsOpened: invitationsOpenedCount,
      invitationsAccepted: invitationsAcceptedCount,
      budgetUsed: budgetUsedTotal,
      budgetRemaining: budgetRemainingTotal,
      totalBudgetAllocated
    };
  }, [guests, events, tables, gifts, invitations, budget, totalBudgetGoal]);

  // Global search function
  const searchAll = useCallback((query: string): SearchResults => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { guests: [], events: [], tables: [], gifts: [] };
    }

    return {
      guests: guests.filter(g => 
        g.full_name.toLowerCase().includes(q) || 
        g.email?.toLowerCase().includes(q) ||
        g.status.toLowerCase().includes(q)
      ),
      events: events.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.location.toLowerCase().includes(q)
      ),
      tables: tables.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.location_zone?.toLowerCase().includes(q)
      ),
      gifts: gifts.filter(gf => 
        gf.title.toLowerCase().includes(q) || 
        gf.category?.toLowerCase().includes(q) ||
        gf.reserved_by?.toLowerCase().includes(q)
      )
    };
  }, [guests, events, tables, gifts]);

  // Actions with Optimistic UI updates (bound strictly to Supabase)
  const createGuest = async (guestData: Omit<Guest, 'id' | 'created_at' | 'updated_at'>) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.');
    }
    const tempId = 'g-temp-' + Date.now();
    const tempGuest: Guest = {
      ...guestData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setGuests(prev => [tempGuest, ...prev]);

    try {
      await ensureAdminSession();
      const { data, error: insertErr } = await supabase
        .from('guests')
        .insert([guestData])
        .select()
        .single();

      if (insertErr) throw insertErr;
      if (data) {
        setGuests(prev => prev.map(g => g.id === tempId ? (data as Guest) : g));
      }
    } catch (err: any) {
      console.error('Error creating guest in Supabase:', err);
      setGuests(prev => prev.filter(g => g.id !== tempId));
      throw err;
    }
  };

  const updateGuest = async (id: string, updates: Partial<Guest>) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.');
    }
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g));

    try {
      await ensureAdminSession();
      const { error: updateErr } = await supabase
        .from('guests')
        .update(updates)
        .eq('id', id);

      if (updateErr) throw updateErr;
    } catch (err: any) {
      console.error('Error updating guest in Supabase:', err);
      fetchData();
      throw err;
    }
  };

  const deleteGuest = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.');
    }
    setGuests(prev => prev.filter(g => g.id !== id));

    try {
      await ensureAdminSession();
      const { error: deleteErr } = await supabase
        .from('guests')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;
    } catch (err: any) {
      console.error('Error deleting guest in Supabase:', err);
      fetchData();
      throw err;
    }
  };

  const deleteGuests = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.');
    }
    const idSet = new Set(ids);
    setGuests(prev => prev.filter(g => !idSet.has(g.id)));

    try {
      await ensureAdminSession();
      const { error: deleteErr } = await supabase
        .from('guests')
        .delete()
        .in('id', ids);

      if (deleteErr) throw deleteErr;
    } catch (err: any) {
      console.error('Error batch deleting guests in Supabase:', err);
      fetchData();
      throw err;
    }
  };

  const createEvent = async (eventData: Omit<EventItem, 'id' | 'created_at'>) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.');
    }
    const tempId = 'e-temp-' + Date.now();
    const tempEvent: EventItem = {
      ...eventData,
      id: tempId,
      created_at: new Date().toISOString()
    };

    setEvents(prev => [tempEvent, ...prev]);

    try {
      await ensureAdminSession();
      const { data, error: insertErr } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (insertErr) throw insertErr;
      if (data) {
        setEvents(prev => prev.map(e => e.id === tempId ? (data as EventItem) : e));
      }
    } catch (err: any) {
      console.error('Error creating event in Supabase:', err);
      setEvents(prev => prev.filter(e => e.id !== tempId));
      throw err;
    }
  };

  const createGift = async (giftData: Omit<GiftItem, 'id' | 'created_at'>) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.');
    }
    const tempId = 'gf-temp-' + Date.now();
    const tempGift: GiftItem = {
      ...giftData,
      id: tempId,
      created_at: new Date().toISOString()
    };

    setGifts(prev => [tempGift, ...prev]);

    try {
      await ensureAdminSession();
      const { data, error: insertErr } = await supabase
        .from('gifts')
        .insert([giftData])
        .select()
        .single();

      if (insertErr) throw insertErr;
      if (data) {
        setGifts(prev => prev.map(g => g.id === tempId ? (data as GiftItem) : g));
      }
    } catch (err: any) {
      console.error('Error creating gift in Supabase:', err);
      setGifts(prev => prev.filter(g => g.id !== tempId));
      throw err;
    }
  };

  const createBudgetItem = async (budgetData: Omit<BudgetItem, 'id' | 'created_at'>) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.');
    }
    const tempId = 'b-temp-' + Date.now();
    const tempItem: BudgetItem = {
      ...budgetData,
      id: tempId,
      created_at: new Date().toISOString()
    };

    setBudget(prev => [tempItem, ...prev]);

    try {
      await ensureAdminSession();
      const { data, error: insertErr } = await supabase
        .from('budget')
        .insert([budgetData])
        .select()
        .single();

      if (insertErr) throw insertErr;
      if (data) {
        setBudget(prev => prev.map(b => b.id === tempId ? (data as BudgetItem) : b));
      }
    } catch (err: any) {
      console.error('Error creating budget item in Supabase:', err);
      setBudget(prev => prev.filter(b => b.id !== tempId));
      throw err;
    }
  };

  const updateBudgetItem = async (id: string, updates: Partial<BudgetItem>) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.');
    }
    setBudget(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));

    try {
      await ensureAdminSession();
      const { error: updateErr } = await supabase
        .from('budget')
        .update(updates)
        .eq('id', id);

      if (updateErr) throw updateErr;
    } catch (err: any) {
      console.error('Error updating budget item in Supabase:', err);
      fetchData();
      throw err;
    }
  };

  const deleteBudgetItem = async (id: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado.');
    }
    setBudget(prev => prev.filter(b => b.id !== id));

    try {
      await ensureAdminSession();
      const { error: deleteErr } = await supabase
        .from('budget')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;
    } catch (err: any) {
      console.error('Error deleting budget item in Supabase:', err);
      fetchData();
      throw err;
    }
  };

  const setTotalBudget = async (amount: number) => {
    setTotalBudgetGoal(amount);
  };

  const markNotificationRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (isSupabaseConfigured && supabase) {
      await ensureAdminSession();
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (isSupabaseConfigured && supabase) {
      await ensureAdminSession();
      await supabase.from('notifications').update({ read: true }).neq('read', true);
    }
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  return {
    loading,
    error,
    metrics,
    guests,
    events,
    tables,
    gifts,
    invitations,
    budget,
    totalBudgetGoal,
    activityLogs,
    notifications,
    unreadNotificationsCount,
    refetch: fetchData,
    searchAll,
    createGuest,
    updateGuest,
    deleteGuest,
    deleteGuests,
    createEvent,
    createGift,
    createBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    setTotalBudget,
    markNotificationRead,
    markAllNotificationsRead
  };
}

