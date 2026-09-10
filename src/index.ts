import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context
} from 'aws-lambda';

import {
  authenticateCustomerByCpf,
  AuthError
} from './services/auth.service';

import { formatResponse } from './utils/response';

import {
  logError,
  logInfo,
  logWarn
} from './utils/logger';

interface DirectInvocationEvent {
  cpf?: string;
  document?: string;
  body?: string | {
    cpf?: string;
    document?: string;
  };
  httpMethod?: string;
  isBase64Encoded?: boolean;
}

export async function handler(
    event:
        | APIGatewayProxyEvent
        | DirectInvocationEvent,
    context?: Context
): Promise<APIGatewayProxyResult | unknown> {
  if (context) {
    context.callbackWaitsForEmptyEventLoop =
        false;
  }

  const requestId =
      context?.awsRequestId ||
      'local-request';

  const functionName =
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      'officyna-auth-lambda';

  const httpMethod =
      event.httpMethod || 'UNKNOWN';

  logInfo(
      'AUTHENTICATION_REQUEST_RECEIVED',
      {
        requestId,
        functionName,
        httpMethod,
        hasBody: Boolean(event.body)
      }
  );

  if (event.httpMethod === 'OPTIONS') {
    logInfo(
        'CORS_PREFLIGHT_REQUEST',
        {
          requestId,
          functionName
        }
    );

    return formatResponse(200, {
      statusCode: 200,
      message: 'OK'
    });
  }

  try {
    let cpfInput:
        | string
        | undefined;

    /*
     * 1. API Gateway / Function URL body
     */
    if (event.body) {
      let parsedBody:
          Record<string, unknown> = {};

      if (
          typeof event.body === 'string'
      ) {
        const rawBody =
            event.isBase64Encoded
                ? Buffer.from(
                    event.body,
                    'base64'
                ).toString('utf-8')
                : event.body;

        try {
          parsedBody =
              JSON.parse(rawBody);
        } catch (error: unknown) {
          logWarn(
              'REQUEST_INVALID_JSON',
              {
                requestId,
                functionName
              }
          );

          return formatResponse(
              400,
              {
                statusCode: 400,
                message:
                    'JSON no corpo da requisição é inválido',
                error: 'INVALID_JSON'
              }
          );
        }
      } else if (
          typeof event.body === 'object'
      ) {
        parsedBody =
            event.body as Record<
                string,
                unknown
            >;
      }

      cpfInput =
          (parsedBody.cpf ||
              parsedBody.document) as
              | string
              | undefined;
    }

    /*
     * 2. Fallback para query string
     * ou invocação direta
     */
    if (!cpfInput) {
      const apiEvent =
          event as APIGatewayProxyEvent;

      if (
          apiEvent.queryStringParameters
              ?.cpf
      ) {
        cpfInput =
            apiEvent
                .queryStringParameters
                .cpf;
      } else if (
          apiEvent.queryStringParameters
              ?.document
      ) {
        cpfInput =
            apiEvent
                .queryStringParameters
                .document;
      } else if (
          'cpf' in event &&
          typeof event.cpf === 'string'
      ) {
        cpfInput = event.cpf;
      } else if (
          'document' in event &&
          typeof event.document === 'string'
      ) {
        cpfInput = event.document;
      }
    }

    if (!cpfInput) {
      logWarn(
          'AUTHENTICATION_FAILED',
          {
            requestId,
            functionName,
            reason: 'MISSING_CPF'
          }
      );

      return formatResponse(
          400,
          {
            statusCode: 400,
            message:
                'Campo CPF obrigatório. Envie {"cpf": "00000000000"} no corpo da requisição.',
            error: 'MISSING_CPF'
          }
      );
    }

    logInfo(
        'AUTHENTICATION_PROCESSING',
        {
          requestId,
          functionName,
          cpfProvided: true,
          cpfLength: cpfInput.length
        }
    );

    const authResult =
        await authenticateCustomerByCpf(
            cpfInput
        );

    logInfo(
        'AUTHENTICATION_RESPONSE_SUCCESS',
        {
          requestId,
          functionName,
          statusCode: 200
        }
    );

    return formatResponse(
        200,
        {
          statusCode: 200,
          message:
              'Autenticação realizada com sucesso',
          token: authResult.token,
          type: authResult.type,
          expiresIn:
          authResult.expiresIn,
          customer:
          authResult.customer
        }
    );
  } catch (
      error: unknown
      ) {
    if (
        error instanceof AuthError
    ) {
      logWarn(
          'AUTHENTICATION_BUSINESS_ERROR',
          {
            requestId,
            functionName,
            statusCode:
            error.statusCode,
            errorCode:
            error.errorCode
          }
      );

      return formatResponse(
          error.statusCode,
          {
            statusCode:
            error.statusCode,
            message:
            error.message,
            error:
            error.errorCode
          }
      );
    }

    logError(
        'AUTHENTICATION_UNEXPECTED_ERROR',
        error,
        {
          requestId,
          functionName,
          statusCode: 500
        }
    );

    return formatResponse(
        500,
        {
          statusCode: 500,
          message:
              'Erro interno ao processar autenticação',
          error:
              'INTERNAL_SERVER_ERROR'
        }
    );
  }
}