import { Account } from '../../types/account.types';
export declare const accountRepo: {
    findByProfilePath(profilePath: string): Account | null;
    create(profilePath: string, name?: string): Account;
    findOrCreate(profilePath: string): Account;
    getById(id: number): Account | null;
};
