/**
 * Pure, side-effect-free helpers for turning the seed CSV into database
 * records. Kept separate from any database access so they can be unit tested
 * in isolation and reused by the seed script.
 */

export interface GameCsvRow {
    title: string;
    category: string;
    publisher: string;
    description: string;
}

const REQUIRED_GAME_CSV_HEADERS: readonly string[] = [
    'Title',
    'Category',
    'Publisher',
    'Description',
];

const CROWDFUNDING_BLURB = ' Support this game through our crowdfunding platform!';

interface ParsedCsv {
    header: string[];
    rows: Record<string, string>[];
}

/**
 * Minimal RFC-4180-style CSV parser supporting quoted fields, escaped quotes
 * (""), and newlines inside quoted values. Returns rows keyed by header name.
 */
function parseCsvWithHeader(content: string): ParsedCsv {
    const records: string[][] = [];
    let field = '';
    let record: string[] = [];
    let inQuotes = false;

    const firstCharacter = content.charCodeAt(0) === 0xFEFF ? 1 : 0;
    for (let i = firstCharacter; i < content.length; i++) {
        const char = content[i];

        if (inQuotes) {
            if (char === '"') {
                if (content[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            record.push(field);
            field = '';
        } else if (char === '\n' || char === '\r') {
            // Handle CRLF by skipping the paired \n.
            if (char === '\r' && content[i + 1] === '\n') {
                i++;
            }
            record.push(field);
            field = '';
            if (record.some((value) => value.length > 0) || record.length > 1) {
                records.push(record);
            }
            record = [];
        } else {
            field += char;
        }
    }

    if (inQuotes) {
        throw new Error('Unterminated quoted field at end of CSV input');
    }

    // Flush trailing field/record (file without trailing newline).
    if (field.length > 0 || record.length > 0) {
        record.push(field);
        if (record.some((value) => value.length > 0)) {
            records.push(record);
        }
    }

    if (records.length === 0) {
        return { header: [], rows: [] };
    }

    const [header, ...rows] = records;
    return {
        header,
        rows: rows.map((row) => {
            const entry: Record<string, string> = {};
            header.forEach((key, index) => {
                entry[key] = row[index] ?? '';
            });
            return entry;
        }),
    };
}

export function parseCsv(content: string): Record<string, string>[] {
    return parseCsvWithHeader(content).rows;
}

/** Parse the games seed CSV into typed rows. */
export function parseGamesCsv(content: string): GameCsvRow[] {
    const { header, rows } = parseCsvWithHeader(content);
    const missingHeaders = REQUIRED_GAME_CSV_HEADERS.filter((requiredHeader) =>
        !header.includes(requiredHeader),
    );
    if (missingHeaders.length > 0) {
        const noun = missingHeaders.length === 1 ? 'header' : 'headers';
        throw new Error(
            `Invalid games CSV: missing required ${noun}: ${missingHeaders.join(', ')}. ` +
                `Required headers are: ${REQUIRED_GAME_CSV_HEADERS.join(', ')}.`,
        );
    }

    return rows
        .filter((row) => (row.Title ?? '').trim().length > 0)
        .map((row) => ({
            title: row.Title.trim(),
            category: row.Category.trim(),
            publisher: row.Publisher.trim(),
            description: row.Description.trim(),
        }));
}

export function categoryDescription(name: string): string {
    return `Collection of ${name} games available for crowdfunding`;
}

export function publisherDescription(name: string): string {
    return `${name} is a game publisher seeking funding for exciting new titles`;
}

export function gameDescription(rawDescription: string): string {
    return rawDescription + CROWDFUNDING_BLURB;
}

/** Distinct category names in first-seen order. */
export function uniqueCategories(rows: GameCsvRow[]): string[] {
    return [...new Set(rows.map((row) => row.category))];
}

/** Distinct publisher names in first-seen order. */
export function uniquePublishers(rows: GameCsvRow[]): string[] {
    return [...new Set(rows.map((row) => row.publisher))];
}

/**
 * Deterministically derive a star rating in [3.0, 5.0] (one decimal place)
 * from the game title. Using a stable hash instead of Math.random keeps
 * static builds reproducible.
 */
export function ratingFromTitle(title: string): number {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
    }
    // 21 buckets -> 3.0, 3.1, ... 5.0
    const tenths = hash % 21;
    return Math.round((3.0 + tenths / 10) * 10) / 10;
}
