---
title: "指标变好了，但默认没开：SAGE RAG 的几个工程取舍"
description: "把 PostgreSQL 全文检索 + 精确向量 + RRF 接进 SAGE，并在同一协议下比较 FastEmbed、百炼和豆包后，百炼在冻结测试把 Recall@10 从 0.889 提到 1.000。但它仍然默认关闭。记录这次 RAG 工程化里几个由证据而不是技术标签决定的取舍。"
published: 2026-07-28
category: agent
tags: [SAGE, RAG, 检索工程, 评测, PostgreSQL, pgvector]
featured: false
draft: false
visibility: public
publish: true
---

这次给 SAGE 做 RAG 工程化，做完出现一个反直觉的结果：在同一 PostgreSQL、Corpus、Top-K、RRF 和 Gate 协议下比较 FastEmbed、百炼与豆包后，进入 frozen final 的百炼模型把可回答子集 Recall@10 从 `0.889` 提到 `1.000`，MRR 从 `0.683` 提到 `0.806`。但它的默认开关，我还是没打开。

这篇文章记录这次工程化里几个克制的取舍--什么时候指标变好了也不默认开、什么时候离门限只差几毫秒也不加近似索引、什么时候 12/12 通过了也不敢说"我们有多模态检索"。这些选择不是保守，是让每一步都经得起追问。

<figure class="article-figure">
  <img src="/images/posts/rag-tradeoffs-restraint.webp" alt="一根精密测量杆接近但未触及右侧标出的阈值刻线，两者之间留有可见间隙" width="2048" height="1152" loading="eager" />
  <figcaption>门禁没过就不默认开：哪怕指标变好，也要看它是否真的越过了该越过的那条线。</figcaption>
</figure>

先说一句边界：这次工作在开发分支完成后只做主干版本收口，不做部署，也不接入外部协作入口。它是一次工程演进，不是产品上线。下面的指标都来自冻结评测集，不是线上召回率。

## 先建尺子，再谈改进

动手优化之前先做了一件事：把语料和评测固化为可追溯的资产。9 份官方项目快照（LangGraph、PostgreSQL、pgvector、FastAPI 的文档和核心源码），80 条 AI/Codex 辅助构造案例，按 `dev / calibration / test = 40 / 20 / 20` 切分，`test` 标记为冻结，后续优化不准在上面调阈值。每条语料都绑定 URL、commit、license、内容 hash 和 parser 版本。

这里的 Gold 不是独立人工逐条标注：可回答问题绑定 source anchor、required passage 和 required claim，无答案问题绑定 forbidden claim，再通过 Schema、Hash 与 `leakage_group` 自动校验。它是一套可复现的个人项目评测资产，不代表真实用户分布，也不能写成 human-reviewed Gold。

这件事看起来不产出功能，但它解决了后面所有取舍的前提：**没有一把固定且不可作弊的尺子，"指标变好了"这句话就不可信。**

这里有一个容易踩的坑：历史 benchmark v2 的 `0.578 -> 0.814` 看起来是大幅进步，但它比的是另一套数据集、另一种 provider，不能和当前这 80 条案例的数字拼在一起讲。跨数据集比数字，是评测里最常见的自我欺骗。所以第一守则是：只和同一把尺子上的自己比。

## 取舍一：三家 Recall 都到 1.0，为什么只让百炼进 final

先把“真实语义模型”拆开看。FastEmbed 384 维、百炼 `text-embedding-v4` 1024 维和豆包 `doubao-embedding-vision` 2048 维，在 selection 的 58 个可回答样本上都把 hybrid Recall@10 提到了 `1.000`。如果只看 Recall，三者没有区别。

真正拉开差异的是排序、Gate、延迟、成本和复现边界：百炼的 selection MRR/NDCG 最高，并且成本能按固定参数审计；豆包 false rejection 更少，但当前 Coding Plan 没有逐 token 成本口径，成本门禁只能按 unknown fail closed；FastEmbed 不出网、模型 commit 可固定，适合作为离线回退。最后只让百炼进入 frozen final，而不是三家都跑一遍 test 再挑最好看的数字。

这个过程比“换一个 embedding 看分数”多了一层纪律：**Provider 在 dev/calibration 选，test 只验唯一候选。**否则 test 就不再是 test，只是另一块调参集。

