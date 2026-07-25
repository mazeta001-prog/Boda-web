import * as XLSX from 'xlsx';
import { Guest, GuestStatus } from '@/types/database';

export interface ColumnMappingInfo {
  fieldKey: string;
  fieldLabel: string;
  detectedHeader: string;
}

export interface DuplicateGuestInfo {
  guest: Omit<Guest, 'id' | 'created_at' | 'updated_at'>;
  reason: string;
  existingMatchName?: string;
  existingMatchEmail?: string;
}

export interface ImportResult {
  addedGuests: Omit<Guest, 'id' | 'created_at' | 'updated_at'>[];
  addedCount: number;
  duplicateGuests: DuplicateGuestInfo[];
  skippedDuplicatesCount: number;
  skippedNames: string[];
  detectedMappings: ColumnMappingInfo[];
  totalRowsProcessed: number;
}

const EXCLUDED_HEADER_PATTERNS = [
  'codigo pais', 'código país', 'country code', 'prefijo', 'prefix',
  'invitado numero', 'numero invitado', 'n°', 'no.', '#'
];

const FIELD_PATTERNS: Record<string, { label: string; keys: string[] }> = {
  first_name: {
    label: 'Nombre',
    keys: ['nombre', 'nombres', 'first name', 'given name']
  },
  last_name: {
    label: 'Apellido',
    keys: ['apellido', 'apellidos', 'last name', 'surname']
  },
  full_name: {
    label: 'Nombre Completo',
    keys: [
      'nombre completo', 'full name', 'fullname', 'nombres y apellidos', 'nombre y apellido',
      'datos de invitado', 'guest name', 'asistente', 'participante', 'titular', 'persona'
    ]
  },
  nickname: {
    label: 'Apodo / Alias',
    keys: [
      'apodo / alias', 'apodo/alias', 'apodo', 'apodos', 'alias', 'nickname', 'sobrenombre',
      'nick', 'nombre del invitado', 'llamado', 'conocido como'
    ]
  },
  country_code: {
    label: 'Código País',
    keys: ['codigo pais', 'código país', 'country code', 'prefijo', 'prefix']
  },
  phone: {
    label: 'Teléfono / WhatsApp',
    keys: [
      'numero de telefono', 'número de teléfono', 'numero whatsapp', 'número whatsapp', 'whatsapp',
      'telefono', 'teléfono', 'phone number', 'celular', 'móvil', 'movil', 'contacto tel',
      'telefonos', 'teléfonos', 'mobile', 'cell', 'tel/cel', 'whatsapp/tel', 'telefono movil', 'tel'
    ]
  },
  category: {
    label: 'Categoría / Parentezco',
    keys: ['parentezco', 'categoria', 'categoría', 'grupo', 'tipo', 'family', 'familia', 'relación', 'relacion', 'etiqueta', 'tag', 'bando', 'pertenece']
  },
  status: {
    label: 'Estado de Asistencia',
    keys: ['estado', 'asistencia', 'status', 'confirmacion', 'confirmación', 'confirmado', 'asistira', 'asistirá', 'rsvp', 'asiste', 'va']
  },
  companions_count: {
    label: 'Acompañantes Extra',
    keys: ['acompañantes', 'acompanantes', 'extra', 'pases', 'invitados extra', 'mas 1', 'plus 1', '+1', 'acompañante', 'pases adicionales', 'numero de pases', 'cantidad']
  },
  dietary_restrictions: {
    label: 'Dietas / Alergias',
    keys: ['alergias', 'dietas', 'restricciones', 'menu', 'menú', 'dieta', 'observaciones', 'notas', 'comentarios', 'alergia', 'restriccion', 'restricción']
  }
};

const IGNORED_HEADER_WORDS = new Set([
  'nombre', 'nombres', 'apellidos', 'telefono', 'teléfono', 'phone', 'email', 'correo', 'categoria', 
  'categoría', 'estado', 'asistencia', 'acompañantes', 'acompanantes', 'dietas', 'alergias', 'invitado', 
  'invitados', 'lista', 'boda', 'n°', 'no.', 'numero', 'número', 'hoja', 'sheet', 'datos', 'parentezco'
]);

