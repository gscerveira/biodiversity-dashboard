export interface ApiFile {
  filename: string;
  path: string;
  size: number;
  lastModified: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
} 