'use strict';
/*
 * server.js —— 储能产业链资本运作看板（云端版）
 * 无第三方依赖，Node.js 20+；供 Render / 任意 Node 主机使用。
 * 提供：GET /            看板页面
 *       GET /api/news?days=2|3  新闻 JSON（后台抓取 + 内存缓存 + 内置兜底）
 *       GET /api/health  健康检查
 *
 * 数据源：Google News RSS 中文频道。抓取失败时回退到 fallback/news_d{n}.json，
 * 页面会显示“缓存数据”，不会出现空白或编造内容。
 */

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8787);
const HOST = '0.0.0.0';
const PAGE_FILE = path.join(ROOT, 'index.html');
const EMBEDDED = {"ok":true,"fetchedAt":"2026-11-02 19:48:04","window":"近72小时","rawCount":365,"count":26,"counts":{"jv":5,"fund":2,"risk":2,"ipo":8,"mna":9},"items":[{"title":"易主仅两月，16年储能龙头破产！","link":"https://news.google.com/rss/articles/CBMiY0FVX3lxTE5Yc0MtZE1VSi03Mk5jSW1LMGN4OE5KYU5ZdjFfbVJHSy1ZeWQyV1NKQzV1aWw5ZHZYU1dubWNVSGFNVENhWERIUklDYldmc0FNLVJ6d1ljT2ExZGQyVjJta04tYw?oc=5","source":"海融网","pubDate":"2026-11-02 16:47","date":"2026-11-02","ts":639292348200000000,"cat":"risk","query":"acq2"},{"title":"远信储能开启招股：拟募资6亿 11月9日上市 鼎晖是基石","link":"https://news.google.com/rss/articles/CBMiiAFBVV95cUxQdlQ4TTUzZ2V1bWZNUEhIRUR2YTJ1cnQ3RllKbzFOamo1cGxUMWF4bHVfSmlLaHdjcXpUWEkxbWltNnRzb1RQb3N6cGptQzRVYUlna1MyNEJhQmdBbnBSY3BwZEJHdFQwY1RjVVBqV3NxSnVSOW9aVklUOGpwcXBITE1nUkxPb3J2?oc=5","source":"搜狐网","pubDate":"2026-11-02 16:18","date":"2026-11-02","ts":639292331200000000,"cat":"ipo","query":"jv2"},{"title":"全球第二跟踪支架企业控股权拟易主，天合光能为何放手？","link":"https://news.google.com/rss/articles/CBMiZEFVX3lxTE1JOG54dG5yVm1WYkpwUFhlOWJOaDdZMnpiZFlJVk5PRjBqUzRzN2lnX3huM0RiWEpPc3pnZjJVeTV1bERLVzMtNzQtejVOak5ER3NJdzZrOHY2UmFwcHpkRVpsMnU?oc=5","source":"新京报","pubDate":"2026-11-02 15:29","date":"2026-11-02","ts":639292301400000000,"cat":"mna","query":"acq2"},{"title":"小米17亿元增资欣旺达动力，持股5.34%","link":"https://news.google.com/rss/articles/CBMicEFVX3lxTE82ZFBTVjl0WXZsTmM2YVRhTjcyaDdULW9wTkJpN3BHN3J4dktLR1JwQ3ZjeDVMRUt5Nm9qMTFWWmw4UkRxT09CT0FRN1JKdWI0X3o1S1JHVjVtN1FiZjAyS21IUE1XUFJtcW1PX0FWWXQ?oc=5","source":"新浪网","pubDate":"2026-11-02 12:33","date":"2026-11-02","ts":639292196390000000,"cat":"jv","query":"inv"},{"title":"半导体、AI芯片、储能扎堆港股：新一轮IPO潮在释放什么信号？","link":"https://news.google.com/rss/articles/CBMiXkFVX3lxTE5MY21aMjBfSXhsRXEtM1RNTkFyQXFjSzRHMEZyQktOQ2Vmd3pSNWQ1MHFNZktFX2dTUDdWTFR6RFF4eXlKTjFmcHlFTmxxbFlmbWZ6UUY2RFNkMnFqYkE?oc=5","source":"证券之星","pubDate":"2026-11-02 12:13","date":"2026-11-02","ts":639292184210000000,"cat":"ipo","query":"ipo"},{"title":"山东储能企业股权整合 山东发展新能源集团持股升至79%注册资本1.92亿元","link":"https://news.google.com/rss/articles/CBMiT0FVX3lxTFBzUEhIMGowa2lLM2xwX254cG10cFhGckdjLUI3ZFp1aWI1Uy1HdUpDVkdyU2lvRG1meFVMeHNUUTYycEowbFY5STE4anZIaDQ?oc=5","source":"https://www.gessey.com/","pubDate":"2026-11-02 11:54","date":"2026-11-02","ts":639292172400000000,"cat":"mna","query":"jv2"},{"title":"10亿元储能基金落地 中集集团参与发起设立新型储能产业基金","link":"https://news.google.com/rss/articles/CBMiT0FVX3lxTFBhdXF0WW9xZ2VCaHdFeHFnd2pRNnZmd1FpcThCeklYNGZwU0s1NWt5RmhodzJ6aFJacTBkTG5rYUxEVk43eVU3YUlaWWlibEk?oc=5","source":"www.gessey.com","pubDate":"2026-11-02 11:52","date":"2026-11-02","ts":639292171200000000,"cat":"fund","query":"fund"},{"title":"智光电气完成支付8.44亿元收购款 智光储能持股比例将升至94.82%","link":"https://news.google.com/rss/articles/CBMiZkFVX3lxTFAtZWtCRnE0SDNDUUxLTTFjZDJvS0xaR0RYWEVVdC12dGZnVV9oZk94d3FaejdaZlBHOUltTi1veUVYZEVSN1o3S09IeVJZck1ncTVtSnduX1NMS1ZLWlNfMU9GYlpkUQ?oc=5","source":"金融界","pubDate":"2026-11-02 11:47","date":"2026-11-02","ts":639292168510000000,"cat":"mna","query":"acq2"},{"title":"山东发展新能源集团拿下单州新型储能科技79%股权，人事同步调整！","link":"https://news.google.com/rss/articles/CBMiggFBVV95cUxNek50dFQ1WlNkSkdkOVpuV2xmYUdoMEc0M2FLaGpPdEJEaFNsUFAwdEdBcDBnX0Q4ZlBvUTNrcVNlVXRhSjAzVno4Mmd2MFZCc3B6YUNORllESmo1clZEdHVZVkI0dXoweWc2TFFXdVFFeVIxS1k2WGlpbHpYdnJRSzhR?oc=5","source":"手机新浪网","pubDate":"2026-11-01 17:50","date":"2026-11-01","ts":639291522000000000,"cat":"mna","query":"jv2"},{"title":"港股IPO周报：东山精密H股挂牌首周累跌约一成 远信储能等多家公司开启招股","link":"https://news.google.com/rss/articles/CBMiSEFVX3lxTE1GZ1RfQTFMMkNBeW1sQ0IxYzA2NXlZa2szOWtEU0xDVWVLajhYS19NMEtONnZfS3IwT3FPVE56NjRoZk05aDZteA?oc=5","source":"财联社","pubDate":"2026-11-01 13:53","date":"2026-11-01","ts":639291379800000000,"cat":"ipo","query":"ipo"},{"title":"德国储能先驱Sonnen破产：硬件制造失去竞争力后，15万客户还有多少价值？","link":"https://news.google.com/rss/articles/CBMijwFBVV95cUxNanB1Tk5qYnJhRU1kN20yTXo3TUl1SzZpQmNEclpTTzZyVGwwM1lXNlkwUW5ZQUFYWG9rMGZVRW5VeGhTOUxBcjBoR2o0SmpVS3lmREtncVBMWDNQQzhGdXJXVmVVMU1JX3dIMHY3VkloS29DcFdDQ052Z2ttTTdZV3lxajJUR0MxVXREeHltcw?oc=5","source":"搜狐网","pubDate":"2026-11-01 10:46","date":"2026-11-01","ts":639291267900000000,"cat":"risk","query":"acq"},{"title":"欣旺达终止港股上市，动力子公司控制权拱手让人，与车企绑定更深","link":"https://news.google.com/rss/articles/CBMi5gFBVV95cUxPS1pNSWM1bVpTeXh0VUF1Zzd0OUI3aUFLX1RFSWxVdGJVeUFDQU43cjlwSjNHM3Z0ZWJEaDI4RkI0cDl3aE03NU1wb3BzZVFOQ2tWYTNPQ0syc05QNzNCQjRmZDZWdk81VG04Z0c0V3h3SmtLR3VERHlzTlFadW1JNmxfT3VKLXZhRXBuTHJ3SHhWd3Z2b0NOQl9zWjFZWXJjY2J1RHFlSUViY2psOWlPRzQzWXFIandBX25iNFRmSktMQ3hlOWpaYU9lN3VxSTBTXzh6SjhnUjUxUFo0RWVKSjBXX0JPUQ?oc=5","source":"手机新浪网","pubDate":"2026-10-31 18:36","date":"2026-10-31","ts":639290685600000000,"cat":"ipo","query":"jv2"},{"title":"总装机18.96GW！三峡出资25.2亿，开发南疆新能源基地","link":"https://news.google.com/rss/articles/CBMiVEFVX3lxTFBzZVNBVzZfMmZWWHdQSHJTS1dOdGpWWWVlZGMzNkdkWHNKRVV4ekJmVktNQ082dEZBZE9WWnJ2VmZVUTI0d0ZiQVhmOTJZcHZPWnJ3ZA?oc=5","source":"世纪新能源网","pubDate":"2026-10-31 15:00","date":"2026-10-31","ts":639290556000000000,"cat":"jv","query":"jv"},{"title":"以色列Econergy收购英国四个电池储能系统项目","link":"https://news.google.com/rss/articles/CBMiWEFVX3lxTE1EU2I2c1dMVlBJRFIwQkhuMUVYNjFXTUh4ak1MSWptM0JxOUJ0bHUyZ0gzNUNIQkRvNG1kWFpYaDNvUzh5RTB4UlVIbHRjcjBZaFR4b2dmTk4?oc=5","source":"维度网","pubDate":"2026-10-31 14:43","date":"2026-10-31","ts":639290545800000000,"cat":"mna","query":"acq2"},{"title":"深南电A筹划重大资产重组：拟现金收购天合开拓者光伏支架公司51%-70%股权，布局光伏赛道打造第二增长曲线","link":"https://news.google.com/rss/articles/CBMiZkFVX3lxTE80M3czSWUwc3ZfTTh3TlhMb1ZtU2ozQUEySk4yTkJyMklmaHBQLXJDNjJxUGxON2NacnpsUkR5am03am5WZzNGZ3BjVkxnMnVXalIzbVg0T3VNRUZvd3F4a1JWME1NZw?oc=5","source":"东方财富","pubDate":"2026-10-31 12:54","date":"2026-10-31","ts":639290480520000000,"cat":"mna","query":"acq2"},{"title":"易储数智6.75亿储能机构间REITs获受理：锚定三年上市目标的资本化落子","link":"https://news.google.com/rss/articles/CBMiVkFVX3lxTE5EODZBT292V0lXX1l6WktPemdDMHFLc1hMT25Da2hORnozZThQc0JuU19mOUJwZlJFeTlOZDY1WEFoN2N1NUFILXRzeDRKdEFkMUFRVldB?oc=5","source":"文轩新闻","pubDate":"2026-10-31 11:46","date":"2026-10-31","ts":639290440080000000,"cat":"ipo","query":"fund"},{"title":"思格新能源IPO：满身争议下的资本豪赌，为何难获市场信赖？","link":"https://news.google.com/rss/articles/CBMiUkFVX3lxTE1KOE8xV0ZLM09ZZ3VoSVJVWkphYnc1enMzNER6SkZkakFMWVg2MVF4dlExT0h6S3dqQWZqM0s3UEdkN1ZTOWZ2Q2xxTjU5ZkpPYVE?oc=5","source":"文轩新闻","pubDate":"2026-10-31 10:43","date":"2026-10-31","ts":639290402080000000,"cat":"ipo","query":"jv2"},{"title":"深南电A“跨界”并购天合光能“全球第二”资产，双方能否实现各取所需？","link":"https://news.google.com/rss/articles/CBMiVkFVX3lxTE1kOVlPQmQ0bW1FbERKazZkOGlGbFdyeFlOTldUUzBjU1NDbTlsd3JkZUhRMlBNZVhnM19BdmhkTjFlaUg0Vm41Wl9vRUE1YzBERFgwTWVB?oc=5","source":"Jiemian.com","pubDate":"2026-10-31 04:44","date":"2026-10-31","ts":639290186400000000,"cat":"mna","query":"acq"},{"title":"三峡能源(600905):中国三峡新能源（集团）股份有限公司关于设立三峡（新疆）能源投资有限公司暨关联交易","link":"https://news.google.com/rss/articles/CBMiVkFVX3lxTE0zUGYxb3hxazhiWDcyQnhWX2ZTcEpiYk42TjRYZ2Z3eENQelhmRFNNQmlvYVhSaktGd0hhbzE0NFZtRHZ0eFRwekYyMjVEUlVzdVZFUnV3?oc=5","source":"中财网","pubDate":"2026-10-30 23:57","date":"2026-10-30","ts":639290014490000000,"cat":"jv","query":"jv"},{"title":"六家新股同步招股！覆盖半导体、储能、医药、中药，港股 11 月新股清单来了","link":"https://news.google.com/rss/articles/CBMigwFBVV95cUxOZ0JXdEcwZTFBYl9kejBGcnlPQ0VLN0h5ZllZSmxnQXBENGhBVlZuTFBWV2xsRkg2ZTMwZ0dZa2ZFRk5tQzJIay1Ta0xQV1pncGdCWDBBVzliOEp2Qk5YVGtCWF9VTFJCT3RJdTVEZUV6N1V4NE5iTV9TbzZzUnFMa2RuYw?oc=5","source":"手机新浪网","pubDate":"2026-10-30 23:32","date":"2026-10-30","ts":639289999200000000,"cat":"ipo","query":"ipo"},{"title":"小米出资17亿元入股欣旺达：仅次于理想成第三大股东","link":"https://news.google.com/rss/articles/CBMiU0FVX3lxTFBpcUM3VHdQTnZVLXNVVGF5VnEtdmVwNFROZ1dINzBTMW1WNUpuTnBTdHNsWnFicEl2TkVVUzA0cmJlUkFkVXpET2otR1YwUlNoUGR3?oc=5","source":"搜狐网","pubDate":"2026-10-30 23:09","date":"2026-10-30","ts":639289985400000000,"cat":"jv","query":"inv"},{"title":"远信储能今起招股，引入鼎晖投资为基石，有望成为“储能资产化运营第一股”","link":"https://news.google.com/rss/articles/CBMijAFBVV95cUxQa1IxOXVyTmhOWGNJZWw1UWE4VEF5NG1HNmRoUWVkYkdfbF9GNk9OWldSdURlQzB6VmpzaUVPbk1QODJTeG05NDEtbEJSeUpURlN3WnRMNFJxRnZDSldPYjBqRGRkdVVUVDhrT1pPZlp6VnNuaTBaMzdGOWNKaFhZZnpFOXhfZkExVjYtcQ?oc=5","source":"搜狐网","pubDate":"2026-10-30 21:40","date":"2026-10-30","ts":639289932160000000,"cat":"ipo","query":"jv2"},{"title":"欣旺达：子公司欣旺达动力获小米17亿元增资并“出表”，第三季度净利润同比下滑98%","link":"https://news.google.com/rss/articles/CBMiYkFVX3lxTE9qZjk1QlJmY2VvX19pZm9QSE1JWnlYbWVOVTkzVzdfNGE0YVJyWGpEcHU1eDFZRk45cHNOcGhkYk12VkpwdFk3bGpPeld0SElzeGlpSlFlZ3JtLU5SbXp5UUlR?oc=5","source":"证券之星","pubDate":"2026-10-30 21:19","date":"2026-10-30","ts":639289919780000000,"cat":"jv","query":"inv"},{"title":"天能动力(00819.HK)附属天能新材料拟1.503亿元收购安徽鑫钠50.10%股权","link":"https://news.google.com/rss/articles/CBMiakFVX3lxTE12MFo2ZUhucXlVRXlFRURSWE5GcWpSdlpVQlZYdWFDSjBJaGZycUh2SnVVWjZ3R29tbVZtVHdIV2l4Y1lkNm9YeUZtaldJUXVvXzZhX2FucUFHMW1OWWlHYTZzYWJLSi1tMWc?oc=5","source":"TradingView","pubDate":"2026-10-30 21:08","date":"2026-10-30","ts":639289912880000000,"cat":"mna","query":"acq2"},{"title":"跨界光伏！深南电A拟收购天合跟踪控股权，预计构成重大资产重组","link":"https://news.google.com/rss/articles/CBMiZkFVX3lxTE9OdUJ2OFgwQ29oYnFPWllpMTJ5SDBSeF9JM09HWExoQng0NjR6aUxmU0pqaGltSDBUWDVOakdDcGJFRWNvYUJLOFZacGR1WEVudUtaZjY4cGpKTkpSY2FQWjNrMmtaQQ?oc=5","source":"https://www.mrjjxw.com/","pubDate":"2026-10-30 20:30","date":"2026-10-30","ts":639289890210000000,"cat":"mna","query":"acq2"},{"title":"中集集团(02039.HK)拟出资2.9883亿元与专业机构合作设立基金 加码储能产业链布局-证券之星","link":"https://news.google.com/rss/articles/CBMiXkFVX3lxTE5MQ1k2ak9DcnpPdGxWWE1MdVVKMkdGM2ZKSXpMc2lQdFp0dkV0Q0dRcXVpR1hpd3l2dUZlbnFFZW5acTdqWlRqcE9MS0VpdjZiQ1NQa2JRTnhTWlpYT1E?oc=5","source":"证券之星","pubDate":"2026-10-30 19:50","date":"2026-10-30","ts":639289866170000000,"cat":"fund","query":"fund"}]};
const FALLBACK_DIR = path.join(ROOT, 'fallback');
const CACHE_MS = 10 * 60 * 1000;       // 上游结果缓存 10 分钟
const FETCH_TIMEOUT_MS = 8000;         // 单个检索式超时
const FETCH_GAP_MS = 120;              // 检索式之间的轻微节流
const MAX_REFRESH_WAIT_MS = 18000;     // 手动刷新时最多等待 18 秒
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const QUERIES = [
  ['acq', '储能 并购'],
  ['acq2', '储能 收购'],
  ['fund', '储能 基金'],
  ['fund2', '储能 私募 基金'],
  ['fund3', '新型储能 基金 设立'],
  ['jv', '储能 合资公司'],
  ['jv2', '储能 成立 公司'],
  ['inv', '储能 增资 股权'],
  ['inv2', '储能 战略投资 融资'],
  ['inv3', '储能 股权投资'],
  ['inv4', '储能 参股'],
  ['restruct', '储能 重组 定增'],
  ['battery', '锂电 并购'],
  ['battery2', '电池 收购'],
  ['acq3', '储能 股权转让'],
  ['acq4', '储能 电站 转让 出售'],
  ['acq5', '储能 收购 公告'],
  ['fund4', '储能 基金 成立 落地'],
  ['ipo', '储能 IPO 招股'],
  ['inv5', '储能 定增 募资'],
  ['inv6', '储能 融资 亿元'],
  ['ma2', '宁德时代 收购'],
  ['ma3', '光储 并购 收购'],
  ['ma4', '储能 重组 借壳 上市'],
  ['ma5', '储能 项目公司 股权']
].map(([id, t]) => ({ id, t }));

