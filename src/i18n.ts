import { createI18n } from 'vue-i18n'
import en_US from './locales/en-US.json'
import zh_CN from './locales/zh-CN.json'
import ja_JP from './locales/ja-JP.json'
import ko_KR from './locales/ko-KR.json'

const messages = { en_US, zh_CN, ja_JP, ko_KR }

export const i18n = createI18n({
    legacy: false,
    locale: 'en_US',
    fallbackLocale: 'en_US',
    messages
})
