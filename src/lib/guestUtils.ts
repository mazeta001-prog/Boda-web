import { Guest } from '@/types/database';

export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'san', 'santa', 'van', 'von', 'di', 'da', 'dos', 'das']);

const COMMON_FIRST_NAMES = new Set([
  'carlos', 'jose', 'josefina', 'maria', 'luis', 'antonio', 'manuel', 'francisco', 'david', 'juan',
  'daniel', 'andres', 'alejandro', 'isabel', 'victoria', 'sofia', 'elena', 'ana', 'laura', 'carmen',
  'rosa', 'teresa', 'miguel', 'jorge', 'fernando', 'pedro', 'javier', 'alberto', 'diego', 'sergio',
  'alvaro', 'adrian', 'raul', 'enrique', 'ramon', 'vicente', 'mario', 'oscar', 'ruben', 'santiago',
  'joaquin', 'eduardo', 'guillermo', 'gabriel', 'gonzalo', 'pablo', 'felipe', 'hugo', 'martin',
  'lucia', 'paula', 'alba', 'sandra', 'marta', 'patricia', 'cristina', 'andrea', 'monica', 'alicia',
  'beatriz', 'silvia', 'rocio', 'claudia', 'irene', 'gloria', 'marina', 'raquel', 'lourdes', 'mercedes',
  'pilar', 'concepcion', 'dolores', 'esperanza', 'inmaculada', 'rosario', 'soledad', 'belen', 'celia',
  'clara', 'rebeca', 'veronica', 'noelia', 'vanesa', 'miriam', 'lorena', 'esther', 'ruth', 'susana',
  'yolanda', 'sonia', 'carolina', 'gustavo', 'hector', 'ivan', 'nicolas', 'tomas', 'samuel', 'valeria',
  'camila', 'mariana', 'daniela', 'paola', 'fernanda', 'renata', 'ximena', 'jimena', 'regina', 'catalina',
  'antonella', 'guadalupe', 'fatima', 'monserrat', 'luz', 'milagros', 'socorro', 'amparo', 'asuncion',
  'alexandra', 'alexander', 'marian', 'mariangel', 'gabriela', 'stephanie', 'stephany', 'steven', 'kevin',
  'brian', 'bryan', 'nicole', 'michelle', 'vanessa', 'jessica', 'paolo', 'mateo', 'lucas', 'thiago',
  'liam', 'ian', 'dylan', 'zoe', 'mia', 'emma', 'sofie', 'sophia', 'emilia', 'valentina', 'renato',
  'alida', 'jolivette', 'orlando', 'yolanda', 'yoselin', 'yessica', 'alain'
]);

export interface ParsedGuestName {
  firstName: string;
  secondName: string;
  firstLastName: string;
  secondLastName: string;
  baseShortName: string; // 1st Name + 1st Surname
}

/**
 * Converts a string to Title Case (e.g. "orlando/ramon capellan" -> "Orlando Capellan")
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .split(/\s+/)
    .map((word, idx) => {
      if (!word) return '';
      const lower = word.toLowerCase();
      if (idx > 0 && PARTICLES.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Parses a full name string into 1st Name, 2nd Name, 1st Surname, 2nd Surname, and base short name (1st Name + 1st Surname).
 * Handles slashes '/' representing alternative name forms (e.g. "Orlando/ramon capellan" -> firstName: "Orlando", firstLastName: "Capellan").
 */
export function parseGuestName(fullName: string): ParsedGuestName {
  if (!fullName) {
    return { firstName: '', secondName: '', firstLastName: '', secondLastName: '', baseShortName: '' };
  }

  const trimmed = fullName.trim();
  const hasSlash = /[\/\\|()]/.test(trimmed);

  if (hasSlash) {
    const slashParts = trimmed.split(/[\/\\|()]/).map(p => p.trim()).filter(Boolean);
    const beforeSlash = slashParts[0] || '';
    const afterSlashStr = slashParts.slice(1).join(' ');

    const wordsBefore = beforeSlash.split(/\s+/).filter(Boolean);
    const firstName = toTitleCase(wordsBefore[0]);
    const secondNameBefore = wordsBefore.length > 1 ? toTitleCase(wordsBefore[1]) : '';

    const wordsAfter = afterSlashStr.split(/\s+/).filter(Boolean);

    let alternativeNames: string[] = [];
    let surnames: string[] = [];

    if (wordsAfter.length === 1) {
      surnames = wordsAfter;
    } else if (wordsAfter.length >= 2) {
      alternativeNames.push(wordsAfter[0]);
      surnames = wordsAfter.slice(1);
    }

    const cleanSurnames: string[] = [];
    let i = 0;
    while (i < surnames.length) {
      let current = surnames[i];
      while (i + 1 < surnames.length && PARTICLES.has(normalizeString(current))) {
        i++;
        current = `${current} ${surnames[i]}`;
      }
      cleanSurnames.push(toTitleCase(current));
      i++;
    }

    const firstLastName = cleanSurnames[0] || '';
    const secondLastName = cleanSurnames.slice(1).join(' ');

    const secondName = secondNameBefore || (alternativeNames.length > 0 ? toTitleCase(alternativeNames[0]) : '');
    const baseShortName = firstLastName ? `${firstName} ${firstLastName}` : firstName;

    return {
      firstName,
      secondName,
      firstLastName,
      secondLastName,
      baseShortName
    };
  }

  // No slash: Standard name parsing
  const rawWords = trimmed.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) {
    return { firstName: '', secondName: '', firstLastName: '', secondLastName: '', baseShortName: '' };
  }

  const parts: string[] = [];
  let i = 0;
  while (i < rawWords.length) {
    let current = rawWords[i];
    while (i + 1 < rawWords.length && PARTICLES.has(normalizeString(current))) {
      i++;
      current = `${current} ${rawWords[i]}`;
    }
    parts.push(toTitleCase(current));
    i++;
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      secondName: '',
      firstLastName: '',
      secondLastName: '',
      baseShortName: parts[0]
    };
  }

  if (parts.length === 2) {
    return {
      firstName: parts[0],
      secondName: '',
      firstLastName: parts[1],
      secondLastName: '',
      baseShortName: `${parts[0]} ${parts[1]}`
    };
  }

  if (parts.length === 3) {
    const isP1FirstName = COMMON_FIRST_NAMES.has(normalizeString(parts[1]));
    if (isP1FirstName) {
      return {
        firstName: parts[0],
        secondName: parts[1],
        firstLastName: parts[2],
        secondLastName: '',
        baseShortName: `${parts[0]} ${parts[2]}`
      };
    } else {
      return {
        firstName: parts[0],
        secondName: '',
        firstLastName: parts[1],
        secondLastName: parts[2],
        baseShortName: `${parts[0]} ${parts[1]}`
      };
    }
  }

  const secondLastName = parts.slice(3).join(' ');
  return {
    firstName: parts[0],
    secondName: parts[1],
    firstLastName: parts[2],
    secondLastName: secondLastName,
    baseShortName: `${parts[0]} ${parts[2]}`
  };
}

