"""Owner-supplied public article links, selected scope and safe rendering."""
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class ArticleLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.library = None
        self.category = None
        self.link = None
        self.links = []
        self.topics = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div' and 'data-wechat-library' in attrs:
            self.library = attrs['data-wechat-library']
        if tag == 'details' and 'data-wechat-topic' in attrs:
            self.category = attrs['data-wechat-topic']
            self.topics.append((self.library, self.category, 'open' in attrs))
        if tag == 'a' and self.library:
            self.link = dict(attrs, language=self.library, category=self.category, title='')

    def handle_data(self, data):
        if self.link is not None:
            self.link['title'] += data

    def handle_endtag(self, tag):
        if tag == 'a' and self.link is not None:
            self.links.append(self.link)
            self.link = None
        if tag == 'details':
            self.category = None
        if tag == 'div':
            self.library = None


class WeChatArticlesTests(unittest.TestCase):
    def setUp(self):
        self.source = json.loads((ROOT / 'reference/WECHAT-ARTICLE-LINKS.json').read_text())
        self.page = ArticleLinks()
        self.page.feed((ROOT / 'draft/insights.html').read_text())

    def test_all_selected_links_preserve_source_titles_and_destinations(self):
        expected = {(a['language'], a['category'], a['title'], a['url']) for a in self.source}
        actual = {(a['language'], a['category'], a['title'], a['href']) for a in self.page.links}
        self.assertEqual(len(actual), 40)
        self.assertEqual(actual, expected)
        self.assertEqual(Counter(a['language'] for a in self.source), {'en': 25, 'zh': 15})

    def test_links_are_public_article_identifiers_without_account_parameters(self):
        for link in self.page.links:
            with self.subTest(title=link['title']):
                url = urlsplit(link['href'])
                self.assertEqual((url.scheme, url.netloc, url.path), ('https', 'mp.weixin.qq.com', '/s'))
                self.assertEqual(set(parse_qs(url.query)), {'__biz', 'mid', 'idx', 'sn'})
                self.assertNotIn('&amp;', link['href'])
                self.assertEqual(link['target'], '_blank')
                self.assertEqual(set(link['rel'].split()), {'noopener', 'noreferrer'})
                self.assertEqual(link['lang'], 'zh-CN' if link['language'] == 'zh' else 'en')

    def test_excluded_topics_are_not_imported_and_adolescent_topics_remain(self):
        excluded = re.compile(r'pregnan|matern|newborn|neonat|breastfeed|breastmilk|mastitis|bottle|bcg|冻卵|母乳|孕期|孕产|新生儿|卡介苗', re.I)
        self.assertFalse(any(excluded.search(a['title']) for a in self.source))
        self.assertEqual(Counter(a['language'] for a in self.source if a['category'] == 'adolescent'), {'en': 2, 'zh': 2})

    def test_topics_are_collapsed_in_both_languages(self):
        expected = ['menopause', 'women', 'fertility', 'adolescent', 'prevention']
        for language in ('en', 'zh'):
            self.assertEqual([(topic, opened) for lang, topic, opened in self.page.topics if lang == language], [(topic, False) for topic in expected])


if __name__ == '__main__':
    unittest.main()
