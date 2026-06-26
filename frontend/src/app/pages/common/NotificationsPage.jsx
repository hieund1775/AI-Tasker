import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";
import { Button } from "../../components/ui/button.jsx";
import api from "../../../services/api.js";
import {
  Bell,
  CheckCheck,
  FileText,
  MessageSquare,
  DollarSign,
  RefreshCcw,
  AlertCircle,
  Clock,
} from "lucide-react";

import { timeAgo } from "../../lib/dateUtils.js";

// ---------------------------------------------------------------------------
// Icons and formatting
// ---------------------------------------------------------------------------

const typeIcons = {
  proposal: FileText,
  task: CheckCheck,
  payment: DollarSign,
  extension: RefreshCcw,
  message: MessageSquare,
  system: AlertCircle,
  dispute: AlertCircle,
};

const typeColors = {
  proposal: "bg-purple-100 text-purple-700",
  task: "bg-brand-primary-light text-brand-primary",
  payment: "bg-brand-green/10 text-brand-green",
  extension: "bg-orange-100 text-orange-700",
  message: "bg-brand-primary-light text-brand-primary",
  system: "bg-gray-100 text-gray-700",
  dispute: "bg-red-100 text-red-700",
};

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
          <div className="h-8 bg-gray-200 rounded w-48" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const theme = role === "client" ? {
    unreadBorder: "bg-red-50/40 border-red-200 hover:border-red-300",
    dot: "bg-red-600",
    iconColor: "bg-red-100 text-red-700"
  } : role === "expert" ? {
    unreadBorder: "bg-brand-green/10 border-brand-green/20 hover:border-brand-green/30",
    dot: "bg-brand-green",
    iconColor: "bg-brand-green/10 text-brand-green"
  } : {
    unreadBorder: "bg-brand-primary-light/40 border-blue-200 hover:border-blue-300",
    dot: "bg-brand-primary",
    iconColor: "bg-brand-primary-light text-brand-primary"
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            icon={CheckCheck}
            onClick={handleMarkAllRead}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Feedback */}
      {actionFeedback && (
        <div className="mb-4 p-3 bg-brand-green/10 border border-brand-green/20 rounded-lg text-sm text-brand-green">
          {actionFeedback}
        </div>
      )}

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No notifications</h3>
          <p className="text-sm text-gray-400">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = typeIcons[notif.type] || Bell;
            const colorClass = notif.isRead ? "bg-gray-100 text-gray-700" : theme.iconColor;

            const content = (
              <div
                className={`flex items-start gap-4 p-5 rounded-2xl border transition cursor-pointer ${
                  notif.isRead
                    ? "bg-white border-gray-200 hover:border-gray-300"
                    : theme.unreadBorder
                }`}
                onClick={() => !notif.isRead && handleMarkRead(notif.id)}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm ${notif.isRead ? "font-medium text-gray-700" : "font-semibold text-gray-900"}`}>
                      {notif.title}
                      {!notif.isRead && (
                        <span className={`inline-block w-2 h-2 ${theme.dot} rounded-full ml-2 align-middle`} />
                      )}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${notif.isRead ? "text-gray-500" : "text-gray-700"}`}>
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
      )}
    </div>
  );
}
