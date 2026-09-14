import { getDatabase } from '../database/connection';
import {
  CustomerDocument,
  CustomerAuthResult
} from '../models/customer';
import {
  isValidCpf,
  normalizeCpf
} from '../utils/cpf-validator';
import {
  generateCustomerToken,
  JwtTokenResult
} from './jwt.service';
import {
  logError,
  logInfo,
  logWarn
} from '../utils/logger';

export class AuthError extends Error {
  constructor(
      public statusCode: number,
      message: string,
      public errorCode: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthResponse {
  token: string;
  type: string;
  expiresIn: number;
  customer: {
    id: string;
    name: string;
    document: string;
    email?: string;
  };
}

export async function authenticateCustomerByCpf(
    cpfInput: string | null | undefined
): Promise<AuthResponse> {
  const authenticationStart = Date.now();

  logInfo('AUTHENTICATION_REQUEST_STARTED', {
    cpfProvided: Boolean(cpfInput),
    cpfLength:
        typeof cpfInput === 'string'
            ? cpfInput.length
            : 0
  });

  if (!cpfInput) {
    logWarn('AUTHENTICATION_FAILED', {
      reason: 'MISSING_CPF',
      durationMs: Date.now() - authenticationStart
    });

    throw new AuthError(
        400,
        'CPF não informado no corpo da requisição',
        'MISSING_CPF'
    );
  }

  const normalized = normalizeCpf(cpfInput);

  logInfo('CPF_INPUT_RECEIVED', {
    cpfLength: normalized.length,
    normalizedSuccessfully: normalized.length > 0
  });

  if (!isValidCpf(normalized)) {
    logWarn('AUTHENTICATION_FAILED', {
      reason: 'INVALID_CPF',
      durationMs: Date.now() - authenticationStart
    });

    throw new AuthError(
        400,
        'CPF informado é inválido',
        'INVALID_CPF'
    );
  }

  logInfo('CPF_VALIDATED');

  let db;

  try {
    db = await getDatabase();
  } catch (error: unknown) {
    logError(
        'AUTHENTICATION_DATABASE_ERROR',
        error,
        {
          durationMs:
              Date.now() - authenticationStart
        }
    );

    throw error;
  }

  const collection =
      db.collection<CustomerDocument>('customers');

  logInfo('CUSTOMER_LOOKUP_STARTED', {
    collection: 'customers'
  });

  const lookupStart = Date.now();

  let customer: CustomerDocument | null;

  try {
    customer = await collection.findOne({
      $or: [
        { document: normalized },
        { document: cpfInput }
      ]
    });
  } catch (error: unknown) {
    logError(
        'CUSTOMER_LOOKUP_ERROR',
        error,
        {
          durationMs: Date.now() - lookupStart
        }
    );

    throw error;
  }

  const lookupDurationMs =
      Date.now() - lookupStart;

  if (!customer) {
    logWarn('CUSTOMER_LOOKUP_NOT_FOUND', {
      durationMs: lookupDurationMs
    });

    logWarn('AUTHENTICATION_FAILED', {
      reason: 'CUSTOMER_NOT_FOUND',
      durationMs:
          Date.now() - authenticationStart
    });

    throw new AuthError(
        404,
        'Cliente não encontrado para o CPF informado',
        'CUSTOMER_NOT_FOUND'
    );
  }

  logInfo('CUSTOMER_LOOKUP_SUCCESS', {
    durationMs: lookupDurationMs
  });

  if (customer.active === false) {
    logWarn('CUSTOMER_INACTIVE');

    logWarn('AUTHENTICATION_FAILED', {
      reason: 'CUSTOMER_INACTIVE',
      durationMs:
          Date.now() - authenticationStart
    });

    throw new AuthError(
        403,
        'Cliente inativo no sistema',
        'CUSTOMER_INACTIVE'
    );
  }

  const customerId =
      customer.id || String(customer._id);

  const isCustomerActive =
      customer.active ?? true;

  const authResult: CustomerAuthResult = {
    id: customerId,
    name: customer.name,
    document: customer.document,
    email: customer.email,
    active: isCustomerActive
  };

  logInfo('CUSTOMER_AUTHORIZATION_DATA_PREPARED', {
    customerActive: isCustomerActive
  });

  let jwtResult: JwtTokenResult;

  try {
    jwtResult =
        generateCustomerToken(authResult);
  } catch (error: unknown) {
    logError(
        'JWT_GENERATION_ERROR',
        error,
        {
          durationMs:
              Date.now() - authenticationStart
        }
    );

    throw error;
  }

  logInfo('JWT_GENERATED', {
    tokenType: jwtResult.type,
    expiresInMs: jwtResult.expiresIn
  });

  const totalDurationMs =
      Date.now() - authenticationStart;

  logInfo('AUTHENTICATION_SUCCESS', {
    durationMs: totalDurationMs
  });

  return {
    token: jwtResult.token,
    type: jwtResult.type,
    expiresIn: jwtResult.expiresIn,
    customer: {
      id: customerId,
      name: customer.name,
      document: customer.document,
      email: customer.email
    }
  };
}