const RE_DOMAIN = /储能|电池|锂电|钠电|钠离子|电芯|光储|逆变器|PCS|充电桩|换电|正极|负极|电解液|隔膜|硬碳|炭材料|新能源|光伏|风电|虚拟电厂/;
const RE_COMPANY = /宁德时代|比亚迪|亿纬|国轩|中创新航|欣旺达|海辰|鹏辉|南都电源|派能|沃太|艾罗|德业|锦浪|固德威|科华|上能电气|盛弘|禾望|英维克|申菱|同飞|高澜|阳光电源|天合光能|阿特斯|晶科|隆基|通威|协鑫|天能|超威|南孚|珠海冠宇|力神|瑞浦|兰钧|蜂巢|远景|双一力|精控|许继|平高|四方|南网科技/;
const RE_CAPITAL = /并购|收购|基金|合资|增资|入股|参股|股权|定增|重组|重整|融资|IPO|招股|上市|REITs|出资|转让|受让|易主|募资|战投|战略投资|设立|募集|估值|破产|出清|停产|清算|停牌/;
const RE_NOISE = /ETF|份额|盘中|涨停|跌停|股价|行情|评级|研报|股吧|期货|指数|招聘|招标|中标|持仓|重仓|成交额|换手|估值锚点|月销|销量|锁单|SUV|早参|晚报|速览|盘点|直播|风电场|涨\d|跌\d/;
const RE_NONWORD = /[^\u4e00-\u9fa5A-Za-z0-9]/g;

