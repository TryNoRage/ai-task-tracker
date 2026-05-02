export interface Comment {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
}

export interface Task {
  id: string;
  rawInput: string;
  title: string;
  priority: "high" | "medium" | "low" | string;
  category: "work" | "personal" | "study" | "other" | string;
  deadline: string | null;
  done: boolean;
  createdAt: string;
  comments: Comment[];
}
