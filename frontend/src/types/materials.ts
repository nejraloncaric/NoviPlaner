export interface MaterialType {
  id: string;
  name: string;
  is_print: boolean;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface TaskMaterialItem {
  id: string;
  task_id: string;
  material_type_id: string;
  material_type_name?: string | null;
  is_print: boolean;
  dimensions_format: string;
  quantity: string;
  visual_content: string;
  print_shop?: string | null;
  installation_deadline?: string | null;
  sort_order: number;
  created_at?: string;
}

export interface TaskMaterialItemInput {
  material_type_id: string;
  dimensions_format: string;
  quantity: string;
  visual_content: string;
  print_shop: string;
  installation_deadline: string;
}

export function emptyMaterialItemInput(materialTypeId: string): TaskMaterialItemInput {
  return {
    material_type_id: materialTypeId,
    dimensions_format: "",
    quantity: "",
    visual_content: "",
    print_shop: "",
    installation_deadline: "",
  };
}