const caches = new Map();        // days -> { payload, at }
const refreshes = new Map();     // days -> Promise
let lastAttemptAt = 0;
let lastError = '';
const startedAt = Date.now();

/* ---------------- 工具函数 ---------------- */

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function pad(n) { return String(n).padStart(2, '0'); }

/** 北京时间（UTC+8）格式化 */
function cnParts(ts) {
  const d = new Date(ts + 8 * 3600 * 1000);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    full: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  };
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\s*\[CDATA\[([\s\S]*?)\]\]>/g, (_, inner) => inner)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function tagText(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decodeEntities(m[1]).trim() : '';
}

function httpGet(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    }, res => {
      const code = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(code) && res.headers.location && redirects < 3) {
        res.resume();
        resolve(httpGet(new URL(res.headers.location, url).toString(), redirects + 1));
        return;
      }
      if (code !== 200) {
        res.resume();
        reject(new Error('HTTP ' + code));
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', d => { body += d; });
      res.on('end', () => resolve(body));
    });
    req.setTimeout(FETCH_TIMEOUT_MS, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

/* ---------------- 抓取与筛选（与 PowerShell 版口径一致） ---------------- */

function parseRss(xml, queryId) {
  const out = [];
  const items = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
  for (const block of items) {
    const title = tagText(block, 'title');
    if (!title) continue;
    let source = '';
    const sm = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    if (sm) source = decodeEntities(sm[1]).trim();
    const link = tagText(block, 'link');
    const pubDate = tagText(block, 'pubDate');
    out.push({ title, link, source, pubDate, query: queryId });
  }
  return out;
}

async function fetchAll(days) {
  const raw = [];
  const t0 = Date.now();
  for (const q of QUERIES) {
    if (Date.now() - t0 > 150000) break;        // 整体上限，避免一次刷新无限拖长
    const qs = encodeURIComponent(`${q.t} when:${days}d`);
    const url = `https://news.google.com/rss/search?q=${qs}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
    let xml = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        xml = await httpGet(url);
        break;
      } catch (e) {
        const isTimeout = /timeout/i.test(e.message);
        if (attempt === 2 || isTimeout) {
          console.warn(`[fetch] ${q.id} failed: ${e.message}`);
          break;
        }
        await sleep(900);
      }
    }
    if (xml) {
      try {
        raw.push(...parseRss(xml, q.id));
      } catch (e) {
        console.warn(`[parse] ${q.id} failed: ${e.message}`);
      }
    }
    await sleep(FETCH_GAP_MS);
  }
  return raw;
}

function classify(text) {
  if (/基金|私募|认缴|LP|合伙企业/.test(text)) return 'fund';
  if (/IPO|招股|上市|REITs|定增|募资|递表|聆讯|资产证券化|首次公开发行/.test(text)) return 'ipo';
  if (/破产|停产|暴雷|退出|清算|重整/.test(text)) return 'risk';
  if (/收购|并购|受让|股权转让|易主|拿下.{0,16}股权|持股.{0,8}(升至|至).{0,6}%|出售|剥离|要约|取得.{0,10}控制权/.test(text)) return 'mna';
  if (/合资|成立|设立|新设|增资|入股|参股|出资|战投|战略投资|联手|合作|投资有限公司/.test(text)) return 'jv';
  return 'other';
}

function bigrams(text) {
  const s = text.replace(RE_NONWORD, '');
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

function selectItems(raw, days) {
  const from = Date.now() - days * 24 * 3600 * 1000;
  const seen = new Set();
  const seenTxt = [];
  const rows = [];
  for (const it of raw) {
    const title = String(it.title || '');
    if (RE_NOISE.test(title)) continue;
    if (!RE_DOMAIN.test(title) && !RE_COMPANY.test(title)) continue;
    if (!RE_CAPITAL.test(title)) continue;
    const ms = Date.parse(it.pubDate);
    if (!Number.isFinite(ms) || ms < from) continue;

    let clean = title
      .replace(/\s*[-|–]\s*[^-|–]{1,24}$/, '')
      .replace(/_[\u4e00-\u9fa5A-Za-z0-9]{2,12}(_[\u4e00-\u9fa5A-Za-z0-9]{2,12})*$/, '')
      .trim();
    if (!clean) clean = title;

    const key = clean.replace(RE_NONWORD, '').slice(0, 40);
    if (seen.has(key)) continue;

    // 近似重复：较短标题二元组被另一条覆盖 >= 72%，视为同一事件
    const bg = bigrams(clean);
    let dup = false;
    for (const s of seenTxt) {
      if (Math.abs(s.len - clean.length) > 25) continue;
      let inter = 0;
      for (const k of bg) if (s.bg.has(k)) inter++;
      const base = Math.min(bg.size, s.bg.size);
      if (base > 0 && inter / base >= 0.72) { dup = true; break; }
    }
    if (dup) continue;

    seen.add(key);
    seenTxt.push({ len: clean.length, bg });
    rows.push({
      title: clean,
      link: it.link,
      source: it.source,
      pubDate: `${cnParts(ms).date} ${cnParts(ms).time}`,
      date: cnParts(ms).date,
      ts: ms,
      cat: classify(clean),
      query: it.query
    });
  }
  rows.sort((a, b) => b.ts - a.ts);
  return rows;
}

/* ---------------- 缓存与刷新 ---------------- */

function loadFallback(days) {
  const file = path.join(FALLBACK_DIR, `news_d${days}.json`);
  try {
    if (fs.existsSync(file)) {
      const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (obj && Array.isArray(obj.items) && obj.items.length) {
        const at = Date.parse(String(obj.fetchedAt || '').replace(' ', 'T') + '+08:00');
        return { payload: obj, at: Number.isFinite(at) ? at : fs.statSync(file).mtimeMs };
      }
    }
  } catch (e) {
    console.warn(`[fallback] days=${days} load failed: ${e.message}`);
  }
  const at = Date.parse(String(EMBEDDED.fetchedAt || '').replace(' ', 'T') + '+08:00');
  return { payload: EMBEDDED, at: Number.isFinite(at) ? at : Date.now() };
}

function getCache(days) {
  if (caches.has(days)) return caches.get(days);
  const fb = loadFallback(days);
  if (fb) {
    caches.set(days, fb);
    console.log(`[fallback] days=${days} loaded: ${fb.payload.count} items (${fb.payload.fetchedAt})`);
    return fb;
  }
  return null;
}

function ensureRefresh(days) {
  if (refreshes.has(days)) return refreshes.get(days);
  const p = runRefresh(days)
    .catch(e => { lastError = e.message; console.warn(`[refresh] days=${days} failed: ${e.message}`); })
    .finally(() => refreshes.delete(days));
  refreshes.set(days, p);
  return p;
}

async function runRefresh(days) {
  lastAttemptAt = Date.now();
  const raw = await fetchAll(days);
  const items = selectItems(raw, days);
  if (!items.length) {
    lastError = `上游返回 ${raw.length} 条，过滤后为 0`;
    console.warn(`[refresh] days=${days} ${lastError}；保留上一次结果`);
    return;
  }
  const counts = {};
  for (const i of items) counts[i.cat] = (counts[i.cat] || 0) + 1;
  const payload = {
    ok: true,
    fetchedAt: cnParts(Date.now()).full,
    window: `近${days}天`,
    rawCount: raw.length,
    count: items.length,
    counts,
    items
  };
  caches.set(days, { payload, at: Date.now() });
  lastError = '';
  console.log(`[refresh] days=${days} ok: ${items.length} items / raw ${raw.length}`);
}

/* ---------------- HTTP 服务 ---------------- */

let pageBuffer = null;
try {
  pageBuffer = fs.readFileSync(PAGE_FILE);
} catch (e) {
  console.error(`[startup] 看板页面读取失败：${e.message}`);
}

const JSON_HEAD = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*'
};
const HTML_HEAD = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-cache',
  'Access-Control-Allow-Origin': '*'
};

function sendJson(res, code, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(code, Object.assign({}, JSON_HEAD, { 'Content-Length': body.length }));
  res.end(body);
}

function clampDays(v) {
  const n = Number(v);
  return n === 2 ? 2 : 3;
}

async function handleNews(url, res) {
  const days = clampDays(url.searchParams.get('days'));
  const force = url.searchParams.get('refresh') === '1';

  let cache = getCache(days);
  const stale = !cache || (Date.now() - cache.at) > CACHE_MS;

  if (force) {
    await Promise.race([ensureRefresh(days), sleep(MAX_REFRESH_WAIT_MS)]);
    cache = getCache(days);
  } else if (stale && !refreshes.has(days) && Date.now() - lastAttemptAt > 3 * 60 * 1000) {
    ensureRefresh(days);        // 后台刷新，立即返回当前缓存
  }

  if (!cache) {
    sendJson(res, 200, { ok: false, loading: true, error: lastError || '数据准备中', items: [], count: 0, counts: {}, rawCount: 0 });
    return;
  }
  const body = Object.assign({}, cache.payload, { refreshing: refreshes.has(days) || undefined });
  sendJson(res, 200, body);
}

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    res.writeHead(400); res.end('bad request'); return;
  }
  if (req.method === 'HEAD') req.method = 'GET';

  if (url.pathname === '/api/news') { handleNews(url, res).catch(e => sendJson(res, 500, { ok: false, error: e.message })); return; }

  if (url.pathname === '/api/health') {
    const c = getCache(3);
    sendJson(res, 200, {
      ok: true,
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      cache: c ? { fetchedAt: c.payload.fetchedAt, count: c.payload.count, ageSec: Math.round((Date.now() - c.at) / 1000) } : null,
      refreshing: refreshes.size > 0,
      lastError: lastError || null
    });
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    if (!pageBuffer) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('page missing'); return; }
    res.writeHead(200, Object.assign({}, HTML_HEAD, { 'Content-Length': pageBuffer.length }));
    res.end(pageBuffer);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`ESS dashboard listening on http://${HOST}:${PORT}`);
    // 启动后在后台预热（不阻塞首个请求）
    for (const d of [3, 2]) {
      getCache(d);
      setTimeout(() => ensureRefresh(d), d === 3 ? 500 : 20000);
    }
  });
}

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });

module.exports = { parseRss, selectItems, classify, bigrams, decodeEntities, cnParts };
