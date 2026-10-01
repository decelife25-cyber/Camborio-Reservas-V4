export function esTelefonoTecnico(valor: string | null | undefined): boolean {
  return /^000000\d{3}$/.test(String(valor ?? '').trim());
}

export function mostrarTelefono(valor: string | null | undefined): string {
  const telefono = String(valor ?? '').trim();
  return !telefono || esTelefonoTecnico(telefono) ? 'SIN TELÉFONO' : telefono;
}
