import * as XLSX from 'xlsx';
import { Guest, GuestStatus } from '@/types/database';

export interface ImportResult {
  addedGuests: Omit<Guest, 'id' | 'created_at' | 'updated_at'>[];
  addedCount: number;
  skippedDuplicatesCount: number;
  skippedNames: string[];
}

export function parseAndDeduplicateExcel(
  fileBuffer: ArrayBuffer,
  existingGuests: Guest[]
): ImportResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert sheet to JSON rows
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Map of normalized existing guest names and emails
  const existingNamesSet = new Set<string>();
  const existingEmailsSet = new Set<string>();

  existingGuests.forEach(g => {
    if (g.full_name) {
      existingNamesSet.add(normalizeString(g.full_name));
    }
    if (g.email) {
      existingEmailsSet.add(normalizeString(g.email));
    }
  });

  const addedGuests: Omit<Guest, 'id' | 'created_at' | 'updated_at'>[] = [];
  const skippedNames: string[] = [];
  let skippedDuplicatesCount = 0;

  for (const row of rawRows) {
    // Intelligently find columns
    let rawName = String(
      findValue(row, ['nombre', 'nombre completo', 'full name', 'name', 'invitado', 'invitados'])
    ).trim();

    if (!rawName) continue; // Skip empty rows

    let nickname = String(
      findValue(row, ['apodo', 'apodos', 'alias', 'nickname', 'segundo nombre'])
    ).trim();

    // Extract embedded nicknames from quotes or parentheses e.g. 'Jose "Pepe" Perez' or 'Maria (Mari) Lopez'
    if (!nickname) {
      const matchQuotes = rawName.match(/["'««]([^"'»»]+)["'»»]/);
      const matchParen = rawName.match(/\(([^)]+)\)/);
      if (matchQuotes) {
        nickname = matchQuotes[1].trim();
        rawName = rawName.replace(/["'««]([^"'»»]+)["'»»]/, '').replace(/\s+/g, ' ').trim();
      } else if (matchParen) {
        nickname = matchParen[1].trim();
        rawName = rawName.replace(/\(([^)]+)\)/, '').replace(/\s+/g, ' ').trim();
      }
    }

    const email = String(
      findValue(row, ['email', 'correo', 'correo electronico', 'mail'])
    ).trim();

    const phone = String(
      findValue(row, ['telefono', 'teléfono', 'phone', 'celular', 'móvil'])
    ).trim();

    const category = String(
      findValue(row, ['categoria', 'categoría', 'grupo', 'tipo', 'family', 'relación'])
    ).trim() || 'Amigos';

    let statusRaw = String(
      findValue(row, ['estado', 'asistencia', 'status', 'confirmacion', 'confirmado'])
    ).trim().toLowerCase();

    let status: GuestStatus = 'pending';
    if (statusRaw.includes('confir') || statusRaw.includes('si') || statusRaw === 'yes') {
      status = 'confirmed';
    } else if (statusRaw.includes('declin') || statusRaw.includes('no')) {
      status = 'declined';
    }

    const companionsCount = parseInt(
      String(findValue(row, ['acompañantes', 'acompanantes', 'extra', 'pases', 'invitados extra']))
    ) || 0;

    const dietary = String(
      findValue(row, ['alergias', 'dietas', 'restricciones', 'menu', 'menú'])
    ).trim();

    const normalizedNameKey = normalizeString(rawName);
    const normalizedEmailKey = email ? normalizeString(email) : '';

    // Check if duplicate exists (by name or by email)
    const isDuplicateByName = existingNamesSet.has(normalizedNameKey);
    const isDuplicateByEmail = email && existingEmailsSet.has(normalizedEmailKey);

    if (isDuplicateByName || isDuplicateByEmail) {
      skippedDuplicatesCount++;
      skippedNames.push(rawName);
      continue; // Skip duplicates (obviar duplicado)
    }

    // Mark as added in set to avoid duplicates within the same Excel file
    existingNamesSet.add(normalizedNameKey);
    if (email) existingEmailsSet.add(normalizedEmailKey);

    addedGuests.push({
      full_name: rawName,
      nickname: nickname || undefined,
      category: category || 'Amigos',
      email,
      phone: phone || undefined,
      status,
      companions_count: companionsCount,
      dietary_restrictions: dietary || undefined,
      invitation_sent: true,
      invitation_opened: false
    });
  }

  return {
    addedGuests,
    addedCount: addedGuests.length,
    skippedDuplicatesCount,
    skippedNames
  };
}

// Generate Excel file for export
export function generateGuestExcelBuffer(guests: Guest[]): Uint8Array {
  const exportRows = guests.map((g, idx) => ({
    'N°': idx + 1,
    'Nombre Completo': g.full_name,
    'Apodo / Alias': g.nickname || '',
    'Categoría': g.category || 'Amigos',
    'Email': g.email || '',
    'Teléfono': g.phone || '',
    'Estado': g.status === 'confirmed' ? 'Confirmado' : g.status === 'declined' ? 'No asistirá' : 'Pendiente',
    'Acompañantes Extra': g.companions_count || 0,
    'Dietas / Alergias': g.dietary_restrictions || 'Ninguna'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Invitados');

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

// Helper: Normalize string for comparison
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Helper: Find value from multiple possible header variations
function findValue(row: Record<string, any>, keys: string[]): any {
  for (const rowKey of Object.keys(row)) {
    const normKey = normalizeString(rowKey);
    if (keys.some(k => normKey.includes(normalizeString(k)))) {
      return row[rowKey];
    }
  }
  return '';
}
