import { handler } from '../src/index';
import * as authService from '../src/services/auth.service';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

jest.mock('../src/services/auth.service', () => {
  const actual = jest.requireActual('../src/services/auth.service');
  return {
    ...actual,
    authenticateCustomerByCpf: jest.fn()
  };
});

describe('Lambda Handler', () => {
  const mockContext = {
    callbackWaitsForEmptyEventLoop: true
  } as Context;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 for OPTIONS preflight request', async () => {
    const event = {
      httpMethod: 'OPTIONS'
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, mockContext) as { statusCode: number };
    expect(response.statusCode).toBe(200);
  });

  it('should return 200 with JWT on valid APIGatewayProxyEvent', async () => {
    (authService.authenticateCustomerByCpf as jest.Mock).mockResolvedValue({
      token: 'jwt-token-xyz',
      type: 'Bearer',
      expiresIn: 86400000,
      customer: {
        id: 'cust-1',
        name: 'Cliente Teste',
        document: '52998224725',
        email: 'cliente@test.com'
      }
    });

    const event = {
      body: JSON.stringify({ cpf: '529.982.247-25' }),
      httpMethod: 'POST'
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, mockContext) as { statusCode: number; body: string };
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.token).toBe('jwt-token-xyz');
    expect(body.customer.name).toBe('Cliente Teste');
  });

  it('should return 200 with base64 encoded body', async () => {
    (authService.authenticateCustomerByCpf as jest.Mock).mockResolvedValue({
      token: 'jwt-token-b64',
      type: 'Bearer',
      expiresIn: 86400000,
      customer: {
        id: 'cust-2',
        name: 'Cliente Base64',
        document: '52998224725'
      }
    });

    const rawJson = JSON.stringify({ cpf: '52998224725' });
    const base64Body = Buffer.from(rawJson).toString('base64');

    const event = {
      body: base64Body,
      isBase64Encoded: true,
      httpMethod: 'POST'
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, mockContext) as { statusCode: number; body: string };
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.token).toBe('jwt-token-b64');
  });

  it('should handle direct Lambda invocation { cpf: "..." }', async () => {
    (authService.authenticateCustomerByCpf as jest.Mock).mockResolvedValue({
      token: 'jwt-token-direct',
      type: 'Bearer',
      expiresIn: 86400000,
      customer: {
        id: 'cust-3',
        name: 'Direct User',
        document: '52998224725'
      }
    });

    const event = {
      cpf: '52998224725'
    };

    const response = await handler(event, mockContext) as { statusCode: number; body: string };
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.token).toBe('jwt-token-direct');
  });

  it('should return 400 when body has invalid JSON', async () => {
    const event = {
      body: 'invalid-json-string',
      httpMethod: 'POST'
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, mockContext) as { statusCode: number; body: string };
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('INVALID_JSON');
  });

  it('should return 400 when CPF is missing in payload', async () => {
    const event = {
      body: JSON.stringify({}),
      httpMethod: 'POST'
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, mockContext) as { statusCode: number; body: string };
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('MISSING_CPF');
  });

  it('should return error status code and message when AuthError is thrown', async () => {
    (authService.authenticateCustomerByCpf as jest.Mock).mockRejectedValue(
      new authService.AuthError(404, 'Cliente não encontrado', 'CUSTOMER_NOT_FOUND')
    );

    const event = {
      body: JSON.stringify({ cpf: '52998224725' }),
      httpMethod: 'POST'
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, mockContext) as { statusCode: number; body: string };
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('CUSTOMER_NOT_FOUND');
  });

  it('should return 500 on unexpected exceptions', async () => {
    (authService.authenticateCustomerByCpf as jest.Mock).mockRejectedValue(
      new Error('Database cluster unreachable')
    );

    const event = {
      body: JSON.stringify({ cpf: '52998224725' }),
      httpMethod: 'POST'
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, mockContext) as { statusCode: number; body: string };
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('INTERNAL_SERVER_ERROR');
  });
});