/**
 * Returns the display name for a guest.
 * - Default: 1st Name before '/' + 1st Surname (e.g. "Orlando Capellan" for "Orlando/ramon capellan").
 * - Exception: If multiple guests in `allGuests` share the same 1st Name + 1st Surname,
 *   it expands their name with differentiating 2nd name or 2nd surname.
 */
export function getFormattedGuestDisplayName(
  guest: { full_name: string },
  allGuests: { full_name: string }[] = []
): string {
  if (!guest || !guest.full_name) return '';
  const targetParsed = parseGuestName(guest.full_name);
  if (!targetParsed.firstLastName) {
    return targetParsed.firstName || guest.full_name;
  }

  const targetNormBase = normalizeString(targetParsed.baseShortName);

  // Find all guests sharing the same base short name (1st Name + 1st Surname)
  const collidingGuests = allGuests.filter(g => {
    if (!g || !g.full_name) return false;
    const parsed = parseGuestName(g.full_name);
    return normalizeString(parsed.baseShortName) === targetNormBase;
  });

  // Case A: No collision -> Display 1st Name + 1st Surname
  if (collidingGuests.length <= 1) {
    return targetParsed.baseShortName;
  }

  // Case B: Collision detected! Differentiate using 2nd name or 2nd surname
  const cand1 = targetParsed.secondName 
    ? `${targetParsed.firstName} ${targetParsed.secondName} ${targetParsed.firstLastName}` 
    : '';

  if (cand1) {
    const cand1Norm = normalizeString(cand1);
    const cand1Counts = collidingGuests.filter(g => {
      const p = parseGuestName(g.full_name);
      const c = p.secondName ? `${p.firstName} ${p.secondName} ${p.firstLastName}` : '';
      return normalizeString(c) === cand1Norm;
    });

    if (cand1Counts.length === 1) {
      return cand1;
    }
  }

  const cand2 = targetParsed.secondLastName 
    ? `${targetParsed.firstName} ${targetParsed.firstLastName} ${targetParsed.secondLastName}`
    : '';

  if (cand2) {
    const cand2Norm = normalizeString(cand2);
    const cand2Counts = collidingGuests.filter(g => {
      const p = parseGuestName(g.full_name);
      const c = p.secondLastName ? `${p.firstName} ${p.firstLastName} ${p.secondLastName}` : '';
      return normalizeString(c) === cand2Norm;
    });

    if (cand2Counts.length === 1) {
      return cand2;
    }
  }

  // Fallback: Title Case of main parsed name
  return targetParsed.baseShortName || toTitleCase(guest.full_name.replace(/[\/\\|()]/g, ' '));
}

/**
 * Flexible guest search matching logic.
 * Checks if all query tokens are present in full_name or nickname.
 */
export function matchGuestSearch(
  guest: Guest | { full_name: string; nickname?: string },
  firstNameQuery: string,
  lastNameQuery: string
): boolean {
  const fName = firstNameQuery.trim();
  const lName = lastNameQuery.trim();
  const fullQuery = `${fName} ${lName}`.trim();
  if (!fullQuery) return false;

  const queryTokens = normalizeString(fullQuery).split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return false;

  // Clean slashes and special characters for search so all alternative forms match
  const cleanFullName = (guest.full_name || '').replace(/[\/\\|()]/g, ' ');
  const normFull = normalizeString(cleanFullName);
  const normNick = guest.nickname ? normalizeString(guest.nickname) : '';

  return queryTokens.every(token => normFull.includes(token) || normNick.includes(token));
}
