// No-op stubs: revalidatePath / revalidateTag require Next.js request context
module.exports = {
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn) => fn,
  unstable_noStore: () => {},
};
