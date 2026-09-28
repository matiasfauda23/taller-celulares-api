import { AccountPublicMapper } from '../../../src/accounts/account-public.mapper';
import { AuthResponseMapper } from '../../../src/auth/mappers/auth-response.mapper';
import { RegisterDto } from '../../../src/auth/dto/register.dto';
import { WorkshopPublicMapper } from '../../../src/workshops/workshop-public.mapper';
import { validateDto } from '../../helpers/validation';

describe('registration DTO and public mappers', () => {
  const valid = {
    ownerName: '  Ana Pérez ',
    email: ' ANA@Example.COM ',
    password: '  password-long-enough  ',
    workshopName: ' Central ',
    workshopAddress: ' Main Street 123 ',
  };
  it('normalizes public strings but preserves the password exactly', async () => {
    const dto = await validateDto(RegisterDto, valid);
    expect(dto).toEqual({
      ...valid,
      ownerName: 'Ana Pérez',
      email: 'ana@example.com',
      workshopName: 'Central',
      workshopAddress: 'Main Street 123',
    });
  });
  it.each([
    { ...valid, extra: true },
    { ...valid, password: 'short' },
    { ...valid, email: 'nope' },
  ])('rejects invalid or undeclared input', async (input) => {
    await expect(validateDto(RegisterDto, input)).rejects.toBeDefined();
  });
  it('maps an explicit public projection without hashes or internal timestamps', () => {
    const mapper = new AuthResponseMapper(
      new AccountPublicMapper(),
      new WorkshopPublicMapper(),
    );
    const account = {
      id: 'a',
      ownerName: 'Ana',
      email: 'a@b.co',
      passwordHash: 'SECRET_HASH',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const workshop = {
      id: 'w',
      accountId: 'a',
      name: 'Shop',
      address: 'Street',
      createdAt: new Date(),
      updatedAt: new Date(),
      nextOrderNumber: 1,
    };
    const result = mapper.toAuthResponse(account, workshop, {
      accessToken: 'access',
      refreshToken: 'refresh',
      accessExpiresIn: 900,
      refreshExpiresIn: 604800,
    });
    expect(result).toEqual({
      account: { id: 'a', ownerName: 'Ana', email: 'a@b.co' },
      workshop: { id: 'w', name: 'Shop', address: 'Street' },
      tokens: {
        accessToken: 'access',
        refreshToken: 'refresh',
        accessExpiresIn: 900,
        refreshExpiresIn: 604800,
      },
    });
    expect(JSON.stringify(result)).not.toContain('SECRET_HASH');
  });
});
