import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";
import { Button } from "../../components/ui/button.jsx";
import api from "../../../services/api.js";
import {
  Bell,
  CheckCheck,
  FileText,
  MessageSquare,
  ReceiptText,
  RefreshCcw,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";

import { timeAgo } from "../../lib/dateUtils.js";

// ---------------------------------------------------------------------------
// Icons and formatting
// ---------------------------------------------------------------------------

const typeIcons = {
  proposal: FileText,
  task: CheckCheck,
  payment: ReceiptText,
  extension: RefreshCcw,
  message: MessageSquare,
  system: AlertCircle,
  dispute: AlertCircle,
};

const typeColors = {
  proposal: "bg-accent/10 text-accent",
  task: "bg-success/10 text-success",
  payment: "bg-success/10 text-success",
  extension: "bg-warning/10 text-warning",
  message: "bg-primary/10 text-primary",
  system: "bg-muted text-muted-foreground",
  dispute: "bg-destructive/10 text-destructive",
};

const typeBorderColors = {
  proposal: "border-l-accent",
  task: "border-l-success",
  payment: "border-l-success",
  extension: "border-l-warning",
  message: "border-l-primary",
  system: "border-l-muted-foreground",
  dispute: "border-l-destructive",
};

const typeLabels = {
  proposal: "Proposal",
  task: "Task Update",
  payment: "Payment",
  extension: "Extension",
  message: "Message",
  system: "System",
  dispute: "Dispute",
};

// ---------------------------------------------------------------------------
// Date grouping helper
// ---------------------------------------------------------------------------

function groupByDate(notifications) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = { Today: [], Yesterday: [], Earlier: [] };

  for (const n of notifications) {
    const created = new Date(n.createdAt);
    created.setHours(0, 0, 0, 0);
    if (created.getTime() === today.getTime()) {
      groups.Today.push(n);
    } else if (created.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(n);
    } else {
      groups.Earlier.push(n);
    }
  }

  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationsPage() {
  const { role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.getList();
      if (Array.isArray(data)) {
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleUpdate);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = useMemo(() => groupByDate(notifications), [notifications]);

  const handleMarkRead = async (id) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setActionFeedback("All notifications marked as read.");
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded w-48" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-secondary rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const themeDot = role === "expert" ? "bg-success" : role === "client" ? "bg-destructive" : "bg-primary";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-4 -mt-8 mb-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={CheckCheck}
              onClick={handleMarkAllRead}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Feedback */}
      {actionFeedback && (
        <div className="mb-4 p-3 bg-success-light border border-success/20 rounded-lg text-sm text-success animate-fade-in">
          {actionFeedback}
        </div>
      )}

      {/* Notification list grouped by date */}
      {notifications.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-muted/40 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Bell className="w-9 h-9 text-muted-foreground/30" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground/70 mb-2">All caught up!</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            When someone interacts with your projects, proposals, or messages, you&apos;ll see notifications here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              {/* Group header */}
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {group.label}
              </h3>

              <div className="space-y-1.5">
                {group.items.map((notif) => {
                  const Icon = typeIcons[notif.type] || Bell;
                  const iconBg = notif.isRead ? "bg-muted text-muted-foreground" : typeColors[notif.type] || "bg-primary/10 text-primary";
                  const borderColor = notif.isRead ? "" : typeBorderColors[notif.type] || "border-l-accent";
                  const typeLabel = typeLabels[notif.type] || "Update";

                  const content = (
                    <div
                      className={`group flex items-start gap-4 p-4 rounded-xl border border-border transition-all duration-200 cursor-pointer
                        ${notif.isRead
                          ? "bg-card hover:bg-secondary/30 border-l-4 border-l-transparent"
                          : `bg-card border-l-4 ${borderColor} shadow-sm hover:shadow-md hover:-translate-y-0.5`
                        }`}
                      onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${iconBg}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {typeLabel}
                              </span>
                              {!notif.isRead && (
                                <span className={`inline-block w-2 h-2 ${themeDot} rounded-full animate-sparkle-pulse`} />
                              )}
                            </div>
                            <h3 className={`text-sm ${notif.isRead ? "font-medium text-foreground/60" : "font-semibold text-foreground"}`}>
                              {notif.title}
                            </h3>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1 pt-0.5">
                            <Clock className="w-3 h-3" />
                            {timeAgo(notif.createdAt)}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 leading-relaxed ${notif.isRead ? "text-muted-foreground/60" : "text-foreground/75"}`}>
                          {notif.message || notif.description}
                        </p>
                      </div>
                    </div>
                  );

                  const redirectUrl = notif.linkTo || notif.actionUrl;
                  if (redirectUrl) {
                    return (
                      <Link key={notif.id} to={redirectUrl} className="block">
                        {content}
                      </Link>
                    );
                  }
                  return <div key={notif.id}>{content}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
