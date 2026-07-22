export type GuestStatus = 'confirmed' | 'pending' | 'declined';
export type GiftStatus = 'available' | 'reserved' | 'purchased';
export type ActivityActionType = 
  | 'guest_created'
  | 'guest_edited'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_declined'
  | 'gift_reserved'
  | 'gift_purchased'
  | 'event_created'
  | 'gallery_upload'
  | 'settings_changed';

export type NotificationType = 'info' | 'success' | 'warning' | 'alert';

export interface Guest {
  id: string;
  full_name: string;
  nickname?: string; // Apodo / Alias (1 a 2 nombres/apodos)
  category?: string; // Familia, Amigos, Conocidos
  email: string;
  phone?: string;
  status: GuestStatus;
  event_id?: string;
  table_id?: string;
  companions_count: number;
  dietary_restrictions?: string;
  invitation_sent: boolean;
  invitation_opened: boolean;
  invitation_token?: string;
  created_at: string;
  updated_at: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  max_capacity: number;
  registered_guests_count?: number;
  created_at: string;
}

export interface TableItem {
  id: string;
  name: string;
  capacity: number;
  occupied_seats: number;
  location_zone?: string;
  created_at: string;
}

export interface GiftItem {
  id: string;
  title: string;
  price: number;
  status: GiftStatus;
  reserved_by?: string;
  category?: string;
  created_at: string;
}

export interface InvitationItem {
  id: string;
  guest_id: string;
  guest_name?: string;
  sent_at?: string;
  opened_at?: string;
  accepted_at?: string;
  status: 'sent' | 'opened' | 'accepted' | 'declined';
  created_at: string;
}

export interface BudgetPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  allocated: number;
  used: number;
  notes?: string;
  image_url?: string;
  payments?: BudgetPayment[];
  created_at: string;
}

export interface ActivityLog {
  id: string;
  action_type: ActivityActionType;
  user_name: string;
  user_avatar?: string;
  details: string;
  target_id?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  action_url?: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  totalEvents: number;
  guestsPerEvent: number;
  totalTables: number;
  occupiedSeats: number;
  remainingSeats: number;
  giftsReserved: number;
  giftsPurchased: number;
  invitationsSent: number;
  invitationsOpened: number;
  invitationsAccepted: number;
  budgetUsed: number;
  budgetRemaining: number;
  totalBudgetAllocated: number;
}

export interface SearchResults {
  guests: Guest[];
  events: EventItem[];
  tables: TableItem[];
  gifts: GiftItem[];
}
