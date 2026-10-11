interface PostRecord {
  readonly id: string;
  readonly data: {
    readonly draft: boolean;
    readonly date: string;
    readonly updatedDate?: string;
  };
}

export function selectPublishedPosts<T extends PostRecord>(
  posts: readonly T[],
  now = new Date(),
): T[] {
  return posts
    .filter(
      ({ data }) =>
        data.draft === false &&
        Date.parse(`${data.date}T00:00:00Z`) <= now.getTime() &&
        (!data.updatedDate ||
          Date.parse(`${data.updatedDate}T00:00:00Z`) <= now.getTime()),
    )
    .sort(
      (a, b) =>
        b.data.date.localeCompare(a.data.date) || a.id.localeCompare(b.id),
    );
}
