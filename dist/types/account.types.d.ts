export interface Account {
    id: number;
    platform: string;
    account_name: string;
    profile_path: string | null;
    cookie_path: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}
