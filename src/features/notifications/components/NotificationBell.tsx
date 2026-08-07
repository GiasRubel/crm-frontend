"use client";

import { useRouter } from "next/navigation";
import { Bell, MessageSquare, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { entityRoute } from "@/lib/entity-routes";
import { useNotifications } from "../hooks/useNotifications";
import { Notification } from "../types";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const { listQuery, unreadCountQuery, markReadMutation, markAllReadMutation } = useNotifications();

  const unreadCount = unreadCountQuery.data?.count ?? 0;
  const notifications = listQuery.data ?? [];

  const handleSelect = (notification: Notification) => {
    if (!notification.isRead) markReadMutation.mutate(notification.id);
    router.push(entityRoute(notification.entityType, notification.body));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-400 hover:text-primary transition-colors rounded-full"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-white dark:border-slate-900" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 mt-2 rounded-xl">
        <div className="flex items-center justify-between px-1.5 py-1">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
            No notifications yet.
          </p>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex-col items-start gap-0.5 py-2 cursor-pointer"
              onClick={() => handleSelect(notification)}
            >
              <div className="flex items-center gap-2 w-full">
                {notification.type === "assignment" ? (
                  <UserPlus className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <span className={`text-sm ${notification.isRead ? "text-gray-500 dark:text-slate-400" : "font-semibold text-gray-800 dark:text-slate-100"}`}>
                  {notification.title}
                </span>
                {!notification.isRead && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              </div>
              {notification.body && (
                <p className="text-xs text-gray-500 dark:text-slate-400 pl-6 truncate w-full">{notification.body}</p>
              )}
              <span className="text-xs text-gray-400 dark:text-slate-500 pl-6">{timeAgo(notification.createdAt)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
