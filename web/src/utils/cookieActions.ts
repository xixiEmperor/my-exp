export async function readCookie<T>(key: string): Promise<T> {
    const cookie = await cookieStore.get(key);

    if (!cookie?.value) {
        throw new Error(`Cookie "${key}" not found`);
    }

    return JSON.parse(decodeURIComponent(cookie?.value));
}
