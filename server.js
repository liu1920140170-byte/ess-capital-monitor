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
const CACHE_MS = 30 * 60 * 1000;       // 上游结果缓存 30 分钟（页面每 30 分钟拉取一次）
const FETCH_TIMEOUT_MS = 8000;         // 单个检索式超时
const FETCH_GAP_MS = 120;              // 检索式之间的轻微节流
const MAX_REFRESH_WAIT_MS = 18000;     // 手动刷新时最多等待 18 秒
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const QUERIES = [
  // 资本运作
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
  ['ipo', '储能 IPO 招股'],
  ['inv5', '储能 定增 募资'],
  ['inv6', '储能 融资 亿元'],
  ['ma2', '宁德时代 收购'],
  ['ma3', '光储 并购 收购'],
  ['ma4', '储能 借壳 上市'],
  // 产业链（扩产 / 项目 / 订单）
  ['cap1', '储能 扩产'],
  ['cap2', '储能 产能 投产'],
  ['cap3', '储能 项目 开工'],
  ['cap4', '储能 中标 招标'],
  ['cap5', '储能 订单 供货'],
  ['cap6', '储能 电站 并网 投运'],
  ['cap7', '工商业储能 项目'],
  ['cap8', '独立储能 电站'],
  // 技术 / 产品
  ['tech1', '储能 技术 突破'],
  ['tech2', '钠离子电池 量产'],
  ['tech3', '固态电池 量产'],
  ['tech4', '液流电池 项目'],
  ['tech5', '长时储能 技术'],
  ['tech6', '逆变器 新品 发布'],
  ['tech7', '储能 电芯 新品'],
  // 政策 / 市场 / 出海
  ['pol1', '新型储能 政策'],
  ['pol2', '储能 电价 机制'],
  ['pol3', '储能 标准 规范'],
  ['mkt1', '储能 出海 海外订单'],
  ['mkt2', '储能 价格 涨价 降价'],
  ['mkt3', '储能 产能过剩 内卷'],
  ['mkt4', '储能 装机 需求'],
  // 出清 / 风险
  ['risk1', '储能 破产 停产'],
  ['risk2', '储能 事故 起火']
].map(([id, t]) => ({ id, t }));

// 微信公众号文章检索（搜狗微信搜索，无需登录；覆盖 Google News 不收录的公众号稿件）
const WX_QUERIES = [
  ['wx_acq', '储能 并购'],
  ['wx_fund', '储能 基金'],
  ['wx_coop', '储能 签约 合作'],
  ['wx_cap', '储能 扩产 投产'],
  ['wx_order', '储能 中标 订单'],
  ['wx_policy', '储能 政策 电价'],
  ['wx_solid', '固态电池 量产'],
  ['wx_na', '钠离子电池 储能'],
  ['wx_oversea', '储能 出海'],
  ['wx_price', '储能 价格 内卷'],
  ['wx_long', '长时储能 液流'],
  ['wx_sys', '储能系统 集成'],
  ['wx_pcs', '储能 PCS 逆变器'],
  ['wx_cell', '储能电芯 产能'],
  ['wx_ind', '工商业储能'],
  ['wx_mkt', '储能 装机 市场']
].map(([id, t]) => ({ id, t }));
const WX_TICK_MS = 40 * 1000;                   // 后台每 40 秒只发 1 个检索，避免触发搜狗风控
const WX_POOL_MAX = 300;                        // 公众号池上限
const WX_MAX_AGE_MS = 96 * 3600 * 1000;         // 池内保留 96 小时
const WX_BLOCK_BACKOFF_MS = 20 * 60 * 1000;     // 触发验证码后退避 20 分钟再试探
const WX_CACHE_FILE = path.join(ROOT, 'wx_cache.json');

