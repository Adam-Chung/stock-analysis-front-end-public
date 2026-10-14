# Stock Analysis Frontend — Public Portfolio Mirror

這是台股分析網站前端的去營運化 Public mirror，展示 Angular Signals、responsive layout、估值互動、搜尋／收藏與 API service 分層。Private repository 才是唯一開發與營運來源；此 repository 不含 Private Git history、production URL、runtime state 或真實憑證，也不會自動反向同步。

## 功能與技術

- Angular 21、TypeScript、Signals、SCSS、PrimeNG。
- 股票目標價、企業體質檢視、搜尋、收藏與 AI 建議互動。
- 桌面側欄、手機漢堡選單與 responsive 估值版面。
- service 層可切換 mock 與真實 API；Public 預設強制使用 mock mode。

## 本機執行

需求：相容的 Node.js 與 npm。

```powershell
npm ci
npm start
```

驗證：

```powershell
npm test -- --no-watch
npm run build
npm audit --omit=dev --audit-level=high
```

Public 的 `src/environments/environment.ts` 固定為 mock mode 與 localhost API URL，不包含正式後端位置。

## 安全與部署限制

- 這份 mirror 僅供程式碼審閱與學習，未提供 production deployment workflow。
- 現有 browser token storage 與對應的 simple auth 是單一使用者原型，不符合 production 安全要求；不可直接部署或暴露於公網。
- Public mirror 不含 production domain、帳號、token、部署設定或 Private agent state。

## 第三方資料責任

畫面可呈現由後端取得的市場、財務與 AI 內容，但 Public mirror 不內建真實資料或來源憑證。使用者在連接任何來源前，必須自行確認目前的 Terms of Service、API 或資料 License、robots.txt、rate limit、attribution、隱私、AI processing 與再散布限制。公開可存取或技術上能連線，不代表已取得合法授權；若授權不明，應維持停用。

## No License

目前未授予本 repository 內容的使用、修改或散布授權。Public visibility 不等於 Open Source，也不授予商業或非商業重用權。正式 License 仍由 repository owner 決定。
