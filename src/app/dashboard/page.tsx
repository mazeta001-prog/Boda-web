"use client";

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import { useDashboardData } from '@/hooks/useDashboardData';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricCardsGrid } from '@/components/dashboard/MetricCardsGrid';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { QuickActionsBento } from '@/components/dashboard/QuickActionsBento';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { GlobalSearchModal } from '@/components/dashboard/GlobalSearchModal';
import { CreateGuestModal } from '@/components/dashboard/CreateGuestModal';
import { CreateEventModal } from '@/components/dashboard/CreateEventModal';
import { CreateGiftModal } from '@/components/dashboard/CreateGiftModal';
import { CreateBudgetItemModal } from '@/components/dashboard/CreateBudgetItemModal';
import { DeleteBudgetItemModal } from '@/components/dashboard/DeleteBudgetItemModal';
import { SetTotalBudgetModal } from '@/components/dashboard/SetTotalBudgetModal';
import { ActivityHistoryModal } from '@/components/dashboard/ActivityHistoryModal';
import { InvitationIssuesPanel } from '@/components/dashboard/InvitationIssuesPanel';
import { DashboardSkeleton } from '@/components/dashboard/SkeletonLoader';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { BudgetItem } from '@/types/database';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateGuestOpen, setIsCreateGuestOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isCreateGiftOpen, setIsCreateGiftOpen] = useState(false);
  const [isActivityHistoryOpen, setIsActivityHistoryOpen] = useState(false);
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);
  const [isSetTotalBudgetOpen, setIsSetTotalBudgetOpen] = useState(false);
  const [editingBudgetItem, setEditingBudgetItem] = useState<BudgetItem | null>(null);
  const [deletingBudgetItem, setDeletingBudgetItem] = useState<BudgetItem | null>(null);

  useEffect(() => {
    if (!authLoading && isSupabaseConfigured && !session) {
      router.push('/login');
    }
  }, [authLoading, session, router]);

  const {
    loading,
    error,
    metrics,
    budget,
    totalBudgetGoal,
    activityLogs,
    notifications,
    unreadNotificationsCount,
    refetch,
    searchAll,
    createGuest,
    createEvent,
    createGift,
    createBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    setTotalBudget,
    markNotificationRead,
    markAllNotificationsRead
  } = useDashboardData();

  useEffect(() => {
    const targetDate = new Date('December 20, 2026 16:00:00').getTime();
    const calculateDays = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      const days = Math.ceil(distance / (1000 * 60 * 60 * 24));
      setDaysLeft(days > 0 ? days : 0);
    };

    calculateDays();
    const interval = setInterval(calculateDays, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-surface transition-colors duration-200">
      {/* Sidebar Navigation (Desktop + Mobile Drawer) */}
      <Sidebar 
        variant="novios" 
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 flex flex-col relative overflow-x-hidden w-full min-w-0">
        {/* Top Header */}
        <DashboardHeader
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenCreateGuest={() => setIsCreateGuestOpen(true)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content Container */}
        <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto flex-grow w-full space-y-10">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/30 pb-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="font-headline-md text-2xl md:text-3xl text-on-surface font-bold">
                  Centro de Control
                </h1>
                {isSupabaseConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-label-caps font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Supabase Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-label-caps font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Demo Storage Active
                  </span>
                )}
              </div>
              <p className="font-body-md text-xs md:text-sm text-secondary">
                Estadísticas en tiempo real, control de invitados y presupuesto de su boda.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-primary/10 px-4 py-2 rounded-xl text-xs font-label-caps text-secondary flex items-center gap-2 border border-primary/20">
                <span className="material-symbols-outlined text-primary text-base">timer</span>
                <span>Faltan <strong className="text-primary font-bold text-sm">{daysLeft} días</strong> para la gran cita</span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-error/10 border border-error/30 text-error flex items-center justify-between text-xs font-body-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">error</span>
                <span>{error}</span>
              </div>
              <button 
                onClick={refetch}
                className="font-bold underline hover:no-underline"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Loading Skeleton vs Real Live Content */}
          {loading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {/* Live Metrics Grid */}
              <MetricCardsGrid 
                metrics={metrics} 
                budget={budget}
                onOpenCreateBudget={() => {
                  setEditingBudgetItem(null);
                  setIsCreateBudgetOpen(true);
                }}
                onOpenSetTotalBudget={() => {
                  setIsSetTotalBudgetOpen(true);
                }}
                onEditBudgetItem={(item) => {
                  setEditingBudgetItem(item);
                  setIsCreateBudgetOpen(true);
                }}
                onDeleteBudgetItem={(item) => {
                  setDeletingBudgetItem(item);
                }}
              />

              {/* Main 2-Column Section: Audit Feed + Quick Actions & Reported Issues */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Audit Timeline Feed */}
                <div className="xl:col-span-1">
                  <ActivityFeed 
                    logs={activityLogs} 
                    onViewAll={() => setIsActivityHistoryOpen(true)}
                  />
                </div>

                {/* Right Column: Reported Issues Panel + Quick Actions Bento */}
                <div className="xl:col-span-2 space-y-8">
                  <InvitationIssuesPanel
                    notifications={notifications}
                    activityLogs={activityLogs}
                    onMarkRead={(id) => markNotificationRead(id)}
                  />

                  <QuickActionsBento
                    onOpenCreateGuest={() => setIsCreateGuestOpen(true)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Area */}
        <Footer variant="dashboard" />
      </main>

      {/* Global Realtime Modals & Notifications Center */}
      <NotificationCenter
        notifications={notifications}
        unreadCount={unreadNotificationsCount}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={searchAll}
      />

      <CreateGuestModal
        isOpen={isCreateGuestOpen}
        onClose={() => setIsCreateGuestOpen(false)}
        onSubmit={createGuest}
      />

      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onSubmit={createEvent}
      />

      <CreateGiftModal
        isOpen={isCreateGiftOpen}
        onClose={() => setIsCreateGiftOpen(false)}
        onSubmit={createGift}
      />

      <ActivityHistoryModal
        isOpen={isActivityHistoryOpen}
        onClose={() => setIsActivityHistoryOpen(false)}
        logs={activityLogs}
      />

      {/* Budget Modals */}
      <CreateBudgetItemModal
        itemToEdit={editingBudgetItem}
        isOpen={isCreateBudgetOpen}
        onClose={() => {
          setIsCreateBudgetOpen(false);
          setEditingBudgetItem(null);
        }}
        onSubmit={async (itemData) => {
          if (editingBudgetItem) {
            await updateBudgetItem(editingBudgetItem.id, itemData);
          } else {
            await createBudgetItem(itemData);
          }
        }}
      />

      <DeleteBudgetItemModal
        item={deletingBudgetItem}
        isOpen={!!deletingBudgetItem}
        onClose={() => setDeletingBudgetItem(null)}
        onConfirm={async (id) => {
          await deleteBudgetItem(id);
        }}
      />

      <SetTotalBudgetModal
        isOpen={isSetTotalBudgetOpen}
        onClose={() => setIsSetTotalBudgetOpen(false)}
        budget={budget}
        totalBudgetGoal={totalBudgetGoal}
        onSetTotalBudget={setTotalBudget}
        onUpdateBudgetItem={updateBudgetItem}
        onCreateBudgetItem={createBudgetItem}
        onDeleteBudgetItem={deleteBudgetItem}
      />
    </div>
  );
}
