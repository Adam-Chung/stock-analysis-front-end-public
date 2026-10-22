# Security Policy

此 repository 是由 Private source of truth 產生、已排除 production state 的 source-available 公開版本，不是可直接部署的安全範本。

請勿在 Public issue、Pull Request、commit 或 log 中張貼密碼、API key、token、連線字串、個人資料或內部 URL。若發現疑似弱點，請使用 GitHub 的 Private Vulnerability Reporting；若該功能不可用，先透過 repository owner 的 GitHub profile 私下聯絡。

已知限制：browser token storage 與配套 backend 的 simple auth 只適合單一使用者原型。公開部署前必須改成安全的 authentication／authorization、短期 session、適當的 cookie policy 或 token storage、CSRF／XSS 防護，並重新執行 dependency scan、secret scan 與 integration test。

若憑證可能外洩，應先撤銷或 rotate，再評估 Git history、Actions logs、artifacts 與 cached content 的清理範圍。
