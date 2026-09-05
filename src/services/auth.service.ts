import { getDatabase } from '../database/connection';
import { CustomerDocument, CustomerAuthResult } from '../models/customer';
import { isValidCpf, normalizeCpf } from '../utils/cpf-validator';
import { generateCustomerToken, JwtTokenResult } from './jwt.service';

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

export async function authenticateCustomerByCpf(cpfInput: string | null | undefined): Promise<AuthResponse> {
  if (!cpfInput) {
    throw new AuthError(400, 'CPF não informado no corpo da requisição', 'MISSING_CPF');
  }

  const normalized = normalizeCpf(cpfInput);

  if (!isValidCpf(normalized)) {
    throw new AuthError(400, 'CPF informado é inválido', 'INVALID_CPF');
  }

  const db = await getDatabase();
  const collection = db.collection<CustomerDocument>('customers');

  // Search by normalized document or formatted variation
  const customer = await collection.findOne({
    $or: [
      { document: normalized },
      { document: cpfInput }
    ]
  });

  if (!customer) {
    throw new AuthError(404, 'Cliente não encontrado para o CPF informado', 'CUSTOMER_NOT_FOUND');
  }

  if (customer.active === false) {
    throw new AuthError(403, 'Cliente inativo no sistema', 'CUSTOMER_INACTIVE');
  }

  const customerId = customer.id || String(customer._id);
  const isCustomerActive = customer.active ?? true;

  const authResult: CustomerAuthResult = {
    id: customerId,
    name: customer.name,
    document: customer.document,
    email: customer.email,
    active: isCustomerActive
  };

  const jwtResult: JwtTokenResult = generateCustomerToken(authResult);

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
