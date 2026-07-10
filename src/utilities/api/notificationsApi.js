import { apiClient } from "./client";
import { NOTIFICATION_ENDPOINTS } from "../endpoints/notificationEndpoints";

const extractCollection = (responseBody) => {
  if (Array.isArray(responseBody)) {
    return responseBody;
  }

  if (Array.isArray(responseBody?.data)) {
    return responseBody.data;
  }

  if (Array.isArray(responseBody?.items)) {
    return responseBody.items;
  }

  if (Array.isArray(responseBody?.result)) {
    return responseBody.result;
  }

  if (Array.isArray(responseBody?.value)) {
    return responseBody.value;
  }

  return [];
};

export const getUserNotifications = async () => {
  const { data } = await apiClient.get(NOTIFICATION_ENDPOINTS.getUserNotifications);
  return extractCollection(data);
};

export const getNotificationDetails = async (id) => {
  const { data } = await apiClient.get(NOTIFICATION_ENDPOINTS.getNotificationDetails(id));
  return data?.data ?? data?.result ?? data;
};

export const sendNotification = async (id, payload) => {
  const { data } = await apiClient.post(
    NOTIFICATION_ENDPOINTS.sendNotification(id),
    payload,
  );

  return data;
};
