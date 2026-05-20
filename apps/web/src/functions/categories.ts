/*export async function categories(
  posts: { category: string; active: boolean }[],
): Promise<{ name: string; count: number }[]> {
  
  // Step 1: Sort alphabetically by category name (all posts, including inactive)
  const sorted = posts.sort((a, b) => 
    a.category.localeCompare(b.category)
  );

  // Step 2: Count how many posts belong to each category
  return sorted.reduce(
    (acc, post) => {
      // Check if this category already exists in our accumulator
      const existing = acc.find((c) => c.name === post.category);
      
      if (existing) {
        // Category already exists — just increment the count
        existing.count++;
      } else {
        // New category — add it with count of 1
        acc.push({ name: post.category, count: 1 });
      }
      
      return acc;
    },
    [] as { name: string; count: number }[],
  );
}*/

export async function categories(
  posts: { category: string; active: boolean }[],
): Promise<{ name: string; count: number }[]> {
  // Get all unique category names (including from inactive posts)
  const allCategories = [...new Set(posts.map((p) => p.category))].sort();

  // Count only active posts per category
  return allCategories.map((category) => ({
    name: category,
    count: posts.filter((p) => p.category === category && p.active).length,
  }));
}