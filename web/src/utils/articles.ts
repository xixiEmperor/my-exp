export const subUrls = (markdown: string) => {
    const reg = /!\[[^\]]*\]\(([^)]+)\)/g;
    return [...markdown.matchAll(reg)].map((match) => match[1]);
};
