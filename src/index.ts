import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { authenticateCustomerByCpf, AuthError } from './services/auth.service';
import { formatResponse } from './utils/response';

interface DirectInvocationEvent {
  cpf?: string;
  document?: string;
  body?: string | { cpf?: string; document?: string };
  httpMethod?: string;
  isBase64Encoded?: boolean;
}

export async function handler(
  event: APIGatewayProxyEvent | DirectInvocationEvent,
  context?: Context
): Promise<APIGatewayProxyResult | unknown> {
  // Allow Lambda to freeze connection pool across invocations
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return formatResponse(200, {
      statusCode: 200,
      message: 'OK'
    });
  }

  try {
    let cpfInput: string | undefined;

    // 1. Check if event is an API Gateway proxy event with body
    if (event.body) {
      let parsedBody: Record<string, unknown> = {};
      if (typeof event.body === 'string') {
        const rawBody = event.isBase64Encoded
          ? Buffer.from(event.body, 'base64').toString('utf-8')
          : event.body;
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          return formatResponse(400, {
            statusCode: 400,
            message: 'JSON no corpo da requisição é inválido',
            error: 'INVALID_JSON'
          });
        }
      } else if (typeof event.body === 'object') {
        parsedBody = event.body as Record<string, unknown>;
      }

      cpfInput = (parsedBody.cpf || parsedBody.document) as string | undefined;
    }

    // 2. Fallback to direct event properties or query string
    if (!cpfInput) {
      const apiEvent = event as APIGatewayProxyEvent;
      if (apiEvent.queryStringParameters?.cpf) {
        cpfInput = apiEvent.queryStringParameters.cpf;
      } else if (apiEvent.queryStringParameters?.document) {
        cpfInput = apiEvent.queryStringParameters.document;
      } else if ('cpf' in event && typeof event.cpf === 'string') {
        cpfInput = event.cpf;
      } else if ('document' in event && typeof event.document === 'string') {
        cpfInput = event.document;
      }
    }

    if (!cpfInput) {
      return formatResponse(400, {
        statusCode: 400,
        message: 'Campo CPF obrigatório. Envie {"cpf": "00000000000"} no corpo da requisição.',
        error: 'MISSING_CPF'
      });
    }

    const authResult = await authenticateCustomerByCpf(cpfInput);

    return formatResponse(200, {
      statusCode: 200,
      message: 'Autenticação realizada com sucesso',
      token: authResult.token,
      type: authResult.type,
      expiresIn: authResult.expiresIn,
      customer: authResult.customer
    });

  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return formatResponse(error.statusCode, {
        statusCode: error.statusCode,
        message: error.message,
        error: error.errorCode
      });
    }

    console.error('Erro inesperado durante autenticação:', error);

    return formatResponse(500, {
      statusCode: 500,
      message: 'Erro interno ao processar autenticação',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}
