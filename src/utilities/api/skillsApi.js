import { apiClient } from "./client";

const pickFirst = (obj, keys, fallback = null) => {
  if (!obj || typeof obj !== "object") {
    return fallback;
  }

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }

  return fallback;
};

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

const normalizeSkill = (rawSkill = {}) => ({
  id: pickFirst(rawSkill, ["id", "Id", "skillId", "SkillId"]),
  skillName: pickFirst(rawSkill, ["skillName", "SkillName", "name", "Name"], "Untitled skill"),
});

export const getAllSkills = async () => {
  const { data } = await apiClient.get("/api/Skill/GetAllSkills");

  return extractCollection(data)
    .map((item) => normalizeSkill(item))
    .filter((item) => item.id || item.skillName);
};

export const addSkill = async (skillName) => {
  const { data } = await apiClient.post("/api/Skill/AddSkill", {
    skillName: skillName.trim(),
  });

  return data;
};

export const deleteSkill = async (id) => {
  const { data } = await apiClient.delete(`/api/Skill/DeleteSkill/${id}`);
  return data;
};
