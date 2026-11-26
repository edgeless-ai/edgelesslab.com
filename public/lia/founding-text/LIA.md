# Latent Information Archaeology (LIA)

*The systematic excavation of what the world could already know.*

**Founding text · Version 0.1 · November 25, 2026**

## Preamble

Humanity has become extraordinarily good at producing information and comparatively poor at exhausting its implications.

We publish papers, file patents, record observations, document failures, accumulate archives, and generate increasingly vast quantities of data. Each artifact enters a particular context, serves a particular purpose, and is usually interpreted within the boundaries of the discipline, institution, language, or moment that produced it.

The relationships between those artifacts are not necessarily exhausted when their original purpose is fulfilled. An observation made in one field may resolve a problem in another. A failed experiment may contain the evidence needed for a future invention. Two independently established facts may imply a third that nobody has articulated.

There is an asymmetry between what humanity has recorded and what humanity has recognized.

**Latent Information Archaeology (LIA) is the proposed discipline of investigating that asymmetry.**

Its premise is not that all future discoveries have already been made. It is that some discoveries can be made from information already in existence, and that the systematic exploration of this possibility deserves to be a discipline in its own right.

The name is an invitation to develop that discipline collectively.

## 1. Canonical definition

**Latent Information Archaeology is the systematic identification, reconstruction, and validation of previously unrecognized information, relationships, implications, and opportunities latent within existing informational artifacts.**

An informational artifact is any preserved representation of an observation, claim, process, decision, or event: a scientific paper, dataset, patent, photograph, recording, software repository, experimental notebook, model, or other record.

An archaeological discovery is not necessarily new information about the physical world. It may instead be a new understanding of the information already available about that world.

LIA is concerned with what can be recovered, inferred, or reconstructed from the existing record, including what can be identified as a promising candidate for subsequent empirical investigation.

It is a discipline, not a specific algorithm, architecture, product, or model. Artificial intelligence is an important enabling technology, but it is not a prerequisite for doing LIA.

## 2. The central thesis

The informational state of civilization exceeds its articulated understanding of that information.

The gap arises because knowledge production is distributed, specialization is necessary, archives are incomplete, vocabulary changes, incentives favor certain questions, and the possible relationships between artifacts grow faster than our ability to investigate them.

These conditions create an **epistemic backlog**: a collection of recoverable observations, potentially meaningful relationships, unresolved contradictions, and unexamined implications.

This backlog is not a fixed inventory of truths waiting to be retrieved. Its boundaries depend on the accessible corpus, the available methods of inference, the questions being investigated, and the standards of evidence applied. Some candidates will be false, others trivial, and others impossible to resolve without new observations.

LIA exists to distinguish among them.

The economic thesis is that improvements in search, machine reasoning, representation learning, and computational capacity can reduce the cost of investigating this backlog. If true, activities that were previously impractical may become routine. This is a research proposition, not an established universal law.

## 3. What is latent?

Latency is relational. A claim can be explicit in one archive, invisible to another community, and genuinely unarticulated when considered across an entire body of evidence.

LIA recognizes several kinds of latency:

| Class | Description |
| --- | --- |
| **Archival** | Information explicitly recorded but subsequently forgotten, inaccessible, or overlooked. |
| **Relational** | Meaningful connections among artifacts that have not been recognized or documented together. |
| **Inferential** | Conclusions or hypotheses obtainable by combining observations, claims, or constraints. |
| **Contextual** | Previously known information whose relevance becomes apparent under different conditions or in a different domain. |
| **Representational** | Structure or associations encoded in a computational representation, such as an embedding or trained model, that require elicitation and independent verification. |

These classes are not exclusive. An excavation may recover an obscure observation, connect it to a separate field, and reveal its usefulness in a new technological context.

A model's ability to articulate a claim does not establish that the claim was encoded as truthful knowledge, nor that the claim is supported by its training data. Representational latency requires particular care because the original evidentiary trail may be inaccessible.

## 4. The epistemic boundary

Let `C(t)` be a defined corpus containing artifacts available at or before time `t`. Let `E(t)` denote the claims explicitly documented within a specified reference record by that time. Let `M` denote a specified set of retrieval, reasoning, and analytical methods.

Define `H(C(t), M)` as the candidate claims recoverable or constructible from the corpus using those methods.

A working discovery space is:

```text
L(C, t, M) = H(C(t), M) \ E(t)
```

The subtraction is semantic rather than literal: paraphrasing an existing claim does not make it novel. This is a conceptual model, not an assertion that the sets are fully enumerable or that membership can always be established.

Three important consequences follow:

