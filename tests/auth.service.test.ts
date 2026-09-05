import { authenticateCustomerByCpf, AuthError } from '../src/services/auth.service';
import * as connection from '../src/database/connection';

jest.mock('../src/database/connection');

describe('Auth Service', () => {
  let mockFindOne: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne = jest.fn();
    (connection.getDatabase as jest.Mock).mockResolvedValue({
      collection: jest.fn().mockReturnValue({
        findOne: mockFindOne
      })
    });
  });

  it('should authenticate an active customer and return token and customer data', async () => {
    const mockCustomerDoc = {
      _id: 'mongo-id-1',
      id: 'cust-1',
      name: 'João Silva',
      document: '52998224725',
      email: 'joao@example.com',
      active: true
    };

    mockFindOne.mockResolvedValue(mockCustomerDoc);

    const result = await authenticateCustomerByCpf('529.982.247-25');

    expect(result).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.type).toBe('Bearer');
    expect(result.customer.name).toBe('João Silva');
    expect(result.customer.document).toBe('52998224725');
    expect(result.customer.email).toBe('joao@example.com');
  });

  it('should throw 400 when CPF is missing or empty', async () => {
    await expect(authenticateCustomerByCpf('')).rejects.toThrow(AuthError);
    await expect(authenticateCustomerByCpf(null)).rejects.toThrow(AuthError);
    await expect(authenticateCustomerByCpf(undefined)).rejects.toThrow(AuthError);
  });

  it('should throw 400 when CPF is invalid', async () => {
    await expect(authenticateCustomerByCpf('111.111.111-11')).rejects.toThrow(
      new AuthError(400, 'CPF informado é inválido', 'INVALID_CPF')
    );
  });

  it('should throw 404 when customer does not exist in database', async () => {
    mockFindOne.mockResolvedValue(null);

    await expect(authenticateCustomerByCpf('52998224725')).rejects.toThrow(
      new AuthError(404, 'Cliente não encontrado para o CPF informado', 'CUSTOMER_NOT_FOUND')
    );
  });

  it('should throw 403 when customer is inactive in database', async () => {
    const inactiveCustomer = {
      _id: 'mongo-id-2',
      id: 'cust-2',
      name: 'Maria Inativa',
      document: '52998224725',
      active: false
    };

    mockFindOne.mockResolvedValue(inactiveCustomer);

    await expect(authenticateCustomerByCpf('52998224725')).rejects.toThrow(
      new AuthError(403, 'Cliente inativo no sistema', 'CUSTOMER_INACTIVE')
    );
  });
});
