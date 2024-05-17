import { type NextRequest } from "next/server";

const botRegex = /\b(Baidu|Bing|Googlebot|Yahoo|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|MSRBOT|Twitterbot|facebookexternalhit|ia_archiver|Applebot|TweetmemeBot|Twikle|PaperLiBot|Woko|Gowikibot|DotBot|ngborg|Yeti|Xaldon WebWatcher|Pingdom|Salesforce Web Preview|SuperBot|WhatsApp|Telegram|Discord|Mastodon|Pleroma|Pixelfed|PeerTube|Friendica|Hubzilla|Socialhome|Misskey|CalcKey|Akkoma|Writefree|Plume|GNUsocial|Quanta|Osada|Epicyon|Mastodon|Pleroma|Pixelfed|PeerTube|Friendica|Hubzilla|Socialhome|Misskey|CalcKey|Akkoma|Writefree|Plume|GNUsocial|Quanta|Osada|Epicyon)\b/i;

export const isUaBot = (req: NextRequest): boolean => {
    const ua = req.headers.get("User-Agent");
    return ua ? botRegex.test(ua) : false;
};