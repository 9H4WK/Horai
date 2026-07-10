export const NOTIFICATION_ENDPOINTS = {
  sendNotification: (id) => `/api/Notification/SendNotification/${id}`,
  getUserNotifications: "/api/Notification/GetUserNotifications",
  getNotificationDetails: (id) => `/api/Notification/GetDetailForNotification/${id}`,
};
