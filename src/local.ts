import * as http from 'http';
import { handler } from './index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/actuator/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', service: 'officyna-lambda' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      const url = new URL(req.url || '/', `http://localhost:${PORT}`);

      const proxyEvent: APIGatewayProxyEvent = {
        body,
        httpMethod: req.method || 'GET',
        headers: req.headers as { [name: string]: string },
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: url.pathname,
        pathParameters: null,
        queryStringParameters: Object.fromEntries(url.searchParams.entries()),
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
          accountId: 'local',
          apiId: 'local',
          authorizer: null,
          protocol: 'HTTP/1.1',
          httpMethod: req.method || 'GET',
          identity: {
            accessKey: null,
            accountId: null,
            apiKey: null,
            apiKeyId: null,
            caller: null,
            clientCert: null,
            cognitoAuthenticationProvider: null,
            cognitoAuthenticationType: null,
            cognitoIdentityId: null,
            cognitoIdentityPoolId: null,
            principalOrgId: null,
            sourceIp: req.socket.remoteAddress || '127.0.0.1',
            user: null,
            userAgent: req.headers['user-agent'] || 'local-client',
            userArn: null
          },
          path: url.pathname,
          stage: 'local',
          requestId: 'local-' + Date.now(),
          requestTimeEpoch: Date.now(),
          resourceId: 'local',
          resourcePath: url.pathname
        },
        resource: url.pathname
      };

      const result = await handler(proxyEvent) as {
        statusCode: number;
        headers?: Record<string, string>;
        body: string;
      };

      res.writeHead(result.statusCode || 200, {
        'Content-Type': 'application/json',
        ...(result.headers || {})
      });
      res.end(result.body);

    } catch (err: unknown) {
      console.error('Erro no servidor local:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        statusCode: 500,
        message: 'Erro interno no servidor local',
        error: (err as Error).message
      }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Servidor local da Lambda rodando em: http://localhost:${PORT}`);
  console.log(`👉 Endpoint de autenticação: POST http://localhost:${PORT}/auth/cpf`);
  console.log(`👉 Exemplo de payload: { "cpf": "529.982.247-25" }`);
  console.log(`====================================================`);
});
