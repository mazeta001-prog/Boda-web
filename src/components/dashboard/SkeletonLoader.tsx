"use client";

import React from 'react';

export function MetricCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest p-6 border border-outline-variant/40 rounded-2xl shadow-sm animate-pulse flex flex-col justify-between h-36">
      <div className="flex justify-between items-center">
        <div className="h-3 w-28 bg-surface-container-high rounded-md"></div>
        <div className="h-7 w-7 bg-surface-container-high rounded-full"></div>
      </div>
      <div className="space-y-2 mt-4">
        <div className="h-9 w-20 bg-surface-container-high rounded-lg"></div>
        <div className="h-2 w-full bg-surface-container-high rounded-full"></div>
      </div>
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="p-4 rounded-xl border border-outline-variant/30 flex gap-4 items-center">
          <div className="w-10 h-10 rounded-full bg-surface-container-high shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-surface-container-high rounded-md"></div>
            <div className="h-3 w-1/4 bg-surface-container-high rounded-md"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-8 w-48 bg-surface-container-high rounded-md animate-pulse"></div>
          <ActivityFeedSkeleton />
        </div>
        <div className="h-64 bg-surface-container-lowest rounded-2xl border border-outline-variant/40 animate-pulse"></div>
      </div>
    </div>
  );
}
