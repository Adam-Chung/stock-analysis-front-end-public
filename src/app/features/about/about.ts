import { ChangeDetectionStrategy, Component } from '@angular/core';

/** 「關於本站」：介紹存股分析的定位與方法論，純靜態內容，不呼叫任何 API。 */
@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  readonly goodinfoScreeningUrl = buildGoodinfoScreeningUrl();
}

/** 建立 Goodinfo 存股條件篩選網址，避免在 template 中維護冗長 query string。 */
function buildGoodinfoScreeningUrl(): string {
  const params = new URLSearchParams({
    SHEET: '股利政策發放年度_歷年加權平均',
    SHEET2: '近10年平均',
    MARKET_CAT: '自訂篩選',
    INDUSTRY_CAT: '我的條件',
    RPT_TIME: '最新資料',
    FL_MARKET: '上市/上櫃',
    FL_ITEM0: '連續配發現金股利次數', FL_VAL_S0: '10',
    FL_ITEM1: '加權平均–近10年平均合計殖利率', FL_VAL_S1: '4',
    FL_ITEM2: '股本 (億元)', FL_VAL_S2: '50',
    FL_ITEM3: '直接平均–近5年ROE(%)', FL_VAL_S3: '13',
    FL_ITEM4: '加權平均–近5年EPS(元)', FL_VAL_S4: '1',
    FL_ITEM5: '年度–EPS(元)–本年度', FL_VAL_S5: '0',
    FL_ITEM6: '年度–EPS(元)–前1年', FL_VAL_S6: '0',
    FL_ITEM7: '年度–EPS(元)–前2年', FL_VAL_S7: '0',
    FL_ITEM8: '年度–EPS(元)–前3年', FL_VAL_S8: '0',
    FL_ITEM9: '年度–EPS(元)–前4年', FL_VAL_S9: '0',
    FL_ITEM10: '單季–每股淨值(元)', FL_VAL_S10: '15',
    MY_FL_RULE_NM: '存股條件篩選',
  });
  return `https://goodinfo.tw/tw/StockList.asp?${params.toString()}`;
}
