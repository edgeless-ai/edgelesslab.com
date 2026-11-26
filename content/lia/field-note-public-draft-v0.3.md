---
slug: building-an-instrument-that-can-say-no
title: Building an Instrument That Can Say No
description: A research-method field note about reading artifacts without turning a pattern into an unsupported story.
date: '2026-11-18'
tags:
- Research
- Methodology
- Digital Humanities
readTime: 7 min
editorial: true
---

*Latent Information Archaeology — an Edgeless Lab research program.*

A pattern is not yet an explanation. A spelling, a mark in clay, or a repeated source-code idiom can invite a story about the person who made it. The harder question is whether the evidence supports that story rather than another one.

Latent Information Archaeology, or LIA, is our proposal for asking that question across artifact types. This field note presents a working vocabulary and a reading of published examples, **not a report of a new empirical discovery**. Its ambition is an instrument that can help a claim be earned, bounded, or refused. Whether that instrument adds value beyond existing methods remains a question to test, not an achievement announced here.

## What “latent information” means here

Our working definition concerns dependence in *how* content is realized, given specified content and production conditions. “Dependence” means a statistical relationship: learning something about one variable changes what can be predicted about another. It does not mean that a maker intended to communicate. Information theory supplies distinctions between statistical dependence and recoverability; it does not, by itself, identify a historical maker's intention. Scarlett and Cevher's [guide to Fano's inequality](https://arxiv.org/abs/1901.00555) explains how information quantities can bound estimation error under explicit assumptions.

We therefore propose keeping several questions separate. What variation do we observe? Which production choices were actually available? Which person, tool, or process made them? What happened between production and observation? Is the target we want to predict defined independently of the features used to predict it?

The working rule is simple:

> Dependence is not discretion. Variation is not capacity. Information is not necessarily communication.

This is a methodological caution, not a theorem unifying every artifact. Our proposed record would distinguish observed diversity, association, residual uncertainty, historically feasible choices, and any separately justified communication model. It would also name selection and measurement stages instead of treating the present-day file as an untouched witness to production.

## Start with what other fields already know

The justification for this vocabulary cannot be that artifacts have never been studied this way. The following examples are published prior art, not LIA findings. They also show why the details of a particular medium matter.

**Cuneiform writing.** Mathilde Touillon-Ricci's [2022 thesis](https://soas-repository.worktribe.com/output/377701) studies individuality and identity in Ur III and Old Assyrian writing through material and palaeographic features, including sign variants, writing sequence, layout, and script density. That is a concrete antecedent for studying realization alongside documentary content. It is not a warrant for assigning every layout difference to an individual scribe.

**Greek-vase ornament.** Peter Durham's [1996 thesis on archaeological classification](https://eprints.soton.ac.uk/459924/1/229515.pdf) includes computational analysis of Attic black-figure ornament using shape measurements, principal components, and clustering in relation to existing painter attributions. Those attributions are part of the study's evidential situation, not independently established ground truth merely because a numerical method uses them. This is prior art for a bounded shape-classification question, not proof of an unrestricted personal signature.

**Spelling under printing constraints.** William S. Kable's [1967 study of Jaggard's Compositor B](https://xtf.lib.virginia.edu/xtf/view?docId=StudiesInBiblio%2FuvaBook%2Ftei%2Fsibv020.xml;chunk.id=vol020.12;toc.depth=1;toc.id=;brand=default) examines spelling and line justification in the Pavier quartos. Justification means adjusting a line of type to its required width. His conclusion explicitly warns against spelling-based compositor analysis that ignores this influence; he also cautions against extending the specific findings into general rules without further investigation. The lesson is not simply “spelling reveals a compositor.” It is that a production constraint can alter the very feature used for attribution.

**Practices in collaborative documents.** [Tracing the Use of Practices Through Networks of Collaboration](https://doi.org/10.1609/icwsm.v11i1.14870) studies syntactic signatures of practices, including LaTeX macros, and constructs inheritance graphs through collaboration. This offers a precedent for tracing practices in document collections. Our narrower reading is that a network pattern alone should not be treated as an identified causal transmission mechanism: a proposed explanation must still address shared circumstances and alternative routes of influence.

These studies need not share one mechanism to be useful together. Their differences are part of the evidence. A proposed cross-domain framework earns its keep only if it improves a specified task compared with the field's existing approaches.

## The observer is part of the problem

The surviving collection and the searchable representation are different objects of study.

For **survival**, Jonathan Green's [public account of his work with Frank McIntyre and Paul Needham](https://researchfragments.blogspot.com/2011/10/shape-of-incunable-survival.html) explains why a simple independent-coin-toss model fails to describe the observed survival of early printed editions. That account motivates caution about treating today's surviving books as a transparent sample of the historical book world. It does not supply known inclusion probabilities for an arbitrary missing corpus.

For **digitization**, [Bias and representativeness in digitized newspaper collections](https://doi.org/10.1093/llc/fqac037) examines hidden collection biases and proposes an environmental scan. Selection into a digital collection is a separate issue from an object's earlier survival. Neither issue disappears just because a dataset is large.

For **transcription**, [Machine Reading the Primeros Libros](https://dhq.digitalhumanities.org/vol/10/4/000268/000268.html) examines the interpretive effects of optical character recognition, or OCR, in a particular collection of early printed books. OCR is not just a neutral window onto printed marks. This supports a bounded concern about measurement and representation; it does not establish a universal law that every observer progressively removes information in the same order.

LIA's proposed practice is to specify the transformation being studied. Comparing an image, a transcription, and a normalized text requires a declared target. A representation useful for reading words need not preserve the features useful for studying printing.

## Attribution is not identity, and identity is not agency

Source-code research makes the distinction particularly visible. [Supervised Authorship Segmentation of Open Source Code Projects](https://petsymposium.org/popets/2021/popets-2021-0080.php) studies attribution of subtrees and authorship-change edges in an abstract syntax tree: a representation of a program's syntactic structure. This is direct precedent for studying authorship boundaries within code, not only whole-file labels. The paper also identifies privacy risks to anonymous programmers.

A repository record answers a different question. The [Git blame documentation](https://git-scm.com/docs/git-blame) describes annotation by the revision and author that last modified a line, with options affecting movement and copying detection. We should not silently promote that record into an independent label for the person who originally devised or typed every part of the code.

Our proposed reporting rule is to name the proxy precisely. If the evidence identifies a last-modifying commit, say that. If the causal producer is unknown, retain “unknown.” This note does not identify anonymous people, reproduce account-level examples, or offer a deanonymization procedure.

## A real analogy can still be old

The temptation to claim a newly discovered bridge is not limited to the humanities. Ashcroft and Galla's [Pattern formation in individual-based systems with time-varying parameters](https://arxiv.org/abs/1308.6101) already studies finite-time sweeps across symmetry-breaking transitions, including an opinion-dynamics model, using analysis and simulations. It relates the resulting patterns to the Kibble–Zurek scenario: the dependence of emerging domain structure on how quickly a system passes through a transition.

Our inference from that precedent is deliberately limited. A new majority-vote implementation would need to demonstrate what it adds; the existence of a physics-to-opinion-model analogy is not itself a fresh contribution. The cited work does not establish a model of human agreement, nor does this note report a new simulation or validate a social application.

A useful refusal here is not “the analogy is false.” It is “the novelty claim has not been earned.”

## What an instrument would have to demonstrate

We propose evaluating LIA as an audit method, not validating it by counting how often it refuses a claim. A comparison would need a specified task, explicit alternative review methods, and outcomes decided independently of the vocabulary being tested. For an artifact-level inference, the evidence would need a declared representation, a defensible production situation, independent target labels where required, and a record of relevant selection and measurement limits.

Those are proposed requirements, not results presented here. This note establishes no new historical mechanism, intentional encoding, usable channel capacity, cross-domain transportability, or privileged territory for discovery. It does not make aggregate claims about private experiments or ask the reader to trust inaccessible review receipts.

The aim is narrower, and still worth testing: an instrument that notices the choices inside an artifact without forcing them to confess, and that can say no to a stranger's story and to its own.
