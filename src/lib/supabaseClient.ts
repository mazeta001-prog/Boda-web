import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Guest, 
  EventItem, 
  TableItem, 
  GiftItem, 
  InvitationItem, 
  BudgetItem, 
  ActivityLog, 
  NotificationItem,
  ActivityActionType 
} from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local persistent storage key for demo/fallback production readiness when Supabase credentials are pending
const STORAGE_KEY = 'wedding_dashboard_db_v4';

export interface DBState {
  guests: Guest[];
  events: EventItem[];
  tables: TableItem[];
  gifts: GiftItem[];
  invitations: InvitationItem[];
  budget: BudgetItem[];
  total_budget?: number;
  activity_logs: ActivityLog[];
  notifications: NotificationItem[];
}

const INITIAL_DB: DBState = {
  guests: [
    {
      id: 'g-1',
      full_name: 'Sofia García',
      nickname: 'Sofi',
      category: 'Familia',
      email: 'sofia.garcia@example.com',
      phone: '+34 612 345 678',
      status: 'confirmed',
      event_id: 'e-1',
      table_id: 't-1',
      companions_count: 3,
      dietary_restrictions: 'Sin gluten',
      invitation_sent: true,
      invitation_opened: true,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'g-2',
      full_name: 'Javier Martínez',
      nickname: 'Javi',
      category: 'Amigos',
      email: 'javier.m@example.com',
      phone: '+34 622 987 654',
      status: 'declined',
      event_id: 'e-1',
      table_id: undefined,
      companions_count: 0,
      dietary_restrictions: 'Ninguna',
      invitation_sent: true,
      invitation_opened: true,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'g-3',
      full_name: 'Carlos & Elena',
      nickname: 'Carlitos',
      category: 'Familia',
      email: 'carlos.elena@example.com',
      phone: '+34 633 111 222',
      status: 'confirmed',
      event_id: 'e-1',
      table_id: 't-2',
      companions_count: 1,
      dietary_restrictions: 'Vegetariano',
      invitation_sent: true,
      invitation_opened: true,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 'g-4',
      full_name: 'Lucía Fernández',
      nickname: 'Lu',
      category: 'Amigos',
      email: 'lucia.f@example.com',
      status: 'pending',
      event_id: 'e-1',
      companions_count: 1,
      invitation_sent: true,
      invitation_opened: false,
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
    {
      id: 'g-5',
      full_name: 'Mateo Ruiz',
      nickname: 'Teo',
      category: 'Conocidos',
      email: 'mateo.ruiz@example.com',
      status: 'confirmed',
      event_id: 'e-2',
      table_id: 't-1',
      companions_count: 2,
      invitation_sent: true,
      invitation_opened: true,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    }
  ],
  events: [],
  tables: [],
  gifts: [],
  invitations: [],
  budget: [
    {
      id: 'b-1',
      category: 'Catering & Banquete',
      allocated: 450000,
      used: 350000,
      notes: 'Reserva 80% pagada',
      created_at: new Date().toISOString()
    },
    {
      id: 'b-2',
      category: 'Fotografía & Vídeo',
      allocated: 120000,
      used: 75000,
      notes: 'Señal entregada',
      created_at: new Date().toISOString()
    },
    {
      id: 'b-3',
      category: 'Música & DJ',
      allocated: 85000,
      used: 50000,
      notes: 'Contrato firmado',
      created_at: new Date().toISOString()
    },
    {
      id: 'b-4',
      category: 'Flores & Decoración',
      allocated: 110000,
      used: 70000,
      notes: 'Centros de mesa pagados',
      created_at: new Date().toISOString()
    },
    {
      id: 'b-5',
      category: 'Vestuario & Estilismo',
      allocated: 150000,
      used: 110000,
      notes: 'Vestido y traje abonados',
      created_at: new Date().toISOString()
    }
  ],
  total_budget: 1000000,
  activity_logs: [
    {
      id: 'act-1',
      action_type: 'invitation_accepted',
      user_name: 'Sofia García',
      details: 'Confirmó su asistencia con 3 acompañantes',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'Nueva confirmación de asistencia',
      message: 'Sofia García ha confirmado asistencia con 3 acompañantes.',
      type: 'success',
      read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    }
  ]
};

// Helper to normalize strings for exact matching:
// 1. Lowercase
// 2. Trim leading/trailing spaces
// 3. Replace multiple spaces with a single space
// 4. Remove accents
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

class LocalDBManager {
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
      }
    }
  }

  getDB(): DBState {
    if (typeof window === 'undefined') return INITIAL_DB;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : INITIAL_DB;
    } catch (e) {
      console.error('Error loading DB from localStorage', e);
      return INITIAL_DB;
    }
  }

  saveDB(db: DBState) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        this.notify();
      } catch (e) {
        console.error('Error saving DB to localStorage', e);
      }
    }
  }

  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // Exact Match lookup for First Name + Last Name
  findExactGuestByFirstAndLastName(firstName: string, lastName: string): Guest | null {
    const db = this.getDB();
    const target = normalizeString(`${firstName} ${lastName}`);
    if (!target) return null;

    return db.guests.find(g => {
      const normFullName = normalizeString(g.full_name);
      const normFullNameSansAmp = normalizeString(g.full_name.replace(/&/g, ' '));
      return normFullName === target || normFullNameSansAmp === target;
    }) || null;
  }

  // Find Guest for RSVP (searches full_name, nickname, or email)
  findGuestForRSVP(query: string): Guest | null {
    const results = this.findAllGuestsForRSVP(query);
    return results.length > 0 ? results[0] : null;
  }

  // Find all matching Guests for RSVP (searches full_name, nickname, category or email)
  findAllGuestsForRSVP(query: string): Guest[] {
    const db = this.getDB();
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return [];

    return db.guests.filter(g => {
      const normName = g.full_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normNickname = g.nickname ? g.nickname.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
      const normEmail = g.email ? g.email.toLowerCase() : '';
      const normCategory = g.category ? g.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';

      return normName.includes(q) || q.includes(normName) || (normNickname && (normNickname.includes(q) || q.includes(normNickname))) || normEmail === q || (normCategory && normCategory.includes(q));
    });
  }

  // Update RSVP status for a Guest
  updateGuestRSVP(
    guestId: string,
    status: 'confirmed' | 'declined',
    companions_count: number,
    dietary_restrictions?: string
  ): Guest | null {
    const db = this.getDB();
    const guest = db.guests.find(g => g.id === guestId);
    if (!guest) return null;

    guest.status = status;
    guest.companions_count = companions_count;
    if (dietary_restrictions !== undefined) {
      guest.dietary_restrictions = dietary_restrictions;
    }
    guest.invitation_opened = true;
    guest.updated_at = new Date().toISOString();

    const action_type = status === 'confirmed' ? 'invitation_accepted' : 'invitation_declined';
    const statusText = status === 'confirmed' ? 'confirmó su asistencia' : 'declinó la invitación';
    const companionsText = companions_count > 0 ? ` con ${companions_count} acompañante(s)` : '';

    this.logActivity(db, action_type, guest.full_name, `${guest.full_name} ${statusText}${companionsText}`);
    this.addNotification(
      db,
      status === 'confirmed' ? 'Nueva confirmación de asistencia' : 'Invitación declinada',
      `${guest.full_name} ha ${statusText}${companionsText}.`,
      status === 'confirmed' ? 'success' : 'warning'
    );

    this.saveDB(db);
    return guest;
  }

  markInvitationSent(guestId: string): Guest | null {
    const db = this.getDB();
    const guest = db.guests.find(g => g.id === guestId);
    if (!guest) return null;
    guest.invitation_sent = true;
    guest.updated_at = new Date().toISOString();
    this.saveDB(db);
    return guest;
  }

  addActivityLog(action_type: ActivityActionType, user_name: string, details: string) {
    const db = this.getDB();
    this.logActivity(db, action_type, user_name, details);
    this.saveDB(db);
  }

  // Helper mutation methods
  addGuest(guest: Omit<Guest, 'id' | 'created_at' | 'updated_at'>): Guest {
    const db = this.getDB();
    const newGuest: Guest = {
      ...guest,
      id: 'g-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.guests.unshift(newGuest);

    // Create log & notification
    this.logActivity(db, 'guest_created', 'Usuario', `Añadió a "${newGuest.full_name}" como invitado`);
    this.addNotification(db, 'Nuevo invitado', `Se registró a ${newGuest.full_name} en la lista.`, 'info');

    this.saveDB(db);
    return newGuest;
  }

  updateGuest(id: string, updates: Partial<Guest>): Guest | null {
    const db = this.getDB();
    const guest = db.guests.find(g => g.id === id);
    if (!guest) return null;
    Object.assign(guest, updates, { updated_at: new Date().toISOString() });
    this.logActivity(db, 'guest_edited', 'Usuario', `Actualizó información de "${guest.full_name}"`);
    this.saveDB(db);
    return guest;
  }

  deleteGuest(id: string): boolean {
    const db = this.getDB();
    const idx = db.guests.findIndex(g => g.id === id);
    if (idx === -1) return false;
    const deletedName = db.guests[idx].full_name;
    db.guests.splice(idx, 1);
    this.logActivity(db, 'guest_edited', 'Usuario', `Eliminó a "${deletedName}" de la lista de invitados`);
    this.saveDB(db);
    return true;
  }

  addEvent(eventItem: Omit<EventItem, 'id' | 'created_at'>): EventItem {
    const db = this.getDB();
    const newEvent: EventItem = {
      ...eventItem,
      id: 'e-' + Date.now(),
      created_at: new Date().toISOString()
    };
    db.events.unshift(newEvent);

    this.logActivity(db, 'event_created', 'Usuario', `Creó el evento "${newEvent.title}"`);
    this.addNotification(db, 'Nuevo evento creado', `Evento "${newEvent.title}" añadido con éxito.`, 'success');

    this.saveDB(db);
    return newEvent;
  }

  addGift(gift: Omit<GiftItem, 'id' | 'created_at'>): GiftItem {
    const db = this.getDB();
    const newGift: GiftItem = {
      ...gift,
      id: 'gf-' + Date.now(),
      created_at: new Date().toISOString()
    };
    db.gifts.unshift(newGift);

    this.logActivity(db, 'gift_reserved', 'Usuario', `Añadió el regalo "${newGift.title}" (${newGift.price}€)`);
    this.saveDB(db);
    return newGift;
  }

  addBudgetItem(item: Omit<BudgetItem, 'id' | 'created_at'>): BudgetItem {
    const db = this.getDB();
    const newItem: BudgetItem = {
      ...item,
      id: 'b-' + Date.now(),
      created_at: new Date().toISOString()
    };
    db.budget.unshift(newItem);
    this.logActivity(db, 'settings_changed', 'Usuario', `Añadió la partida presupuestaria "${newItem.category}"`);
    this.saveDB(db);
    return newItem;
  }

  updateBudgetItem(id: string, updates: Partial<BudgetItem>): BudgetItem | null {
    const db = this.getDB();
    const item = db.budget.find(b => b.id === id);
    if (!item) return null;
    Object.assign(item, updates);
    this.logActivity(db, 'settings_changed', 'Usuario', `Actualizó la partida "${item.category}"`);
    this.saveDB(db);
    return item;
  }

  deleteBudgetItem(id: string): boolean {
    const db = this.getDB();
    const idx = db.budget.findIndex(b => b.id === id);
    if (idx === -1) return false;
    const cat = db.budget[idx].category;
    db.budget.splice(idx, 1);
    this.logActivity(db, 'settings_changed', 'Usuario', `Eliminó la partida presupuestaria "${cat}"`);
    this.saveDB(db);
    return true;
  }

  setTotalBudget(amount: number) {
    const db = this.getDB();
    db.total_budget = amount;
    this.logActivity(db, 'settings_changed', 'Usuario', `Actualizó el presupuesto total a ${amount} RD$`);
    this.saveDB(db);
  }

  markNotificationRead(id: string) {
    const db = this.getDB();
    const notif = db.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveDB(db);
    }
  }

  markAllNotificationsRead() {
    const db = this.getDB();
    db.notifications.forEach(n => n.read = true);
    this.saveDB(db);
  }

  private logActivity(db: DBState, action_type: ActivityActionType, user_name: string, details: string) {
    const newLog: ActivityLog = {
      id: 'act-' + Date.now(),
      action_type,
      user_name,
      details,
      created_at: new Date().toISOString()
    };
    db.activity_logs.unshift(newLog);
  }

  private addNotification(db: DBState, title: string, message: string, type: 'info' | 'success' | 'warning' | 'alert') {
    const newNotif: NotificationItem = {
      id: 'notif-' + Date.now(),
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString()
    };
    db.notifications.unshift(newNotif);
  }
}

export const localDB = new LocalDBManager();
