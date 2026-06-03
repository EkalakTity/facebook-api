import { Target, NewTarget } from '../../types/target.types';
export declare const targetRepo: {
    create(data: NewTarget): Target;
    getById(id: number): Target | null;
    getAll(): Target[];
    findByUrl(url: string): Target | null;
};
