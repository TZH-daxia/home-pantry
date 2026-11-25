declare const process: {
  env: {
    TARO_APP_API_BASE_URL?: string
    /** 构建期注入：'true' 表示纯本地演示版本（不请求后端） */
    TARO_APP_LOCAL_ONLY?: string
  }
}
