"use client";

import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, icon = 'inbox', actionText, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-outline-variant/50 rounded-2xl bg-surface-container-low/30">
      <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="font-headline-sm text-lg font-semibold text-on-surface mb-1">{title}</h3>
      <p className="font-body-md text-sm text-secondary max-w-sm mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-label-caps text-xs font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          {actionText}
        </button>
      )}
    </div>
  );
}