export function parseAndDeduplicateExcel(
  fileBuffer: ArrayBuffer,
  existingGuests: Guest[]
): ImportResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // 1. Read sheet as 2D array of raw values
  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

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

  // Track header detection per field
  const detectedHeadersMap: Record<string, string> = {};

  // 2. Discover Header Row in first 15 rows (avoiding sub-title sentence rows)
  let headerRowIndex = -1;
  let maxHeaderMatches = 0;

  for (let r = 0; r < Math.min(15, matrix.length); r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.length < 2) continue;

    let matchingCellsInRow = 0;
    row.forEach(cell => {
      const cellStr = normalizeString(String(cell));
      if (!cellStr || cellStr.length > 45) return; // Skip title / description sentences!
      
      const isHeaderMatch = Object.values(FIELD_PATTERNS).some(pattern =>
        pattern.keys.some(k => cellStr === normalizeString(k) || cellStr.includes(normalizeString(k)))
      );
      if (isHeaderMatch) matchingCellsInRow++;
    });

    if (matchingCellsInRow > maxHeaderMatches) {
      maxHeaderMatches = matchingCellsInRow;
      headerRowIndex = r;
    }
  }

  // Column index map for discovered fields
  const columnIndexMap: Record<string, number> = {};

  if (headerRowIndex >= 0 && maxHeaderMatches > 0) {
    const headerCells = matrix[headerRowIndex];
    headerCells.forEach((cellVal, colIdx) => {
      const normCell = normalizeString(String(cellVal));
      if (!normCell) return;

      // Skip excluded header patterns like 'código país' or 'invitado numero'
      if (EXCLUDED_HEADER_PATTERNS.some(p => normCell === normalizeString(p))) return;

      // First pass: exact matches
      Object.entries(FIELD_PATTERNS).forEach(([fieldKey, config]) => {
        if (columnIndexMap[fieldKey] !== undefined) return;
        const matchedKey = config.keys.find(k => normCell === normalizeString(k));
        if (matchedKey) {
          columnIndexMap[fieldKey] = colIdx;
          detectedHeadersMap[fieldKey] = String(cellVal).trim() || config.label;
        }
      });

      // Second pass: loose partial matches
      Object.entries(FIELD_PATTERNS).forEach(([fieldKey, config]) => {
        if (columnIndexMap[fieldKey] !== undefined) return;
        const matchedKey = config.keys.find(k => normCell.includes(normalizeString(k)));
        if (matchedKey) {
          columnIndexMap[fieldKey] = colIdx;
          detectedHeadersMap[fieldKey] = String(cellVal).trim() || config.label;
        }
      });
    });
  }

  // 3. Process Data Rows (Structured or Completely Unstructured/Random)
  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const addedGuests: Omit<Guest, 'id' | 'created_at' | 'updated_at'>[] = [];
  const duplicateGuests: DuplicateGuestInfo[] = [];
  const skippedNames: string[] = [];
  let skippedDuplicatesCount = 0;
  let totalRowsProcessed = 0;

  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.every(c => String(c).trim() === '')) {
      continue; // Skip empty rows
    }
    totalRowsProcessed++;

    // Collect all raw non-empty values from row
    let rowValues: string[] = row.map(c => String(c).trim()).filter(Boolean);

    // If row is a single long string with delimiters e.g. "Juan Perez - 8095551234 - juan@test.com", split it
    if (rowValues.length === 1 && /[,\-\|\;\t]/.test(rowValues[0])) {
      rowValues = rowValues[0].split(/[,\-\|\;\t]+/).map(s => s.trim()).filter(Boolean);
    }

    // Unstructured Intelligent Classifier
    const parsedGuest = extractGuestFromUnstructuredTokens(rowValues, columnIndexMap, row);

    if (!parsedGuest.full_name) continue;

    // Check if name is an ignored header keyword (e.g. if row was header that wasn't skipped)
    if (IGNORED_HEADER_WORDS.has(normalizeString(parsedGuest.full_name))) {
      continue;
    }

    const candidateGuest: Omit<Guest, 'id' | 'created_at' | 'updated_at'> = {
      full_name: parsedGuest.full_name,
      nickname: parsedGuest.nickname || undefined,
      category: parsedGuest.category || 'Amigos',
      email: parsedGuest.email || '',
      phone: parsedGuest.phone || undefined,
      status: parsedGuest.status || 'pending',
      companions_count: parsedGuest.companions_count || 0,
      dietary_restrictions: parsedGuest.dietary_restrictions || undefined,
      invitation_sent: true,
      invitation_opened: false
    };

    // Deduplication check
    const normalizedNameKey = normalizeString(parsedGuest.full_name);
    const normalizedEmailKey = parsedGuest.email ? normalizeString(parsedGuest.email) : '';

    const isDuplicateByName = existingNamesSet.has(normalizedNameKey);
    const isDuplicateByEmail = parsedGuest.email ? existingEmailsSet.has(normalizedEmailKey) : false;

    if (isDuplicateByName || isDuplicateByEmail) {
      skippedDuplicatesCount++;
      skippedNames.push(parsedGuest.full_name);

      let reason = '';
      if (isDuplicateByName && isDuplicateByEmail) {
        reason = `El nombre "${parsedGuest.full_name}" y el correo "${parsedGuest.email}" ya existen en la lista.`;
      } else if (isDuplicateByName) {
        reason = `El nombre "${parsedGuest.full_name}" ya existe en tu lista de invitados.`;
      } else {
        reason = `El correo "${parsedGuest.email}" ya está registrado en tu lista.`;
      }

      duplicateGuests.push({
        guest: candidateGuest,
        reason,
        existingMatchName: parsedGuest.full_name,
        existingMatchEmail: parsedGuest.email
      });
      continue;
    }

    existingNamesSet.add(normalizedNameKey);
    if (parsedGuest.email) existingEmailsSet.add(normalizedEmailKey);

    addedGuests.push(candidateGuest);
  }

  // Build mapping summary for display in UI
  const detectedMappings: ColumnMappingInfo[] = Object.entries(FIELD_PATTERNS).map(([fieldKey, config]) => ({
    fieldKey,
    fieldLabel: config.label,
    detectedHeader: detectedHeadersMap[fieldKey] || (columnIndexMap[fieldKey] !== undefined ? `Columna ${columnIndexMap[fieldKey] + 1}` : 'Interpretación Inteligente Aleatoria')
  }));

  return {
    addedGuests,
    addedCount: addedGuests.length,
    duplicateGuests,
    skippedDuplicatesCount,
    skippedNames,
    detectedMappings,
    totalRowsProcessed
  };
}

