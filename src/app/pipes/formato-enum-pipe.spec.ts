import { FormatoEnumPipe } from './formato-enum-pipe';

describe('FormatoEnumPipe', () => {
  const pipe = new FormatoEnumPipe();

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('formatea los valores del enum', () => {
    expect(pipe.transform('KILOGRAMOS')).toBe('Kilogramos');
    expect(pipe.transform('LINK_DE_PAGO')).toBe('Link de pago');
    expect(pipe.transform(null)).toBe('');
  });
});