- Latency is relative to a corpus, a historical boundary, and a method of investigation.
- A candidate in the discovery space is not necessarily true. The space includes unsupported conjectures and erroneous inferences.
- Novelty is relative to a documented reference record. The absence of an earlier publication cannot prove that no person previously knew a claim.

A separate validation process determines what epistemic status each candidate warrants.

## 5. The distinction between discovery and invention

LIA does not require that discoveries be logically entailed by the historical record. Some are deductive consequences; others are statistical patterns, explanatory hypotheses, analogies, or proposed transfers between domains.

The distinction is the origin of the evidentiary substrate, not whether the investigator employed creativity.

A useful boundary is between an **archaeological candidate**, generated from existing information, and a **validated discovery**, which has survived the appropriate tests. A candidate may require new experiments before it becomes a discovery about the physical world.

In that case, LIA identified the research opportunity; experimental science established its empirical validity.

Neither activity replaces the other.

## 6. Principles

The following principles define the proposed discipline.

1. **Evidence precedes assertion.** A plausible narrative is not a substitute for a traceable evidentiary chain.
2. **Provenance is part of the discovery.** A finding should preserve its source artifacts, dates, transformations, and inferential steps.
3. **Novelty is investigated, not presumed.** Rediscovery is valuable, but must not be misrepresented as original discovery.
4. **The question may itself be the discovery.** Recognizing that a problem can be asked differently is a legitimate outcome.
5. **Contradictions are excavation sites.** Inconsistencies can indicate missing variables, incompatible assumptions, errors, or genuine opportunities for explanation.
6. **Similarity is a lead, not proof.** Semantic proximity, analogy, and correlation may initiate inquiry but cannot independently establish causation or truth.
7. **Time is an evidentiary constraint.** Claims about what could have been discovered earlier must exclude information unavailable at the historical cutoff, including information introduced through model training or retrieval.
8. **Negative results belong in the record.** Failed connections, rejected hypotheses, and uncertainty should be retained when possible so future investigators do not repeat the same excavation.
9. **Methods are replaceable; standards are not.** Human scholarship, statistical analysis, graph reasoning, language models, and future computational systems can all participate.
10. **Knowledge should circulate.** Publish methods, evidence, and findings as openly as possible, consistent with privacy, source rights, safety, and the legitimate interests of affected people.

## 7. The archaeological method

LIA can be practiced as a recurring cycle rather than a one-time search.

```text
Define the excavation boundary
             |
Acquire and preserve artifacts
             |
Map entities, claims, and relationships
             |
Detect gaps, anomalies, and possible connections
             |
Construct candidate discoveries
             |
Challenge evidence, novelty, and inference
             |
Validate or classify the remaining uncertainty
             |
Publish findings and rejected hypotheses
             |
             +----> Repeat with the enriched record
```

The investigator should define the corpus and temporal boundary, retain primary sources, normalize entities without erasing meaningful context, and explore both expected and unexpected relationships.

Candidate discoveries should be subjected to competing explanations, counterexamples, source independence checks, and appropriate empirical or logical tests. Wherever possible, independent investigators should be able to reconstruct the reasoning.

A persistent LIA system could autonomously propose new lines of inquiry, but it must be designed to reject more than it accepts when the evidence warrants it. The objective is not maximal hypothesis production. It is the efficient identification of consequential, defensible findings.

## 8. The excavation record

A finding should be packaged in a form that other investigators can audit, challenge, reproduce, and build upon. The following is a proposed minimal record format, not a finalized technical standard.

```yaml
lia_version: "0.1"
id: "<stable identifier>"
claim: "<precise candidate finding>"
corpus: "<defined source collection>"
cutoff: "<historical cutoff, if applicable>"
latency_class: "<one or more classes>"
sources:
  - reference: "<persistent source identifier>"
    evidence: "<relevant observation or claim>"
    available_at: "<date or documented uncertainty>"
inference: "<reasoning connecting the evidence>"
alternatives: []
contradictory_evidence: []
novelty_check: "<scope, methods, and results>"
status: "candidate"
validation: "<tests and their results>"
limitations: []
next_test: "<what could refute or strengthen the claim>"
```

Suggested statuses are `candidate`, `corroborated`, `validated`, `rediscovered`, `rejected`, and `unresolved`. Novelty and validity are separate axes: a rediscovery can be true, and a novel candidate can be false. A mature standard should record those dimensions independently.

## 9. Intellectual lineage

LIA is a proposed synthesis and extension of existing traditions, not a claim to have invented their constituent methods.

