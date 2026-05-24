import type { TaskStatus as TaskStatusType } from "./taskStatuses";

export type { TaskStatus } from "./taskStatuses";
export {
  TASK_STATUSES,
  DEFAULT_TASK_STATUS,
  COMPLETED_TASK_STATUS,
  taskStatusLabel,
  isTaskCompleted,
} from "./taskStatuses";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ProjectStatus = "active" | "archived" | "completed";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  created_at?: string;
}

export interface ProjectMember {
  user_id: string;
  role: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface ExcelImportSheetResult {
  sheet_name: string;
  project_id: string;
  project_name: string;
  tasks_created: number;
  skipped_rows: number;
}

export interface ExcelImportResult {
  sheets: ExcelImportSheetResult[];
  total_projects: number;
  total_tasks: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: ProjectStatus;
  owner_id: string;
  created_at?: string;
  updated_at?: string;
  members: ProjectMember[];
  task_count: number;
  completed_task_count: number;
}

import type { TaskMaterialItem } from "./types/materials";

export type { MaterialType, TaskMaterialItem, TaskMaterialItemInput } from "./types/materials";
export { emptyMaterialItemInput } from "./types/materials";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  material_items?: TaskMaterialItem[];
  status: TaskStatusType;
  priority: TaskPriority;
  assignee_id?: string | null;
  assignee_name?: string | null;
  assignee_avatar?: string | null;
  creator_id: string;
  due_date?: string | null;
  position: number;
  parent_task_id?: string | null;
  created_at?: string;
  updated_at?: string;
  subtasks: Task[];
  comments_count: number;
  materials_count: number;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  content: string;
  mentions: string[];
  created_at?: string;
}

export interface Material {
  id: string;
  project_id: string;
  task_id?: string | null;
  uploader_id: string;
  uploader_name?: string | null;
  file_name: string;
  storage_path?: string | null;
  external_url?: string | null;
  is_link?: boolean;
  mime_type?: string | null;
  size_bytes?: number | null;
  download_url?: string | null;
  created_at?: string;
}

export interface Activity {
  id: string;
  project_id?: string | null;
  task_id?: string | null;
  actor_id: string;
  actor_name?: string | null;
  action: string;
  payload: Record<string, any>;
  created_at?: string;
}
