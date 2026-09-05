import { APIGatewayProxyResult } from 'aws-lambda';

export interface ApiResponsePayload {
  success?: boolean;
  statusCode: number;
  message?: string;
  data?: unknown;
  token?: string;
  type?: string;
  expiresIn?: number;
  customer?: unknown;
  error?: string;
  details?: unknown;
  timestamp?: string;
}

export function formatResponse(
  statusCode: number,
  body: ApiResponsePayload
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'OPTIONS,POST'
    },
    body: JSON.stringify({
      ...body,
      timestamp: body.timestamp || new Date().toISOString()
    })
  };
}
