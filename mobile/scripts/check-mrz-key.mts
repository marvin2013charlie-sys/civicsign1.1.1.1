/**
 * Checks the chip access key derivation with no toolchain:
 *   node --experimental-strip-types scripts/check-mrz-key.mts
 *
 * Worth running before any build: a wrong key does not fail loudly, the chip
 * simply refuses to open, which is hard to tell from a hardware problem.
 */
import {accessKeyFromMrz, accessKeyLooksValid, checkDigit} from '../src/mrzKey.ts';

const cases: [string, string][] = [
  ['TD3 specimen', 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10'],
  ['TD3 sample', 'P<GBRPATEL<<SIAN<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n1234567897GBR9001011F3504152<<<<<<<<<<<<<<02'],
  ['TD1 card', 'I<UTOD231458907<<<<<<<<<<<<<<<\n7408122F1204159UTO<<<<<<<<<<<6\nERIKSSON<<ANNA<MARIA<<<<<<<<<<'],
];

let failures = 0;
const report = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures += 1;
};

for (const [name, mrz] of cases) {
  const key = accessKeyFromMrz(mrz);
  report(
    accessKeyLooksValid(key),
    `${name}: doc=${key.documentNumber} dob=${key.dateOfBirth} exp=${key.dateOfExpiry}`,
  );
}

const mistyped = accessKeyFromMrz(
  'P<GBRPATEL<<SIAN<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n1234567890GBR9001011F3504152<<<<<<<<<<<<<<02',
);
report(!accessKeyLooksValid(mistyped), 'a mistyped document number is caught before scanning');
report(checkDigit('D23145890') === '7', 'check digit matches the specimen document');

try {
  accessKeyFromMrz('not a machine readable zone');
  report(false, 'rubbish input is rejected');
} catch {
  report(true, 'rubbish input is rejected');
}

process.exit(failures ? 1 : 0);
