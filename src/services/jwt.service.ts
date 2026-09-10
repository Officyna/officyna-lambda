import jwt from 'jsonwebtoken';
import { getConfig } from '../config/environment';
import { CustomerAuthResult } from '../models/customer';
import {
  logError,
  logInfo
} from '../utils/logger';

export interface JwtTokenResult {
  token: string;
  type: string;
  expiresIn: number;
}

export function generateCustomerToken(
    customer: CustomerAuthResult
): JwtTokenResult {
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

  const expiresInSeconds =
      Math.floor(
          config.jwtExpirationMs / 1000
      );

  try {
    const token = jwt.sign(
        payload,
        config.jwtSecret,
        {
          subject:
              customer.email ||
              customer.document,
          issuer: config.jwtIssuer,
          expiresIn: expiresInSeconds,
          algorithm: 'HS256'
        }
    );

    logInfo('JWT_TOKEN_CREATED', {
      algorithm: 'HS256',
      expiresInSeconds
    });

    return {
      token,
      type: 'Bearer',
      expiresIn: config.jwtExpirationMs
    };
  } catch (error: unknown) {
    logError(
        'JWT_TOKEN_CREATION_ERROR',
        error
    );

    throw error;
  }
}

export function verifyToken(
    token: string
): jwt.JwtPayload | string {
  const config = getConfig();

  try {
    const decodedToken = jwt.verify(
        token,
        config.jwtSecret,
        {
          algorithms: ['HS256'],
          issuer: config.jwtIssuer
        }
    );

    logInfo('JWT_TOKEN_VERIFIED');

    return decodedToken;
  } catch (error: unknown) {
    logError(
        'JWT_TOKEN_VERIFICATION_ERROR',
        error
    );

    throw error;
  }
}