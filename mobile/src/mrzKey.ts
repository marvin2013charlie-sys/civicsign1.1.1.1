/**
 * The chip will not open without proof you are holding the document.
 *
 * ICAO 9303 part 11 derives the access key from three fields printed in the
 * machine readable zone: document number, date of birth and date of expiry,
 * each with its check digit. That is why the signer photographs the page
 * before the phone touches the chip.
 */

export interface ChipAccessKey {
  documentNumber: string;
  dateOfBirth: string; // YYMMDD
  dateOfExpiry: string; // YYMMDD
}

const WEIGHTS = [7, 3, 1];

export function charValue(char: string): number {
  if (char === '<') return 0;
  if (char >= '0' && char <= '9') return Number(char);
  if (char >= 'A' && char <= 'Z') return char.charCodeAt(0) - 65 + 10;
  throw new Error(`Character ${char} is not valid in a machine readable zone`);
}

export function checkDigit(data: string): string {
  let total = 0;
  for (let i = 0; i < data.length; i += 1) {
    total += charValue(data[i]) * WEIGHTS[i % 3];
  }
  return String(total % 10);
}

/** Pull the access key out of a two or three line MRZ. */
export function accessKeyFromMrz(mrz: string): ChipAccessKey {
  const lines = mrz
    .toUpperCase()
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ''))
    .filter(Boolean);

  if (lines.length === 2 && (lines[0].length === 44 || lines[0].length === 36)) {
    const second = lines[1];
    return {
      documentNumber: second.slice(0, 10), // includes the check digit
      dateOfBirth: second.slice(13, 20),
      dateOfExpiry: second.slice(21, 28),
    };
  }

  if (lines.length === 3 && lines[0].length === 30) {
    return {
      documentNumber: lines[0].slice(5, 15),
      dateOfBirth: lines[1].slice(0, 7),
      dateOfExpiry: lines[1].slice(8, 15),
    };
  }

  throw new Error('That does not look like a machine readable zone');
}

/** Guard before touching the chip: a wrong key just fails to open it. */
export function accessKeyLooksValid(key: ChipAccessKey): boolean {
  const field = (value: string) =>
    value.length > 1 && checkDigit(value.slice(0, -1)) === value.slice(-1);
  return (
    field(key.documentNumber) && field(key.dateOfBirth) && field(key.dateOfExpiry)
  );
}
