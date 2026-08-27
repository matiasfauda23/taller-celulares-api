export interface ApiValidationErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  details?: ApiValidationErrorDetail[];
}
