import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    sortGames,
} from './games';
import type { Game } from '../types/game';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    describe('sortGames', () => {
        const gamesToSort: Game[] = [
            { id: 1, title: 'Beta', description: '', starRating: 3.5, category: null, publisher: null },
            { id: 2, title: 'Alpha', description: '', starRating: 4.8, category: null, publisher: null },
            { id: 3, title: 'Gamma', description: '', starRating: null, category: null, publisher: null },
        ];

        it.each([
            ['title-asc', ['Alpha', 'Beta', 'Gamma']],
            ['title-desc', ['Gamma', 'Beta', 'Alpha']],
            ['rating-desc', ['Alpha', 'Beta', 'Gamma']],
        ] as const)('sorts games by %s', (sort, expectedTitles) => {
            expect(sortGames(gamesToSort, sort).map((game) => game.title)).toEqual(expectedTitles);
        });

        it('does not mutate the original collection', () => {
            expect(sortGames(gamesToSort, 'title-desc')).not.toBe(gamesToSort);
            expect(gamesToSort.map((game) => game.title)).toEqual(['Beta', 'Alpha', 'Gamma']);
        });
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});
