export interface ApiFile {
  type: string;
  filename: string;
  user_filename: string;
  date: string;
  size: number;
  tags: string[];
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
} 