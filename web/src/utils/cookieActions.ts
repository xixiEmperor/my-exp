export async function readCookie<T>(key: string): Promise<T> {
	try {
		const cookie = await cookieStore.get(key)
		
		if (cookie === undefined) {
			throw new Error
		}

		return JSON.parse(decodeURIComponent(cookie?.value!))
	} catch (error) {
		console.error(error)
		throw error
	}
}