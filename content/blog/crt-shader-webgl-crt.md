---
slug: crt-shader-webgl-crt
title: A Multi-Pass CRT Effect for the Browser
description: A look at crt-shader's WebGL rendering pipeline, its adapters, and the tradeoffs of adding a simulated tube display to a web project.
date: 2026-09-28
tags:
- WebGL
- Shaders
- Creative Coding
- Generative Art
readTime: 4 min
---

# A Multi-Pass CRT Effect for the Browser

A convincing cathode-ray tube (CRT) effect is more than a set of dark stripes. The display's apparent character comes from several effects acting together: the treatment of the signal, scanlines, the pixel mask and the way light spreads across the screen.

[crt-shader](https://github.com/OutThisLife/crt-shader), by Brooklyn, is an open-source project for bringing that look to WebGL 2. Rather than a single fragment shader, it uses multiple rendering passes. Its documented effects include signal filtering, brightness-dependent scanlines and display optics; the `reference` preset includes bloom and curvature. There's also a [live demonstration](https://crt-shader.vercel.app/).

## Where it fits

The project offers adapters for plain JavaScript, React and Three.js, including a pass for an existing post-processing chain. That makes it a useful candidate when you already have an image or a rendered scene and want the screen itself to become part of the composition. Check the repository's current documentation and version before integrating it: a rendering dependency is an API you will need to maintain.

In a local trial of version 1.0.1, we found the reference preset more promising on bold generative images and simple 3D forms than on text-heavy pages. The simulated grille made small type harder to read, while dark detail and motion could need extra attention. The effect is a visual choice with an accessibility cost, not a default treatment for every surface.

## A useful constraint

Keep the original content readable and test the effect at the size and resolution at which people will actually see it. If a visitor needs to read a control or a paragraph, the CRT treatment should not make that task harder. Use the effect to support the work, not to turn the work into evidence that an effect was used.
