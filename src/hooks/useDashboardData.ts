"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  supabase, 
  isSupabaseConfigured, 
  localDB,
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
      if (isSupabaseConfigured && supabase) {
        let activeSession = authSession;
        if (!activeSession) {
          activeSession = await refreshSession();
        }

        console.log("CURRENT SESSION:", activeSession);
        if (activeSession) {
          console.log("CURRENT USER ID (auth.uid()):", activeSession.user?.id);
        } else {
          console.warn("No active session found. Redirecting to /login...");
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return;
        }

        const { data, error } = await supabase
          .from("guests")
          .select("*");

        console.log("GUESTS DATA:", data);
        console.log("GUESTS ERROR:", error);

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

        console.log("GUESTS DATA:", guestsData);
        console.log("GUESTS ERROR:", guestsErr);

        if (guestsErr) console.warn('Supabase guests fetch:', guestsErr.message);
        if (eventsErr) console.warn('Supabase events fetch:', eventsErr.message);

        // Fall back to local DB if remote empty or errored
        const local = localDB.getDB();
        setGuests(guestsData ? (guestsData as Guest[]) : local.guests);
        setEvents(eventsData ? (eventsData as EventItem[]) : local.events);
        setTables(tablesData ? (tablesData as TableItem[]) : local.tables);
        setGifts(giftsData ? (giftsData as GiftItem[]) : local.gifts);
        setInvitations(invsData ? (invsData as InvitationItem[]) : local.invitations);
        setBudget(budgetData ? (budgetData as BudgetItem[]) : local.budget);
        setTotalBudgetGoal(local.total_budget || 1000000);
        setActivityLogs(logsData ? (logsData as ActivityLog[]) : local.activity_logs);
        setNotifications(notifsData ? (notifsData as NotificationItem[]) : local.notifications);
      } else {
        // Load from LocalDB
        const local = localDB.getDB();
        setGuests(local.guests);
        setEvents(local.events);
        setTables(local.tables);
        setGifts(local.gifts);
        setInvitations(local.invitations);
        setBudget(local.budget);
        setTotalBudgetGoal(local.total_budget || 1000000);
        setActivityLogs(local.activity_logs);
        setNotifications(local.notifications);
      }
      setError(null);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Error al cargar los datos del panel.');
      // Load fallback
      const local = localDB.getDB();
      setGuests(local.guests);
      setEvents(local.events);
      setTables(local.tables);
      setGifts(local.gifts);
      setInvitations(local.invitations);
      setBudget(local.budget);
      setActivityLogs(local.activity_logs);
      setNotifications(local.notifications);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Subscribe to local storage state updates
    const unsubscribeLocal = localDB.subscribe(() => {
      if (!isSupabaseConfigured) {
        const local = localDB.getDB();
        setGuests(local.guests);
        setEvents(local.events);
        setTables(local.tables);
        setGifts(local.gifts);
        setInvitations(local.invitations);
        setBudget(local.budget);
        setActivityLogs(local.activity_logs);
        setNotifications(local.notifications);
      }
    });

    // Realtime Supabase subscription if configured
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
      unsubscribeLocal();
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchData]);

  // Calculate live statistics
  const metrics: DashboardMetrics = useMemo(() => {
    // Total Guests: Exact count of guest records (persons)
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

    const invitationsSentCount = guests.filter(g => g.invitation_sent).length || invitations.filter(i => i.status !== 'sent').length || 15;
    const invitationsOpenedCount = guests.filter(g => g.invitation_opened).length || invitations.filter(i => i.status === 'opened' || i.status === 'accepted').length || 10;
    const invitationsAcceptedCount = guests.filter(g => g.status === 'confirmed').length || invitations.filter(i => i.status === 'accepted').length || 8;

    const budgetUsedTotal = budget.reduce((sum, b) => sum + (b.used || 0), 0);
    const sumAllocated = budget.reduce((sum, b) => sum + (b.allocated || 0), 0);
    const totalBudgetAllocated = totalBudgetGoal > 0 ? totalBudgetGoal : (sumAllocated || 1000000);
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

  // Actions with Optimistic UI updates
  const createGuest = async (guestData: Omit<Guest, 'id' | 'created_at' | 'updated_at'>) => {
    const tempId = 'g-temp-' + Date.now();
    const tempGuest: Guest = {
      ...guestData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Optimistic state update
    setGuests(prev => [tempGuest, ...prev]);

    try {
      if (isSupabaseConfigured && supabase) {
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
      } else {
        localDB.addGuest(guestData);
      }
    } catch (err: any) {
      console.error('Error creating guest:', err);
      // Revert optimistic update
      setGuests(prev => prev.filter(g => g.id !== tempId));
      throw err;
    }
  };

  const updateGuest = async (id: string, updates: Partial<Guest>) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g));

    try {
      if (isSupabaseConfigured && supabase) {
        await ensureAdminSession();
        const { error: updateErr } = await supabase
          .from('guests')
          .update(updates)
          .eq('id', id);

        if (updateErr) throw updateErr;
      } else {
        localDB.updateGuest(id, updates);
      }
    } catch (err: any) {
      console.error('Error updating guest:', err);
      fetchData();
      throw err;
    }
  };

  const deleteGuest = async (id: string) => {
    setGuests(prev => prev.filter(g => g.id !== id));

    try {
      if (isSupabaseConfigured && supabase) {
        await ensureAdminSession();
        const { error: deleteErr } = await supabase
          .from('guests')
          .delete()
          .eq('id', id);

        if (deleteErr) throw deleteErr;
      } else {
        localDB.deleteGuest(id);
      }
    } catch (err: any) {
      console.error('Error deleting guest:', err);
      fetchData();
      throw err;
    }
  };

  const deleteGuests = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setGuests(prev => prev.filter(g => !idSet.has(g.id)));

    try {
      if (isSupabaseConfigured && supabase) {
        await ensureAdminSession();
        const { error: deleteErr } = await supabase
          .from('guests')
          .delete()
          .in('id', ids);

        if (deleteErr) throw deleteErr;
      } else {
        ids.forEach(id => localDB.deleteGuest(id));
      }
    } catch (err: any) {
      console.error('Error batch deleting guests:', err);
      fetchData();
      throw err;
    }
  };

  const createEvent = async (eventData: Omit<EventItem, 'id' | 'created_at'>) => {
    const tempId = 'e-temp-' + Date.now();
    const tempEvent: EventItem = {
      ...eventData,
      id: tempId,
      created_at: new Date().toISOString()
    };

    setEvents(prev => [tempEvent, ...prev]);

    try {
      if (isSupabaseConfigured && supabase) {
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
      } else {
        localDB.addEvent(eventData);
      }
    } catch (err: any) {
      console.error('Error creating event:', err);
      setEvents(prev => prev.filter(e => e.id !== tempId));
      throw err;
    }
  };

  const createGift = async (giftData: Omit<GiftItem, 'id' | 'created_at'>) => {
    const tempId = 'gf-temp-' + Date.now();
    const tempGift: GiftItem = {
      ...giftData,
      id: tempId,
      created_at: new Date().toISOString()
    };

    setGifts(prev => [tempGift, ...prev]);

    try {
      if (isSupabaseConfigured && supabase) {
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
      } else {
        localDB.addGift(giftData);
      }
    } catch (err: any) {
      console.error('Error creating gift:', err);
      setGifts(prev => prev.filter(g => g.id !== tempId));
      throw err;
    }
  };

  const createBudgetItem = async (budgetData: Omit<BudgetItem, 'id' | 'created_at'>) => {
    const tempId = 'b-temp-' + Date.now();
    const tempItem: BudgetItem = {
      ...budgetData,
      id: tempId,
      created_at: new Date().toISOString()
    };

    setBudget(prev => [tempItem, ...prev]);

    try {
      if (isSupabaseConfigured && supabase) {
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
      } else {
        localDB.addBudgetItem(budgetData);
      }
    } catch (err: any) {
      console.error('Error creating budget item:', err);
      setBudget(prev => prev.filter(b => b.id !== tempId));
      throw err;
    }
  };

  const updateBudgetItem = async (id: string, updates: Partial<BudgetItem>) => {
    setBudget(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));

    try {
      if (isSupabaseConfigured && supabase) {
        await ensureAdminSession();
        const { error: updateErr } = await supabase
          .from('budget')
          .update(updates)
          .eq('id', id);

        if (updateErr) throw updateErr;
      } else {
        localDB.updateBudgetItem(id, updates);
      }
    } catch (err: any) {
      console.error('Error updating budget item:', err);
      fetchData();
      throw err;
    }
  };

  const deleteBudgetItem = async (id: string) => {
    setBudget(prev => prev.filter(b => b.id !== id));

    try {
      if (isSupabaseConfigured && supabase) {
        await ensureAdminSession();
        const { error: deleteErr } = await supabase
          .from('budget')
          .delete()
          .eq('id', id);

        if (deleteErr) throw deleteErr;
      } else {
        localDB.deleteBudgetItem(id);
      }
    } catch (err: any) {
      console.error('Error deleting budget item:', err);
      fetchData();
      throw err;
    }
  };

  const setTotalBudget = async (amount: number) => {
    setTotalBudgetGoal(amount);
    localDB.setTotalBudget(amount);
  };

  const markNotificationRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (isSupabaseConfigured && supabase) {
      await ensureAdminSession();
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    } else {
      localDB.markNotificationRead(id);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (isSupabaseConfigured && supabase) {
      await ensureAdminSession();
      await supabase.from('notifications').update({ read: true }).neq('read', true);
    } else {
      localDB.markAllNotificationsRead();
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
