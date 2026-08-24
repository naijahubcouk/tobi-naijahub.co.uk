// Disabled edge function — pass through to index.html
export default async (request, context) => {
  return context.next();
};
