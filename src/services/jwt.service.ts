import jwt from 'jsonwebtoken';
import { getConfig } from '../config/environment';
import { CustomerAuthResult } from '../models/customer';

export interface JwtTokenResult {
  token: string;
  type: string;
  expiresIn: number;
}

export function generateCustomerToken(customer: CustomerAuthResult): JwtTokenResult {
  const config = getConfig();

  const payload = {
    roles: 'CUSTOMER',
    name: customer.name,
    email: customer.email || '',
    cpf: customer.document,
    document: customer.document,
    customerId: customer.id,
    type: 'CUSTOMER'
  };

  const expiresInSeconds = Math.floor(config.jwtExpirationMs / 1000);

  const token = jwt.sign(payload, config.jwtSecret, {
    subject: customer.email || customer.document,
    issuer: config.jwtIssuer,
    expiresIn: expiresInSeconds,
    algorithm: 'HS256'
  });

  return {
    token,
    type: 'Bearer',
    expiresIn: config.jwtExpirationMs
  };
}

export function verifyToken(token: string): jwt.JwtPayload | string {
  const config = getConfig();
  return jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
    issuer: config.jwtIssuer
  });
}
