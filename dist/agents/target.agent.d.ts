import { Target, TargetType } from '../types/target.types';
export declare function isFacebookUrl(url: string): boolean;
export declare function detectTargetType(url: string): TargetType;
export declare function selectTarget(accountId: number): Promise<Target>;
