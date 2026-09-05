import { generateCustomerToken, verifyToken } from '../src/services/jwt.service';
import { CustomerAuthResult } from '../src/models/customer';
import jwt from 'jsonwebtoken';

describe('JWT Service', () => {
  const mockCustomer: CustomerAuthResult = {
    id: 'cust-12345',
    name: 'Carlos Oliveira',
    document: '52998224725',
    email: 'carlos@example.com',
    active: true
  };

  it('should generate a valid JWT token with customer claims', () => {
    const result = generateCustomerToken(mockCustomer);

    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.type).toBe('Bearer');
    expect(result.expiresIn).toBe(86400000);

    const decoded = verifyToken(result.token) as jwt.JwtPayload;
    expect(decoded.sub).toBe('carlos@example.com');
    expect(decoded.iss).toBe('officyna-auth');
    expect(decoded.roles).toBe('CUSTOMER');
    expect(decoded.name).toBe('Carlos Oliveira');
    expect(decoded.email).toBe('carlos@example.com');
    expect(decoded.cpf).toBe('52998224725');
    expect(decoded.customerId).toBe('cust-12345');
    expect(decoded.type).toBe('CUSTOMER');
  });

  it('should handle customer without email using document as fallback subject', () => {
    const customerNoEmail: CustomerAuthResult = {
      id: 'cust-999',
      name: 'Sem Email',
      document: '88544977030',
      active: true
    };

    const result = generateCustomerToken(customerNoEmail);
    const decoded = verifyToken(result.token) as jwt.JwtPayload;

    expect(decoded.sub).toBe('88544977030');
    expect(decoded.email).toBe('');
    expect(decoded.cpf).toBe('88544977030');
    expect(decoded.name).toBe('Sem Email');
  });
});