const RE_CHAIN = /储能|新型储能|锂电|锂电池|锂离子|钠离子|钠电|固态电池|半固态|液流|钒电池|压缩空气|飞轮储能|氢储|电芯|电池包|PACK|BMS|EMS|PCS|变流器|逆变器|光储|光伏|风电|氢能|充电桩|超充|换电|虚拟电厂|微电网|源网荷储|电力现货|容量电价|正极|负极|电解液|隔膜|结构件|铜箔|铝箔|电池回收|梯次利用|热管理|温控|消防|储能电站|工商业储能|户用储能|独立储能|共享储能/;
// 直连快讯源（新浪/东财）标题长、泛词多，用更严格的产业链主干词收口，避免"消防/监管"等误命中
const RE_CORE = /储能|锂电|锂电池|锂离子|钠离子|钠电|固态电池|半固态|液流|钒电池|压缩空气|飞轮|氢储|电芯|电池|PACK|BMS|EMS|PCS|变流器|逆变器|光储|光伏|风电|氢能|超充|换电|虚拟电厂|微电网|源网荷储|电力现货|容量电价|正极|负极|电解液|隔膜|结构件|铜箔|铝箔|梯次利用|热管理|温控|储能电站|独立储能|共享储能/;
const RE_COMPANY = /宁德时代|比亚迪|亿纬|国轩|中创新航|欣旺达|海辰|鹏辉|南都电源|派能|沃太|艾罗|德业|锦浪|固德威|科华|上能电气|盛弘|禾望|英维克|申菱|同飞|高澜|阳光电源|天合光能|阿特斯|晶科|隆基|通威|协鑫|天能|超威|南孚|珠海冠宇|力神|瑞浦|兰钧|蜂巢|远景|双一力|精控|许继|平高|四方|南网科技|禾迈|正泰|思源|科陆|林洋|智光|中天科技|亨通|国电南瑞|特变电工|海博思创|双登|雄韬|中国电建|中国能建|三峡能源|中广核|晶澳|东方日升/;
const RE_NOISE = /ETF|份额|盘中|涨停|跌停|股价|行情|评级|研报|股吧|期货|指数|招聘|持仓|重仓|成交额|换手|估值锚点|月销|销量|锁单|SUV|早参|晚报|速览|盘点|直播|风电场|涨\d|跌\d|主力资金|净买入|净卖出|龙虎榜|融资余额|增仓|减仓|资金流向|资金净/;
// 强信号词：出现即为「值得细读」的编辑级稿件
const RE_HOT = /重磅|独家|首次|首个|突破|爆发|刷新|创纪录|里程碑|历史新高|全面|落地|开闸|规模最大|全球最大|国家级|千亿|百亿|多家|密集|超预期/;
// 标题金额换算成「亿元」，用于热度打分
function amountYi(title) {
  const t = String(title || '');
  let best = 0;
  const re = /(\d+(?:\.\d+)?)\s*(亿|万)(?:元|美元|港元)?/g;
  let m;
  while ((m = re.exec(t))) {
    const v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    const yi = m[2] === '亿' ? v : v / 10000;
    if (yi > best) best = yi;
  }
  return best;
}
const RE_NONWORD = /[^\u4e00-\u9fa5A-Za-z0-9]/g;

const caches = new Map();        // days -> { payload, at }
const refreshes = new Map();     // days -> Promise
let lastAttemptAt = 0;
let lastError = '';
let lastWechat = { ok: false, raw: 0, error: '', at: 0 };
let wxCache = { at: 0, raw: [] };
let wxInflight = null;
let idxCache = [];              // 指数行情兜底（上次成功值）
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

