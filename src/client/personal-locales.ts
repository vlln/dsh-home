/** Merge into the home client's zh/en dictionaries; date locale is explicit UI state. */
export const zhPersonal = {
  'widget.notes.title': '便笺',
  'widget.notes.description': '直接在卡片上写；首行自动作为加粗标题，其余是正文，停笔即保存。',
  'notes.edit': '编辑便笺',
  'notes.empty': '第一行是标题，下面写正文。点一下就能写。',
  'notes.placeholder': '第一行是标题，下面写正文…',
  'notes.limitError': '内容超过 8 KiB，没有保存。请缩短后再试。',
  'notes.saveError': '没能保存这次修改，卡片上仍是草稿；移开焦点时会再试一次。',
  'widget.clock.title': '时钟与日期',
  'widget.clock.description': '时间、日期与一个时区选项；每分钟更新。时区从列表里选，不需要输入。',
  'clock.timeZone': '时区',
  'clock.followBrowser': '跟随浏览器',
  'clock.dateLocale': 'zh-CN',
} as const

export const enPersonal: Record<keyof typeof zhPersonal, string> = {
  'widget.notes.title': 'Notes',
  'widget.notes.description': 'Write straight on the card; the first line becomes the bold title, the rest is the body, and pausing saves it.',
  'notes.edit': 'Edit note',
  'notes.empty': 'First line is the title, then the body. Click to write.',
  'notes.placeholder': 'First line is the title, then the body…',
  'notes.limitError': 'Over 8 KiB, so it was not saved. Shorten it and try again.',
  'notes.saveError': 'This edit could not be saved yet; the card keeps it as a draft and retries when you click away.',
  'widget.clock.title': 'Clock & date',
  'widget.clock.description': 'Time, date and one time-zone option, updated every minute. Pick the zone from a list; no typing.',
  'clock.timeZone': 'Time zone',
  'clock.followBrowser': 'Follow browser',
  'clock.dateLocale': 'en-US',
}