## 取舍二：Recall 提到 1.0，但默认没开

用真实语义模型替换原来的特征哈希 baseline 后，冻结测试的结果是这样的：

| 指标 | 特征哈希 hybrid | 语义 hybrid |
| --- | ---: | ---: |
| Recall@10 | 0.889 | 1.000 |
| MRR | 0.683 | 0.806 |
| NDCG@10 | 0.701 | 0.852 |
| false rejection | 2 | 0 |
| false acceptance | 0 | 0 |

检索、排序和拒答结果都变好。按理说该默认开了。

但我没开。原因是这套冻结测试里**语义改写类型的案例数是 0**。我给自己定的启用门槛之一是"语义改写子集 Recall 至少提高 5 个百分点"，而这条门禁在当前数据集上根本无法评估。无法评估不是通过，是无法评估，按 fail-closed 处理。

也就是说：overall 的数字变好了，但**专门用来证明"语义模型值得开"的那条证据缺失**。这时候默认开，等于用一个没法验证的门禁去换一个好看的 overall 数字。所以运行时默认仍是特征哈希，语义模型只作为可选候选保留。

这个取舍的核心不是"指标不够好"，而是"**该证明的那一面还没被证明**"。overall 变好可能只是碰巧，专项门禁存在正是为了挡掉这种碰巧。

报告里还有一个 `citation support = 1.0`，但它只证明 evidence 能解析回正确 chunk 和 source revision，不代表生成答案 100% 正确。本轮 Generation 仍是 deterministic extractive proxy，没有真实 LLM faithfulness 或 citation correctness，因此这项数字不参与“答案质量已经解决”的叙述。

## 取舍三：四种重排都没过门禁，哪怕 NDCG 看着涨了

分块和重排做了四个候选的独立消融，每个单独开关、单独报告，禁止一起上线后无法归因：

| 候选 | NDCG 变化 | 关键代价 | 决策 |
| --- | ---: | --- | --- |
| Contextual metadata | +0.003 | 低于 +0.01 目标 | 不默认 |
| Parent-Child | +0.010 | chunks 翻倍、存储约 2 倍 | 不为小收益降门禁 |
| Semantic Boundary | — | 正式语料里 0 个超大块，未触发 | 无法判定，不默认 |
| Cross-Encoder | +0.045 | Recall −0.043、P95 1436ms | Recall 与延迟双失败 |

这里最值得讲的是 Cross-Encoder：它的 NDCG 涨了 `0.045`，单看这个数字是最漂亮的。但 Recall 反降 `0.043`，P95 飙到 1436 毫秒。一个把"能召回的反而召回不到"、还把延迟拉到不可接受的重排器，NDCG 再好看也不能上。

四个候选最终都是 `eligible_for_default=false`，运行时默认保持原来的 parser-block 切分。这条取舍的教训是：**单指标上涨不构成上线理由**。一个策略要默认开，必须关键指标不回归、代价可接受、且收益超过门限，三者同时成立。

## 取舍四：离门限只差 6 毫秒，也没加 HNSW

在 10 万条 synthetic 384 维向量的规模基准上，精确扫描 P95 是 `93.906 ms`，离我定的 100 毫秒门限只剩约 6 毫秒：

| chunks | exact Recall@10 | P50 | P95 | 决策 |
| ---: | ---: | ---: | ---: | --- |
| 1,000 | 1.000 | 0.6ms | 1.4ms | — |
| 10,000 | 1.000 | 2.2ms | 2.8ms | — |
| 100,000 | 1.000 | 57.4ms | 93.9ms | 未过 100ms 门，keep_exact |

很接近了。换作追求"用了 HNSW"这个标签，现在就可以上。但门禁的规则是"精确扫描 P95 超过 100 毫秒才运行 HNSW 实验"。`93.9 < 100`，没过就是没过。

HNSW 是用近似召回换查询速度的索引，它引入新的参数（`ef_search`）、新的召回损失、新的维护成本。在精确搜索还没真正成为瓶颈之前引入它，等于用确定性的 `Recall@10 = 1.0` 去换一个没法证明自己更优的近似方案。所以结论是 `keep_exact`：保持精确扫描，HNSW 留到真的过线再跑。