function httpGet(url, redirects = 0, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: Object.assign({
        'User-Agent': UA,
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }, extraHeaders)
    }, res => {
      const code = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(code) && res.headers.location && redirects < 3) {
        res.resume();
        // 搜狗常把跳转写成 http://，而这里用的是 https 模块，统一升级为 https
        const next = new URL(res.headers.location, url);
        if (next.protocol === 'http:') next.protocol = 'https:';
        resolve(httpGet(next.toString(), redirects + 1, extraHeaders));
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

/* ---------------- 指数行情（东财 push2，UTF-8 JSON） ---------------- */

const IDX_QUOTES = [
  { secid: '1.000001', name: '上证指数' },
  { secid: '0.399001', name: '深证成指' },
  { secid: '0.399006', name: '创业板指' }
];

async function fetchIndex() {
  const out = await Promise.all(IDX_QUOTES.map(async q => {
    try {
      const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${q.secid}&fields=f43,f57,f58,f60,f169,f170&invt=2&fltt=2`;
      const body = await httpGet(url);
      const d = JSON.parse(body);
      const it = d && d.data;
      if (!it || it.f43 === undefined || it.f43 === '-') return null;
      return {
        name: q.name,
        price: Number(it.f43),
        change: Number(it.f169),
        pct: Number(it.f170)
      };
    } catch (e) {
      return null;
    }
  }));
  return out.filter(Boolean);
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

/* ---------------- 直连源：新浪财经 7×24 + 东方财富快讯 ---------------- */

const stripTags = s => decodeEntities(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function buildHeadline(text) {
  const t = stripTags(text);
  const m = t.match(/^【([^】]{6,60})】/);
  if (m) return m[1].trim();
  const cut = t.split(/[。！？]/)[0];
  return (cut.length >= 8 ? cut : t).slice(0, 64);
}

const cnMs = s => {
  const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/);
  if (!m) return NaN;
  return Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}+08:00`);
};

async function fetchSinaZhibo(days) {
  const out = [];
  const cutoff = Date.now() - Math.min(days, 1.5) * 24 * 3600 * 1000;
  const maxPage = 8;
  for (let p = 1; p <= maxPage; p++) {
    const url = `https://zhibo.sina.com.cn/api/zhibo/feed?page=${p}&page_size=100&zhibo_id=152&tag_id=0&dire=f&dpc=1`;
    let txt;
    try { txt = await httpGet(url, 0, { 'User-Agent': UA }); } catch (e) { console.warn(`[sina] p${p} failed: ${e.message}`); break; }
    let data;
    try { data = JSON.parse(txt); } catch (e) { console.warn('[sina] bad json'); break; }
    const list = (data && data.result && data.result.data && data.result.data.feed && data.result.data.feed.list) || [];
    if (!list.length) break;
    let oldest = Infinity;
    for (const x of list) {
      const ts = cnMs(x.create_time);
      if (!Number.isFinite(ts)) continue;
      oldest = Math.min(oldest, ts);
      const text = stripTags(x.rich_text);
      if (text.length < 12) continue;
      out.push({ title: buildHeadline(text), link: x.docurl || '', source: '新浪财经', ts, via: 'sina', query: 'sina7x24' });
    }
    if (oldest < cutoff) break;
    await sleep(400);
  }
  return out;
}

/* 北极星储能网：储能垂直媒体编辑稿（质量接近公众号深度稿，国内机房可直连） */
async function fetchBjx(days) {
  const out = [];
  const from = Date.now() - days * 24 * 3600 * 1000;
  const pages = ['https://chuneng.bjx.com.cn/'];
  for (const url of pages) {
    let html = '';
    try {
      html = await httpGet(url, 0, { Referer: 'https://chuneng.bjx.com.cn/' });
    } catch (e) {
      console.warn(`[bjx] ${url} ${e.message}`);
      continue;
    }
    const re = /<a[^>]*title="([^"]{8,120})"[^>]*href="(https?:\/\/news\.bjx\.com\.cn\/html\/(\d{8})\/[^"]+)"/g;
    let m;
    while ((m = re.exec(html))) {
      const title = decodeEntities(m[1]).trim();
      const d = m[3];
      const ts = Date.parse(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T09:00:00+08:00`);
      if (!Number.isFinite(ts) || ts < from) continue;
      out.push({ title, link: m[2], source: '北极星储能网', ts, via: 'deep', query: 'bjx' });
    }
    await sleep(300);
  }
  console.log(`[bjx] raw ${out.length}`);
  return out;
}

async function fetchEmKx(days) {
  const out = [];
  const cutoff = Date.now() - Math.min(days, 1.5) * 24 * 3600 * 1000;
  const maxPage = 6;
  for (let p = 1; p <= maxPage; p++) {
    const url = `https://newsapi.eastmoney.com/kuaixun/v1/getlist_102_ajaxResult_100_${p}_.html`;
    let txt;
    try { txt = await httpGet(url, 0, { 'User-Agent': UA }); } catch (e) { console.warn(`[em] p${p} failed: ${e.message}`); break; }
    let data;
    try {
      data = JSON.parse(txt.replace(/^\s*var\s+ajaxResult\s*=\s*/, '').replace(/;\s*$/, ''));
    } catch (e) { console.warn('[em] bad json'); break; }
    const list = (data && data.LivesList) || [];
    if (!list.length) break;
    let oldest = Infinity;
    for (const x of list) {
      const ts = cnMs(x.showtime);
      if (!Number.isFinite(ts)) continue;
      oldest = Math.min(oldest, ts);
      const title = stripTags(x.title) || buildHeadline(x.digest);
      if (title.length < 8) continue;
      out.push({ title, link: x.url_unique || '', source: '东方财富', ts, via: 'em', query: 'emkx' });
    }
    if (oldest < cutoff) break;
    await sleep(400);
  }
  return out;
}

/* ---------------- 公众号（搜狗微信搜索） ---------------- */

function parseSogou(html, queryId) {
  const out = [];
  const blocks = html.split(/<li id="sogou_vr_/i).slice(1);
  for (const b of blocks) {
    const tm = b.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    if (!tm) continue;
    const am = tm[1].match(/href="([^"]+)"/i);
    const title = decodeEntities(tm[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    const accM = b.match(/<span class="all-time-y2">([\s\S]*?)<\/span>/i);
    const source = accM ? decodeEntities(accM[1].replace(/<[^>]+>/g, '')).trim() : '';
    const tsM = b.match(/timeConvert\('(\d+)'\)/);
    if (!title || !am || !tsM) continue;
    let link = decodeEntities(am[1]);
    if (link.startsWith('/')) link = 'https://weixin.sogou.com' + link;
    out.push({
      title,
      link,
      source: source || '微信公众号',
      ts: Number(tsM[1]) * 1000,
      via: 'wechat',
      query: queryId
    });
  }
  return out;
}

function loadWxCache() {
  try {
    if (!fs.existsSync(WX_CACHE_FILE)) return;
    const o = JSON.parse(fs.readFileSync(WX_CACHE_FILE, 'utf8'));
    if (o && Array.isArray(o.raw) && o.raw.length) {
      wxPool = o.raw;
      pruneWxPool();
      wxCache = { at: Number(o.at) || 0, raw: wxPool.slice() };
      console.log(`[wechat] 载入本地缓存 ${wxPool.length} 条`);
    }
  } catch (e) {
    console.warn(`[wechat] 缓存读取失败：${e.message}`);
  }
}

function saveWxCache() {
  try {
    fs.writeFileSync(WX_CACHE_FILE, JSON.stringify(wxCache));
  } catch (e) {
    console.warn(`[wechat] 缓存写入失败：${e.message}`);
  }
}

async function fetchWechat() {
  // 公众号结果由后台慢速队列持续累积，这里只返回当前池，不阻塞 /api/news
  return wxPool.slice();
}

/* 单次试探：只发 1 个检索式，成功就并入公众号池；被验证码拦截则退避 20 分钟 */
let wxQIndex = 0;
let wxPool = [];
let wxBlockedUntil = 0;

function wxTitleKey(t) {
  return String(t || '').replace(RE_NONWORD, '').slice(0, 40);
}

function pruneWxPool() {
  const cutoff = Date.now() - WX_MAX_AGE_MS;
  const seen = new Set();
  const out = [];
  // 新的在前，按标题去重
  for (const it of wxPool.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0))) {
    const k = wxTitleKey(it.title);
    if (!k || seen.has(k)) continue;
    if ((it.ts || 0) < cutoff) continue;
    seen.add(k);
    out.push(it);
    if (out.length >= WX_POOL_MAX) break;
  }
  wxPool = out;
}

async function wxTick() {
  if (Date.now() < wxBlockedUntil) return;
  if (wxInflight) return;
  wxInflight = (async () => {
    const q = WX_QUERIES[wxQIndex % WX_QUERIES.length];
    wxQIndex++;
    const url = 'https://weixin.sogou.com/weixin?type=2&ie=utf8&query=' + encodeURIComponent(q.t);
    let html = null;
    try {
      html = await httpGet(url, 0, { Referer: 'https://weixin.sogou.com/', 'Accept-Encoding': 'identity' });
    } catch (e) {
      lastWechat = { ok: false, raw: wxPool.length, error: e.message, at: Date.now() };
      return;
    }
    if (!html) return;
    if (/antispider|请输入验证码|访问过于频繁/.test(html)) {
      wxBlockedUntil = Date.now() + WX_BLOCK_BACKOFF_MS;
      lastWechat = { ok: false, raw: wxPool.length, error: '触发验证码', at: Date.now() };
      console.warn(`[wechat] 触发验证码，${Math.round(WX_BLOCK_BACKOFF_MS / 60000)} 分钟后重试；池内保留 ${wxPool.length} 条`);
      return;
    }
    let got = [];
    try {
      got = parseSogou(html, q.id);
    } catch (e) {
      console.warn(`[wechat] parse ${q.id} failed: ${e.message}`);
    }
    if (got.length) {
      wxPool = wxPool.concat(got);
      pruneWxPool();
      wxCache = { at: Date.now(), raw: wxPool.slice() };
      saveWxCache();
    }
    lastWechat = { ok: got.length > 0, raw: wxPool.length, error: '', at: Date.now() };
    console.log(`[wechat] ${q.id} +${got.length}，池内 ${wxPool.length} 条`);
  })().finally(() => { wxInflight = null; });
  return wxInflight;
}

function startWechatLoop() {
  setTimeout(() => { wxTick(); }, 2000);
  setInterval(() => { wxTick(); }, WX_TICK_MS);
}

function classify(text) {
  if (/破产|停产|暴雷|退出|清算|重整|起火|爆炸|召回|亏损|亏了|巨亏|裁员|安全事故|火灾|违约|退市|终止|中止|撤回|暂停|摘牌|停牌|立案|违规|调查|处罚|卖子/.test(text)) return 'risk';
  if (/基金|私募|认缴|LP|合伙企业|母基金/.test(text)) return 'fund';
  if (/收购|并购|受让|股权转让|易主|拿下.{0,16}股权|持股.{0,8}(升至|至).{0,6}%|出售|剥离|要约|取得.{0,10}控制权|增持|减持|整合|重组|变卖|竞购|接盘/.test(text)) return 'mna';
  if (/IPO|招股|上市|REITs|定增|募资|递表|聆讯|资产证券化|首次公开发行|借壳|融资|新股|超购|认购|打新|暗盘|第一股|(?:A|B|C|D|天使|Pre-IPO)轮/.test(text)) return 'ipo';
  if (/合资|成立|新设|设立|增资|入股|参股|出资|战投|战略投资|战略合作|签|共建|联手|框架协议|揭牌|投资有限公司|对外投资|新增投资|投资公司|入局/.test(text)) return 'jv';
  if (/政策|标准|补贴|补助|电价|机制|监管|试点|规划|行动方案|实施方案|工作方案|征求意见|细则|现货市场|容量电价|强制配储|管理办法|指导意见|配额|绿证/.test(text)) return 'policy';
  if (/扩产|产能|投产|开工|动工|奠基|投运|并网|装机|交付|中标|开标|招标|集采|入围|环评|环保审查|调试|试验|验收|订单|供货|项目落地|落地|吊装|安装|封顶|首吊|完工|收官|备案|公示|批前|核准|投料|开机|试产|新建|拟建|扩建|技改|万吨/.test(text)) return 'cap';
  if (/技术|研发|研制|合研|攻关|开发|量产|新品|突破|专利|认证|列名|首台|下线|能量密度|循环寿命|效率|规模化|商业化|长时|大储|液流|钒|固态|钠离子|石墨烯|镍氢|构网/.test(text)) return 'tech';
  if (/出海|海外|出口|价格|涨价|降价|市场|需求|竞争|内卷|过剩|排产|份额|榜单|蝉联|获奖|入选|盈利|收益|利润|赚|欧洲|北美|中东|东南亚|非洲|澳洲|澳大利亚|日韩|专访|访谈|对话|调研|考察|运行|运维|业绩|财报|季报|三季报|年报|Q1|Q2|Q3|Q4|成绩单|AIDC|算力|数据中心|IDC|出货|排名|趋势|拐点|观察|解读|前景/.test(text)) return 'industry';
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
  // 来源质量：微信公众号 > 储能垂直媒体深度稿 > 直连快讯 > Google 跳转
  const PRIO = { wechat: 0, deep: 1, sina: 2, em: 2, news: 3 };
  const ordered = raw.slice().sort((a, b) => (PRIO[a.via] ?? 2) - (PRIO[b.via] ?? 2));
  for (const it of ordered) {
    const title = String(it.title || '').trim();
    if (title.length < 8) continue;
    if (!/^https?:\/\//.test(String(it.link || ''))) continue;   // 没有可点开的原文链接就不展示
    if (RE_NOISE.test(title)) continue;
    const directSrc = it.via === 'sina' || it.via === 'em';
    const relevant = directSrc ? RE_CORE.test(title) : (RE_CHAIN.test(title) || RE_COMPANY.test(title));
    if (!relevant) continue;
    const ms = Number.isFinite(it.ts) ? it.ts : Date.parse(it.pubDate);
    if (!Number.isFinite(ms) || ms < from) continue;
    if (ms > Date.now() + 3600 * 1000) continue;   // 过滤公众号搜索结果里的异常未来时间

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
      if (base > 0 && inter / base >= 0.72) { dup = true; s.row.srcCount = (s.row.srcCount || 1) + 1; break; }
    }
    if (dup) continue;

    seen.add(key);
    const row = {
      title: clean,
      link: it.link,
      source: it.source,
      pubDate: `${cnParts(ms).date} ${cnParts(ms).time}`,
      date: cnParts(ms).date,
      ts: ms,
      cat: classify(clean),
      via: it.via || 'news',
      srcCount: 1,
      query: it.query
    };
    seenTxt.push({ len: clean.length, bg, row });
    rows.push(row);
  }
  // 热度：多源命中 + 金额体量 + 强信号词 + 政策/资本类，红标给「值得细读」的条目
  for (const r of rows) {
    let h = 0;
    if ((r.srcCount || 1) >= 3) h += 3;
    else if ((r.srcCount || 1) === 2) h += 2;
    const yi = amountYi(r.title);
    if (yi >= 10) h += 2;
    else if (yi >= 1) h += 1;
    if (RE_HOT.test(r.title)) h += 1;
    if (r.cat === 'cap' || r.cat === 'policy') h += 1;
    if (r.via === 'wechat' || r.via === 'deep') h += 1;
    r.heat = h;
    r.hot = h >= 3;
  }
  rows.sort((a, b) => b.ts - a.ts);
  // 控制首屏体积，保留最新 260 条；公众号文章（质量最高）不因条数上限被裁掉
  const CAP = 260;
  if (rows.length <= CAP) return rows;
  const keep = rows.slice(0, CAP);
  const wxExtra = rows.slice(CAP).filter(r => r.via === 'wechat' || r.via === 'deep');
  return keep.concat(wxExtra).sort((a, b) => b.ts - a.ts);
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
  // Google News、公众号池、直连快讯、储能垂直媒体 并行抓取，互不阻塞
  const [newsRaw, wxRaw, sinaRaw, emRaw, bjxRaw, idx] = await Promise.all([
    fetchAll(days), fetchWechat(), fetchSinaZhibo(days), fetchEmKx(days),
    fetchBjx(days).catch(e => { console.warn('[bjx] ' + e.message); return []; }),
    fetchIndex().catch(e => { console.warn('[idx] ' + e.message); return null; })
  ]);
  const raw = newsRaw.concat(wxRaw, sinaRaw, emRaw, bjxRaw);
  if (idx && idx.length) idxCache = idx;
  const items = selectItems(raw, days);
  if (!items.length) {
    lastError = `上游返回 ${raw.length} 条，过滤后为 0`;
    console.warn(`[refresh] days=${days} ${lastError}；保留上一次结果`);
    return;
  }
  const counts = {};
  for (const i of items) counts[i.cat] = (counts[i.cat] || 0) + 1;
  const wechatCount = items.filter(i => i.via === 'wechat').length;
  const directCount = items.filter(i => i.via === 'sina' || i.via === 'em').length;
  const deepCount = items.filter(i => i.via === 'deep').length;
  const payload = {
    ok: true,
    fetchedAt: cnParts(Date.now()).full,
    window: `近${days}天`,
    rawCount: raw.length,
    count: items.length,
    counts,
    wechat: { ok: lastWechat.ok, raw: lastWechat.raw, count: wechatCount, error: lastWechat.error || '' },
    direct: directCount,
    deep: deepCount,
    index: idxCache,
    items
  };
  caches.set(days, { payload, at: Date.now() });
  lastError = '';
  console.log(`[refresh] days=${days} ok: ${items.length} items (公众号 ${wechatCount} / 深度 ${deepCount} / 直达 ${directCount}) / raw ${raw.length}`);
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
      lastError: lastError || null,
      wechat: { ok: lastWechat.ok, raw: lastWechat.raw, error: lastWechat.error || null }
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
  loadWxCache();
  server.listen(PORT, HOST, () => {
    console.log(`ESS dashboard listening on http://${HOST}:${PORT}`);
    // 公众号：后台慢速增量队列（每 40 秒 1 个检索式），持续累积到池内
    startWechatLoop();
    // 启动后在后台预热（不阻塞首个请求）
    for (const d of [3, 2]) {
      getCache(d);
      setTimeout(() => ensureRefresh(d), d === 3 ? 500 : 20000);
    }
  });
}

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });

module.exports = { parseRss, parseSogou, selectItems, classify, bigrams, decodeEntities, cnParts, fetchWechat, fetchSinaZhibo, fetchEmKx, fetchBjx, fetchIndex };
