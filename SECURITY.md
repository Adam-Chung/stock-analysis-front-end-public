# Security Policy

此 repository 是由 Private source of truth 產生、已排除 production state 的 source-available 公開版本，不是可直接部署的安全範本。

請勿在 Public issue、Pull Request、commit 或 log 中張貼密碼、API key、token、連線字串、個人資料或內部 URL。若發現疑似弱點，請使用 GitHub 的 Private Vulnerability Reporting；若該功能不可用，先透過 repository owner 的 GitHub profile 私下聯絡。

Public mock mode 預設停用 Google 登入且不聯絡 Google。非 mock 模式使用 Google Identity Services 與配套 backend 的 server-side session，但自行公開部署前仍須使用自己的 OAuth client，驗證 HTTPS、cookie policy、CORS、CSRF／XSS 防護、帳號停用、資料刪除與 rate limit，並重新執行 dependency scan、secret scan 與 integration test。

若憑證可能外洩，應先撤銷或 rotate，再評估 Git history、Actions logs、artifacts 與 cached content 的清理範圍。