- **Undiscovered public knowledge and literature-based discovery.** Don R. Swanson demonstrated how separately developed bodies of biomedical literature could support a previously unrecognized hypothesis. His 1986 work on fish oil and Raynaud's syndrome is a foundational precedent. [1, 2]
- **Computational extraction of latent scientific knowledge.** Tshitoyan and colleagues demonstrated in 2019 that representations learned from materials science literature could recover domain relationships and retrospectively recommend materials before their later documented investigation. [3]
- **AI-assisted scientific discovery.** Co-Scientist illustrates how multi-agent hypothesis generation and criticism can be integrated into scientific investigation. [4]
- **Archival scholarship, knowledge graphs, abductive reasoning, information retrieval, and exploratory data analysis.** These traditions provide additional methods for the recovery, organization, and interpretation of existing evidence.

The proposed contribution of LIA is to place the informational backlog itself at the center of a general, cross-domain discipline: to investigate its structure, develop methods for its excavation, and establish shared standards for the resulting findings.

Whether this synthesis merits recognition as a distinct discipline is a question for the community and for the results it produces.

## 10. A research agenda

The discipline should be judged by what it can demonstrate, not by the ambition of its premise.

Early priorities include:

- **Historical replay.** Freeze a corpus at an earlier date and measure whether a method recovers discoveries documented afterward. Control for training-data leakage, hindsight in selecting tasks, and selection bias.
- **Prospective excavation.** Publish timestamped candidate discoveries before their outcomes are known, including failed predictions and null results.
- **Comparative performance.** Compare LIA methods with conventional search, literature-based discovery systems, domain experts, and simple statistical baselines under comparable resource constraints.
- **Excavation economics.** Measure cost per defensible finding, reviewer time, reproducibility, and the marginal benefit of additional computation or data.
- **Cross-domain transfer.** Test whether useful principles, technologies, and explanations can be recovered across distinct vocabularies and institutional boundaries.
- **Negative knowledge.** Develop representations for disproven claims, failed experiments, unresolved contradictions, and previously discarded approaches whose constraints may have changed.
- **Epistemic infrastructure.** Develop interoperable excavation records, provenance standards, public benchmarks, and mechanisms for correction and replication.

Useful metrics include verified novelty relative to a defined record, precision of validated claims, recall against bounded benchmarks, calibration of uncertainty, provenance completeness, reproducibility, and cost per validated result. No single score can adequately represent all of these dimensions.

## 11. Why archaeology?

Archaeology is an appropriate metaphor because the investigator encounters a record shaped by time, loss, preservation, selection, and context.

An artifact rarely explains itself. Its position relative to other artifacts matters. An absence may be meaningful, or it may simply reflect what was never recorded or what failed to survive.

The archaeologist cannot legitimately manufacture missing evidence and present it as recovered material. Neither can the information archaeologist.

The work is excavation, reconstruction, interpretation, and verification. It is as much about understanding the limits of the record as it is about discovering what the record contains.

## 12. An open invitation

LIA is proposed as a shared intellectual project. No particular institution, model provider, or implementation should define its boundaries by default.

Researchers, engineers, archivists, historians, scientists, artists, and independent investigators are invited to adopt the term, challenge its assumptions, build tools, publish excavations, establish benchmarks, and extend the canon.

The vocabulary is meant to be useful, not proprietary. The founding text is meant to be amended when better ideas or better evidence emerge. Where possible, preserve attribution and a visible history of revisions so that the development of the discipline remains itself an intelligible record.

The ambition is not to establish a single system that knows everything. It is to establish a practice through which more of what is already available to humanity becomes intelligible, testable, and useful.

**The frontier of discovery is not only ahead of us. Some of it is behind us, buried in the record we have already made.**

---

## References

1. Swanson, D. R. (1986). Undiscovered public knowledge. *The Library Quarterly*, 56(2), 103–118. https://doi.org/10.1086/601720
2. Swanson, D. R. (1986). Fish oil, Raynaud's syndrome, and undiscovered public knowledge. *Perspectives in Biology and Medicine*, 30(1), 7–18. https://doi.org/10.1353/pbm.1986.0087
3. Tshitoyan, V., et al. (2019). Unsupervised word embeddings capture latent knowledge from materials science literature. *Nature*, 571, 95–98. https://doi.org/10.1038/s41586-019-1335-8
4. Accelerating scientific discovery with Co-Scientist. (2026). *Nature*, 655, 487–496. https://doi.org/10.1038/s41586-026-10644-y

*Status: Proposed founding text, version 0.1. This document establishes a working vocabulary and research program; it does not assert historical priority over related work or represent a consensus standard.*