// Universal Unstructured Token Classifier for Random Excel Rows
function extractGuestFromUnstructuredTokens(
  tokens: string[],
  columnIndexMap: Record<string, number>,
  rawRow: any[]
): {
  full_name: string;
  nickname?: string;
  email?: string;
  phone?: string;
  category?: string;
  status?: GuestStatus;
  companions_count?: number;
  dietary_restrictions?: string;
} {
  let full_name = '';
  let nickname: string | undefined;
  let email: string | undefined;
  let phone: string | undefined;
  let category = 'Amigos';
  let status: GuestStatus = 'pending';
  let companions_count = 0;
  let dietary_restrictions: string | undefined;

  // 1. Try column index mapping first if headers were discovered
  let mappedFirstName = '';
  let mappedLastName = '';
  let mappedCountryCode = '';
  let mappedRawPhone = '';

  if (columnIndexMap['first_name'] !== undefined && rawRow[columnIndexMap['first_name']]) {
    mappedFirstName = String(rawRow[columnIndexMap['first_name']]).trim();
  }
  if (columnIndexMap['last_name'] !== undefined && rawRow[columnIndexMap['last_name']]) {
    mappedLastName = String(rawRow[columnIndexMap['last_name']]).trim();
  }
  if (columnIndexMap['full_name'] !== undefined && rawRow[columnIndexMap['full_name']]) {
    full_name = String(rawRow[columnIndexMap['full_name']]).trim();
  }
  if (columnIndexMap['country_code'] !== undefined && rawRow[columnIndexMap['country_code']]) {
    mappedCountryCode = String(rawRow[columnIndexMap['country_code']]).trim();
  }
  if (columnIndexMap['phone'] !== undefined && rawRow[columnIndexMap['phone']]) {
    mappedRawPhone = String(rawRow[columnIndexMap['phone']]).trim();
  }

  // Combine First & Last Name if present
  if (mappedFirstName || mappedLastName) {
    full_name = [mappedFirstName, mappedLastName].filter(Boolean).join(' ').trim();
  }

  // Combine Country Code & Phone Number cleanly
  if (mappedRawPhone) {
    phone = formatPhoneNumberWithCC(mappedCountryCode, mappedRawPhone);
  }

  if (columnIndexMap['email'] !== undefined && rawRow[columnIndexMap['email']]) {
    email = String(rawRow[columnIndexMap['email']]).trim();
  }
  if (columnIndexMap['nickname'] !== undefined && rawRow[columnIndexMap['nickname']]) {
    const rawNick = String(rawRow[columnIndexMap['nickname']]).trim();
    if (rawNick && (!full_name || rawNick.toLowerCase() !== full_name.toLowerCase())) {
      nickname = rawNick;
    }
  }
  if (columnIndexMap['category'] !== undefined && rawRow[columnIndexMap['category']]) {
    category = String(rawRow[columnIndexMap['category']]).trim();
  }
  if (columnIndexMap['status'] !== undefined && rawRow[columnIndexMap['status']]) {
    const stRaw = String(rawRow[columnIndexMap['status']]).trim().toLowerCase();
    if (stRaw.includes('confir') || stRaw.includes('si') || stRaw === 'yes') status = 'confirmed';
    else if (stRaw.includes('declin') || stRaw.includes('no')) status = 'declined';
  }
  if (columnIndexMap['companions_count'] !== undefined && rawRow[columnIndexMap['companions_count']]) {
    companions_count = parseInt(String(rawRow[columnIndexMap['companions_count']])) || 0;
  }
  if (columnIndexMap['dietary_restrictions'] !== undefined && rawRow[columnIndexMap['dietary_restrictions']]) {
    dietary_restrictions = String(rawRow[columnIndexMap['dietary_restrictions']]).trim();
  }

  // 2. Classify unmapped tokens heuristically regardless of order/position
  const nameCandidates: string[] = [];

  for (const token of tokens) {
    if (!token) continue;
    const norm = normalizeString(token);

    // Email classifier
    if (!email && (token.includes('@') && token.includes('.'))) {
      email = token;
      continue;
    }

    // Phone classifier
    if (!phone && isPhoneNumber(token)) {
      phone = token;
      continue;
    }

    // Status classifier
    if (['confirmado', 'confirmada', 'si', 'yes', 'asistira', 'asiste', 'confirm'].includes(norm)) {
      status = 'confirmed';
      continue;
    }
    if (['declinado', 'declinada', 'no', 'no asistira', 'no asiste', 'decline', 'rechazado'].includes(norm)) {
      status = 'declined';
      continue;
    }

    // Category classifier
    if (['familia', 'family', 'pariente', 'primo', 'tío', 'tía', 'padre', 'madre'].some(k => norm.includes(k))) {
      category = 'Familia';
      continue;
    }
    if (['conocido', 'conocidos', 'trabajo', 'colaborador', 'vecino'].some(k => norm.includes(k))) {
      category = 'Conocidos';
      continue;
    }
    if (['amigo', 'amiga', 'amigos', 'friends'].some(k => norm.includes(k))) {
      category = 'Amigos';
      continue;
    }

    // Dietary classifier
    if (['vegetariano', 'vegano', 'celiaco', 'sin gluten', 'sin lactosa', 'alergico', 'alergia', 'dieta', 'menu', 'no come carne', 'intolerante'].some(k => norm.includes(k))) {
      dietary_restrictions = token;
      continue;
    }

    // Companions count classifier (must explicitly state "+1", "+2", "2 pases", "1 acompañante", etc. Avoid pure row numbers like "1", "80")
    if (companions_count === 0 && /^(\+\d{1,2}|\d{1,2}\s*(pases|acompañantes|personas|invitados|extra|plus)|(plus|mas|\+)\s*\d{1,2})$/i.test(token)) {
      const matchNum = token.match(/\d+/);
      if (matchNum) companions_count = parseInt(matchNum[0]) || 0;
      continue;
    }

    // Nickname extracted from quotes or parentheses (avoiding phone numbers like "+1 (829) ...")
    if (!nickname && !isPhoneNumber(token) && !/^\+?\d/.test(token)) {
      const matchQuotes = token.match(/["'««]([^"'»»]+)["'»»]/);
      const matchParen = token.match(/\(([^)]+)\)/);
      if (matchQuotes && matchQuotes[1].trim()) {
        nickname = matchQuotes[1].trim();
      } else if (matchParen && matchParen[1].trim() && !/^\d+$/.test(matchParen[1].trim())) {
        nickname = matchParen[1].trim();
      }
    }

    // Name candidate filter (must have letters, not pure numbers or system words)
    if (!IGNORED_HEADER_WORDS.has(norm) && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(token) && token.length >= 2) {
      nameCandidates.push(token);
    }
  }

  // 3. Resolve Full Name if not set by column index
  if (!full_name && nameCandidates.length > 0) {
    // If nickname was embedded inside name candidate, strip it
    let chosenName = nameCandidates.join(' ');
    chosenName = chosenName.replace(/["'««]([^"'»»]+)["'»»]/, '').replace(/\(([^)]+)\)/, '').replace(/\s+/g, ' ').trim();
    full_name = chosenName;
  }

  return {
    full_name,
    nickname,
    email,
    phone,
    category,
    status,
    companions_count,
    dietary_restrictions
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
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Helper: Check if string is a phone number format
function isPhoneNumber(valStr: string): boolean {
  const cleanDigits = valStr.replace(/\D/g, '');
  if (cleanDigits.length >= 7 && cleanDigits.length <= 15) {
    return /^[\+\d\s\-\(\)\.]{7,25}$/.test(valStr);
  }
  return false;
}

// Helper: Format phone number with country code
function formatPhoneNumberWithCC(ccStr: string, phoneStr: string): string {
  if (!phoneStr) return '';
  const cleanPhone = phoneStr.replace(/\D/g, '');
  const cleanCC = ccStr.replace(/\D/g, '') || '1';

  if (!cleanPhone) return phoneStr;

  // If phoneStr already starts with + or has 11+ digits including CC
  if (phoneStr.startsWith('+') || cleanPhone.length > 10) {
    if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      return `+1 (${cleanPhone.slice(1, 4)}) ${cleanPhone.slice(4, 7)}-${cleanPhone.slice(7)}`;
    }
    return phoneStr.startsWith('+') ? phoneStr : `+${phoneStr}`;
  }

  if (cleanCC === '1' && cleanPhone.length === 10) {
    return `+1 (${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
  }
  if (cleanCC === '34' && cleanPhone.length === 9) {
    return `+34 ${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
  }
  if (cleanCC === '49' && cleanPhone.length === 11) {
    return `+49 ${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 7)} ${cleanPhone.slice(7)}`;
  }
  if (cleanCC === '39' && cleanPhone.length === 10) {
    return `+39 ${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
  }

  return `+${cleanCC} ${cleanPhone}`;
}
