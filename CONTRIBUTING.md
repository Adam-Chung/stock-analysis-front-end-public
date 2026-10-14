# Contributing

這是由 Private source of truth 單向產生的 Public mirror。Public issue 與 Pull Request 可作為建議，但不會自動同步回 Private repository；可接受的修改會由 owner 人工審查、移植到 Private，再重新產生此 mirror。

提交前請執行：

```powershell
npm ci
npm test -- --no-watch
npm run build
npm audit --audit-level=moderate
```

請勿提交真實憑證、production URL、個人資料、第三方完整內容、未獲授權的資料 fixture 或部署設定。
