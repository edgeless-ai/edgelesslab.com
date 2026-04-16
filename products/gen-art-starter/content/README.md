# Generative Art Starter Kit

Six production generators, a scoring pipeline, and a 5,500-word guide covering everything from flow fields to pen plotter output optimization.

## What's Inside

```
guide.md                        Full guide (~5,500 words)
generators/
  flow_field.py                 Perlin noise flow field generator
  reaction_diffusion.py         Gray-Scott reaction-diffusion
  circle_packing.py             Circle packing with collision detection
  moire.py                      Moire interference patterns
  l_system.py                   L-systems with 5 presets
  subdivide.py                  Recursive subdivision with fill patterns
  requirements.txt              Python dependencies
scoring/
  score.py                      Automated SVG scoring (0-100)
examples/
  flow-field-params.json        5 flow field presets
  reaction-diffusion-params.json 4 reaction-diffusion presets
  batch-generate.sh             Generate all patterns in one shot
output/                         Default output directory
```

## Prerequisites

- Python 3.10+
- pip (for installing dependencies)
- Optional: a pen plotter (AxiDraw, iDraw, or similar) for physical output

## Quick Start

Install dependencies:

```bash
cd generators
pip install -r requirements.txt
```

Generate your first piece:

```bash
python generators/flow_field.py
```

That's it. Open `output/flow_field.svg` in your browser or Inkscape. The whole thing takes about two seconds.

## Generate Everything

```bash
chmod +x examples/batch-generate.sh
./examples/batch-generate.sh
```

This runs every generator with default parameters and drops SVGs into `output/`.

## Score Your Output

```bash
python scoring/score.py output/flow_field.svg
```

Returns a 0-100 composite score based on ink coverage, complexity, composition, entropy, and plot feasibility. Use this to filter large batches down to the pieces worth printing.

## Reading the Guide

`guide.md` covers the theory, the technique, and the workflow behind each generator. Start there if you want to understand why the code works the way it does, or if you want to build your own generators from scratch.

## License

For personal and commercial use. You own everything you generate. Do not redistribute the kit itself.
