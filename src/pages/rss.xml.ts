import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort((a,b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());
  return rss({
    title: 'ZeroMadLife — Agent Engineering Notes',
    description: '记录 SAGE、AI Agent 工程、后端系统与持续成长。',
    site: context.site!,
    items: posts.map((post) => ({ title: post.data.title, description: post.data.description, pubDate: post.data.publishDate, link: `/posts/${post.id}/` })),
  });
}