这条取舍的教训是：**"快到瓶颈了"不等于"已经到瓶颈"**。门禁是死的，接近门限不触发门禁。留这 6 毫秒的余量，是为了让"什么时候该上 HNSW"是一个由数据回答的问题，而不是一个由情绪回答的问题。

## 取舍五：12/12 通过，但没说"我们有多模态检索"

多模态证据链做完了：DOCX 和 PNG 能解析，图片、表格、页码、bbox、置信度都持久化，引用能定位到页面和视觉区域，12 条 fixture 全过，7 个 bbox 案例区域准确率 `1.0`。

但我没把它说成"我们支持多模态检索"。因为这次只验证了**解析和证据契约**--系统能不能把一个图片区域正确地切成结构化证据并稳定引用。它没验证真实 VLM 的质量，也没有视觉向量检索。所以记录里明确标了 `live_vlm_quality_evaluated=false`、`visual_vector_retrieval_enabled=false`。

这条取舍的教训是：**"管道通了"不等于"能力具备了"**。证据链 12/12 和"我们有多模态检索"是两件事。把前者说成后者，就是用结构正确性冒充语义能力。区分这两者，是诚实的基本功。

## 取舍六：有界恢复清零了失败，但没降低 Gate

最后是检索恢复。原来的链路是"单次检索 + 末端拒答"，这次升级成"检索 -> 覆盖度判断 -> 有限恢复 -> 仍不足则拒答"。在可回答样本上，两个已知的检索失败被清零，而 no-answer 的误接纳没有增加。

关键是恢复有边界：

- 最多两轮，不允许无限 ReAct 检索循环；
- 第二轮走同一条 hybrid 路线、复用同一个 Gate，只做确定性改写和有界 Top-K（最多 2 倍且不超过 20）；
- 不通过降低 Gate 阈值来硬答；结果更差就回退第一轮，仍不足就拒答并说明缺什么。

这条取舍的教训是：**恢复可以更努力，但不能更妥协**。清零失败是好事，但如果代价是降低拒答标准去硬接，那就把"修好了一个检索失败"换成了"制造了一个幻觉"。有界恢复的设计目标是让"更努力"和"不妥协"同时成立。

## 收尾

这次工程化做的东西不少：版本化语料、分层评测、PostgreSQL 精确混合检索、真实语义模型、失败可观测性、有界恢复、多模态证据链、规模门禁。但最后真正值得讲的，是那些**没默认开**的决定：

- 三家 Embedding 的 selection Recall 都到 1.0，但只让事先选出的百炼进入 frozen final；
- 百炼 frozen Recall 到 1.0，默认仍没开，因为专项门禁无法评估；
- 四种重排都没默认开，因为单指标好看不代表关键指标不退步；
- HNSW 没上，因为精确搜索还没真正过线；
- 多模态没冒充检索，因为证据链通了不等于视觉能力具备了；
- 恢复没降 Gate，因为更努力不能变成更妥协。

克制不是保守。保守是不敢做，克制是做了但知道什么时候不默认开。两者的区别在于：克制背后有一把固定的尺子、一组明确的门禁，和"门禁没过就不开"这条死规则。没有这条规则，"指标变好了"就会一次次变成"那默认开吧"，直到某天你发现线上召回率其实没人能解释。

这与我之前写的[《评测不是打分》](/posts/agent-evaluation-four-layers/)是同一件事的两面：那篇讲方法--怎么让评测结果因果可解释；这篇讲实践--当评测告诉你"还没过门"时，哪怕数字好看，也忍住别开。

## References / 相关链接

- [SAGE GitHub 仓库](https://github.com/ZeroMadLife/sage-agent)
- [PostgreSQL 全文检索文档](https://www.postgresql.org/docs/current/textsearch.html)
- [pgvector](https://github.com/pgvector/pgvector)
- [FastEmbed（离线可复现的 embedding）](https://github.com/qdrant/fastembed)
- [LangGraph](https://github.com/langchain-ai/langgraph)
- [FastAPI](https://fastapi.tiangolo.com)
- 相关：[评测不是打分：SAGE 的 Context、Memory、RAG、Harness 怎么量](/posts/agent-evaluation-four-layers/)
