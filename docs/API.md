# 工具与数据

数据源：[墨墨开放 API](https://open.maimemo.com/)，[OpenAPI 规范](https://open.maimemo.com/api_bundle.yaml)。

生产基础地址：`https://open.maimemo.com/open/api/v1/memo`。认证使用 `Authorization: Bearer <token>`。

## `get_today_words`

调用 `POST /study/get_today_items`。

参数：`is_new`、`is_finished`，或 `spellings` / `voc_ids`，以及 `limit`。按拼写或 ID 查询时使用单独条件。默认 50 条，最多 1000 条。

返回 `today_items`，每个单词包含：

| 字段 | 含义 |
| --- | --- |
| `voc_id` / `voc_spelling` | 单词 ID / 拼写 |
| `order` | 学习顺序 |
| `first_response` | 当天第一次反馈，可缺省 |
| `is_new` | 是否新学 |
| `is_finished` | 是否完成当日学习 |

反馈值：`FAMILIAR` 认识、`VAGUE` 模糊、`FORGET` 忘记、`WELL_FAMILIAR` 熟知、`CANCEL_WELL_FAMILIAR` 取消熟知。

## `get_study_progress`

调用 `POST /study/get_study_progress`。返回 `progress`：

- `finished`：已完成单词数。
- `total`：今日应完成单词数。
- `study_time`：今日学习时长，单位毫秒。

## `get_word_info`

调用 `GET /vocabulary?spelling=...`。参数为 `spelling`，返回词汇 `id` 和 `spelling`。

## `get_study_records`

调用 `POST /study/query_study_records`。可按拼写、ID、`tags=STICKING` 或 `next_study_date.start/end` 筛选；`as_count=true` 用于计数。

返回单词的反馈、累计学习次数、标签和学习时间字段。`study_count` 每天最多计入一次；`count` 在计数模式下有效。标签保留接口原值及其字符串/数组类型。

## 通用返回

- `source`：墨墨来源与取数时间。
- `scope`：北京时间、筛选条件、条数及 `possibly_truncated`。
- `data`：墨墨字段。
- `field_meanings`：简短字段释义。

接口频控为 10 秒 20 次、60 秒 40 次、5 小时 2000 次。服务处理 429 与等待时间。
