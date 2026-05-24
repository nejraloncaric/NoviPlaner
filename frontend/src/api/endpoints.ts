import { api } from "./client";
import type {
  User, Project, Task, Comment, Material, Activity,
  TaskStatus, TaskPriority, ProjectStatus, ExcelImportResult,
  MaterialType, TaskMaterialItemInput,
} from "../types";

// AUTH
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; user: User }>("/auth/login-json", { email, password }).then(r => r.data),
  register: (email: string, full_name: string, password: string) =>
    api.post<{ access_token: string; user: User }>("/auth/register", { email, full_name, password }).then(r => r.data),
  me: () => api.get<User>("/auth/me").then(r => r.data),
};

// USERS
export const usersApi = {
  list: (q?: string) => api.get<User[]>("/users/", { params: { q } }).then(r => r.data),
};

// PROJECTS
export const projectsApi = {
  list: (params?: { status?: ProjectStatus; include_archived?: boolean }) =>
    api.get<Project[]>("/projects/", { params }).then(r => r.data),
  get: (id: string) => api.get<Project>(`/projects/${id}`).then(r => r.data),
  create: (data: any) => api.post<Project>("/projects/", data).then(r => r.data),
  importExcel: (file: File, memberIds: string[] = []) => {
    const fd = new FormData();
    fd.append("file", file);
    if (memberIds.length) {
      fd.append("member_ids", JSON.stringify(memberIds));
    }
    return api.post<ExcelImportResult>("/projects/import-excel", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data);
  },
  importExcelFromUrl: (url: string, memberIds: string[] = []) =>
    api.post<ExcelImportResult>("/projects/import-excel-url", { url, member_ids: memberIds }).then(r => r.data),
  update: (id: string, data: any) => api.patch<Project>(`/projects/${id}`, data).then(r => r.data),
  archive: (id: string) => api.post<Project>(`/projects/${id}/archive`).then(r => r.data),
  unarchive: (id: string) => api.post<Project>(`/projects/${id}/unarchive`).then(r => r.data),
  remove: (id: string) => api.delete(`/projects/${id}`).then(r => r.data),
  addMember: (id: string, user_id: string, role = "member") =>
    api.post(`/projects/${id}/members`, { user_id, role }).then(r => r.data),
  removeMember: (id: string, user_id: string) =>
    api.delete(`/projects/${id}/members/${user_id}`).then(r => r.data),
};

// MATERIAL TYPES (katalog za zadatke)
export const materialTypesApi = {
  list: (activeOnly = true) =>
    api.get<MaterialType[]>("/material-types/", { params: { active_only: activeOnly } }).then(r => r.data),
  create: (data: { name: string; is_print: boolean }) =>
    api.post<MaterialType>("/material-types/", data).then(r => r.data),
  update: (id: string, data: Partial<{ name: string; is_print: boolean; is_active: boolean }>) =>
    api.patch<MaterialType>(`/material-types/${id}`, data).then(r => r.data),
  deactivate: (id: string) =>
    api.delete(`/material-types/${id}`).then(r => r.data),
};

// TASKS
export const tasksApi = {
  list: (params: {
    project_id: string; status?: TaskStatus; assignee_id?: string;
    priority?: TaskPriority; q?: string;
  }) => api.get<Task[]>("/tasks/", { params }).then(r => r.data),
  get: (id: string) => api.get<Task>(`/tasks/${id}`).then(r => r.data),
  create: (data: any) => api.post<Task>("/tasks/", data).then(r => r.data),
  update: (id: string, data: any) => api.patch<Task>(`/tasks/${id}`, data).then(r => r.data),
  move: (id: string, status: TaskStatus, position: number) =>
    api.post<Task>(`/tasks/${id}/move`, { status, position }).then(r => r.data),
  remove: (id: string) => api.delete(`/tasks/${id}`).then(r => r.data),
};

// COMMENTS
export const commentsApi = {
  list: (task_id: string) => api.get<Comment[]>("/comments/", { params: { task_id } }).then(r => r.data),
  create: (task_id: string, content: string, mentions: string[] = []) =>
    api.post<Comment>("/comments/", { task_id, content, mentions }).then(r => r.data),
  remove: (id: string) => api.delete(`/comments/${id}`).then(r => r.data),
};

// MATERIALS
export const materialsApi = {
  list: (project_id: string, task_id?: string) =>
    api.get<Material[]>("/materials/", { params: { project_id, task_id } }).then(r => r.data),
  upload: (project_id: string, file: File, task_id?: string) => {
    const fd = new FormData();
    fd.append("project_id", project_id);
    if (task_id) fd.append("task_id", task_id);
    fd.append("file", file);
    return api.post<Material>("/materials/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data);
  },
  addLink: (data: { project_id: string; task_id?: string; title: string; url: string }) =>
    api.post<Material>("/materials/link", data).then(r => r.data),
  remove: (id: string) => api.delete(`/materials/${id}`).then(r => r.data),
  downloadUrl: (id: string) => `/api/materials/${id}/download`,
};

// ACTIVITIES
export const activitiesApi = {
  list: (params: { project_id?: string; task_id?: string; limit?: number }) =>
    api.get<Activity[]>("/activities/", { params }).then(r => r.data),
};
