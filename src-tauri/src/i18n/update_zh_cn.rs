pub const GITHUB_PROXY_REDIRECT_REJECTED: &str =
    "资源代理重定向到了其他站点；请使用由代理服务转发上游重定向的入口。";
pub const GITHUB_PROXY_REDIRECT_LIMIT: &str = "资源代理重定向次数过多。";
pub const UPDATE_CONFIG_MISSING: &str = "软件更新配置不可用。";
pub fn app_update_failed(error: impl std::fmt::Display) -> String {
    format!("软件更新请求失败：{error}")
}
