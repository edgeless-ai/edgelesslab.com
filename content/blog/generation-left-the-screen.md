---
slug: generation-left-the-screen
title: "Generation Left the Screen"
description: Two and a half years ago, AI video was the story. Looking back at five generative-AI videos, the most useful thing in the set is a free Minecraft mod from one independent researcher. Here's what that says about where generation went next.
date: '2026-10-02'
tags:
- Generative AI
- AI Infrastructure
- Palworld
- Minecraft
- Research
readTime: 7 min
editorial: true
---

# Generation Left the Screen

*A look back at five generative-AI videos, four from early 2024 and one from July 2026, read with what we know as of October 2026.*

This isn't a news roundup. Four of the five videos here came out between January and May 2024: Wes Roth on [Palworld](https://www.youtube.com/watch?v=JozOhAPitms), on [OpenAI's Sora preview](https://www.youtube.com/watch?v=1Xo7CmkrSVQ), on [the Sora artist showcase and Hollywood demos](https://www.youtube.com/watch?v=nKlb1ygfYxk), and on [the Astribot S1 robot](https://www.youtube.com/watch?v=wjnPvD7MgTI). The fifth, Two Minute Papers on [infinite diffusion terrain in Minecraft](https://www.youtube.com/watch?v=Ae9q7KsRbuI), came out in July 2026. Watched together, with hindsight, they show where the hype pointed, where the work landed, and which fears were the right ones.

## 1. The pattern: generation is moving from media into worlds and bodies

Taken together, the five videos trace one arc. Generative models started with flat media and kept reaching for things that have structure, persistence, and physics.

- **Video as a stand-in for a world.** When OpenAI previewed Sora in February 2024, it described the model as [a diffusion transformer working on "spacetime patches" of video](https://openai.com/index/video-generation-models-as-world-simulators/). The research page's title made a bigger claim: "Video generation models as world simulators." The body text is more careful. It says the results "suggest" that scaling video generation is "a promising path" toward general-purpose simulators of the physical world. That's a hypothesis, and researchers [have been arguing about it since](https://arxiv.org/abs/2405.03520).
- **Worlds you can walk around in.** The Two Minute Papers video covers a SIGGRAPH 2026 paper by a single independent researcher, Alexander Goslin ([arXiv:2512.08309](https://arxiv.org/abs/2512.08309)). His method, InfiniteDiffusion, extends an earlier technique that blends overlapping diffusion windows so the windows aren't confined to a fixed canvas. Terrain can extend indefinitely, stays the same for a given seed, and can be looked up at any point in constant time. Constant time is per lookup. Total compute still grows as you explore more ground.
- **Game worlds and what's in them.** Palworld became the lightning rod for "AI-made game" anxiety in early 2024. Section 2 covers what that accusation turned out to be worth.
- **Bodies.** The Astribot S1 video is about where generation goes next: models that output motion instead of pixels.

How the Sora story ended shows the arc most clearly. In March 2026 OpenAI [said it would discontinue Sora](https://www.pcmag.com/news/that-was-fast-openai-to-shut-down-sora-video-generator-app). It cited compute demand and said the Sora research team would keep working on world simulation "to advance robotics." The web and app versions closed on April 26, 2026 ([OpenAI Help Center](https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation)). The API [shut down on September 24, 2026](https://developers.openai.com/api/reference/python/resources/videos/methods/list), and OpenAI says there is no one-to-one replacement. The product is gone. Its research thesis is now pointed at bodies.

## 2. Two takes the videos set against each other

### The optimistic take: tools in more hands

The strongest case for generative AI in this set isn't the flashiest one. Goslin's terrain work shipped as [a free, MIT-licensed Minecraft mod](https://github.com/xandergos/terrain-diffusion-mc), also on [Modrinth](https://modrinth.com/mod/terrain-diffusion). The repo lists about 1.5 GB of VRAM and a one-time model download of roughly 2.5 GB. One person built a peer-reviewed method and released it in a form players can run at home. That's "tools empower individuals" in its most concrete form.

The paper is candid about its limits, and they're worth repeating. Because it generates in windows, scattered lookups across uncached regions are inefficient. Minecraft features that depend on long-range biome searches, `/locate biome` and explorer maps, aren't supported. That candor is part of what makes the work credible.

The Sora showcase makes the same argument with more spectacle. In March 2024, OpenAI [released short films that visual artists and directors made with Sora](https://arstechnica.com/ai/2024/03/openai-shows-off-sora-ai-video-generator-to-hollywood-execs), along with their first impressions. The usual optimistic reading compares it to the printing press: a tool lowers the cost of producing a medium, so more people get to make things in it. That's an interpretation, not a finding. The Hollywood angle needs precision too. The FT, as reported by Ars Technica, described Sam Altman's studio meetings as demos, not partnership talks. "There have been no meetings with OpenAI about partnerships," one studio executive said. "They've done demos."

Two and a half years on, the two halves of the optimistic case look very different. The open, single-author tool is still downloadable today. The closed, compute-hungry platform that artists were invited to try is gone. If tools empower people, it matters whether the tool is one they get to keep.

### The anxious take: labor, copyright, and autonomy

The Palworld video's title calls it a "$100,000,000 AI game." Neither half of that holds up.

- **The money.** We found no primary source for a $100 million figure. What's documented is [over 4 million copies in its first weekend](https://www.videogameschronicle.com/news/palworld-hits-more-concurrent-steam-players-than-any-paid-game-in-history), [5 million in three days](https://www.techradar.com/gaming/trigger-happy-pokemon-alike-palworld-passes-5-million-sales-and-12-million-concurrent-steam-users), and [6 million in four days](https://www.ign.com/articles/palworld-overtakes-counter-strike-to-become-the-second-most-played-game-ever-on-steam), all as reported by Pocketpair. That's an enormous launch. It isn't the number in the title.
- **The "AI" part.** Artists accused developer Pocketpair of using generative AI. The evidence was circumstantial: the CEO's 2021–2022 posts about early AI image tools, and a 2022 party game built around AI art. At the time, Forbes reported that hard evidence [did not exist](https://www.forbes.com/sites/paultassi/2024/01/22/palworld-accused-of-using-genai-with-no-evidence-so-far). In 2026, Pocketpair's head of publishing said the studio [rejects generative AI](https://www.notebookcheck.net/Palworld-developer-Pocketpair-rejects-generative-AI.1325581.0.html) for its upcoming games.

The artists' anxiety was real even though this particular accusation was never proven, and the difference matters. Training on unlicensed work, unclear provenance, and studios cutting illustration budgets are legitimate concerns. Palworld became the target because it was successful and looked derivative, not because anyone showed how it was made.

The legal fight that did happen was about patents, not AI. In September 2024, Nintendo and The Pokémon Company [sued Pocketpair](https://www.nintendo.co.jp/corporate/release/en/2024/240919.html) in the Tokyo District Court for patent infringement. The patents cover mechanics such as capturing and riding creatures. Pocketpair [says the claim asks for an injunction plus 5 million yen in damages to each plaintiff](https://www.pocketpair.jp/en/news/report-on-patent-infringement-lawsuit/). By June 2026 the case [appeared to have narrowed to older versions of the game](https://www.nintendoreporters.com/en/news/general/nintendos-palworld-lawsuit-now-appears-limited-to-older-versions-as-palworld-10-moves-forward), and the court opinion is expected on November 9, 2026. Meanwhile Palworld [spun its IP into a joint venture with Sony Music and Aniplex](https://www.prnewswire.com/news-releases/sony-music-aniplex-and-pocketpair-announce-joint-venture-palworld-entertainment-inc-to-expand-the-breakout-game-palworld-302193445.html) and [left Early Access with its 1.0 release on July 10, 2026](https://www.pocketpair.jp/en/game-news/palworld-1-0-july-10-cinematic-trailer-revealed/).

The robot video plays on a different fear: machines acting on their own. The details cut against the headline here too.

- **Astribot S1.** Spec listings [describe](https://www.aparobot.com/robots/astribot-s1) the S1 as capable of fully autonomous operation without teleoperation. That claim traces back to the vendor; we found no independent test of it. Astribot's own product page also sells [VR teleoperation](https://www.astribot.com/en/product/) for training. The headline 10 m/s figure is arm-movement speed. The S1 is a stationary, upper-body manipulation platform with no current locomotion. The tablecloth pull and the calligraphy are impressive manipulation. They don't show a fast-moving autonomous humanoid.
- **The flamethrower robot dog** covered alongside it, Throwflame's Thermonator, is sold with [remote operation over WiFi and Bluetooth](https://throwflame.com/products/thermonator-robodog/). It isn't autonomous.
- **The AI-flown F-16.** DARPA's [ACE program](https://www.darpa.mil/node/3697) did fly an AI-controlled X-62A against a human-piloted F-16 in within-visual-range engagements. [Safety pilots were on board](https://defensescoop.com/2024/04/17/darpa-ace-ai-dogfighting-flight-tests-f16/) and could take over.

For skeptics, the awkward part is that the autonomy trend has kept moving since the video. In July 2026, DARPA and the US Air Force [began test-flying an AI-controlled F-16](https://www.darpa.mil/news/2026/darpa-us-air-force-fly-ai-controlled-f-16) under a new program. In August, Lockheed Martin [reported 27 AI-controlled intercepts](https://news.lockheedmartin.com/2026-08-04-Skunk-Works-R-Advances-Sensor-Powered-AI-Fighter-Intercept) against a live target using real sensor data. In our reading, the 2024 video picked the wrong robot to worry about (the one doing calligraphy) but got the direction right.

**Fair to both sides:** technologists are right that the copyright panic picked a weak test case and that the robot demos were oversold. Artists and skeptics are right that disclosure norms were thin and still are, and that autonomy in high-stakes systems is moving faster than the public debate about it. Both can be true.

## 3. What it means for our stack, and for you

Our takeaway from this set: **prefer generation you can run, inspect, and disclose.**

- **Owning the tool beats renting it.** Sora's shutdown is a warning for anyone building a workflow on a closed generative API. Our own generative-art work runs on procedural generators we wrote and control. When we evaluated an image-to-video prototype, the post-processing pipeline we already own was the cheap part. The generation step is still a call to an external model, and that's the dependency Sora's shutdown says to plan for. The terrain mod points the other way: a method you can read in a paper and run on a consumer GPU.
- **Windowed diffusion is a pattern, not just a Minecraft trick.** Blending overlapping windows with constant cost per lookup could apply to any large generated space, such as maps, textures, or long-form generative art. That's our inference. The paper demonstrates it on terrain.
- **Disclose by default.** We keep a draft internal policy on generative-AI disclosure modeled on Steam's disclosure requirement. If an asset is AI-generated, say so, and don't ship derivatives of third-party copyrighted work. That makes an accusation like the one aimed at Pocketpair easy to answer, and it respects the artists, whose concern was legitimate even when their target was wrong.
- **Read claims at the right resolution.** Two of these five videos led with claims that shrank under checking: a revenue number in one, and a speed figure plus an autonomy claim in the other. Our rule is that a capability claim names its source, its date, and its scope, or we don't repeat it.

## 4. Watch this one, then build

If you watch only one of the five, make it Two Minute Papers' ["Minecraft Was Missing One Brilliant Idea"](https://www.youtube.com/watch?v=Ae9q7KsRbuI). Then:

1. Install the [free Terrain Diffusion mod](https://modrinth.com/mod/terrain-diffusion). It needs Fabric and about 1.5 GB of VRAM.
2. Create two worlds with the same seed and check that the terrain matches. That's the seed-consistency claim, tested by you.
3. Run `/td-explore` to open the mod's map, and find a mountain range nobody placed by hand.

If you build something with it, or find where it breaks, reply and tell us what you found.
