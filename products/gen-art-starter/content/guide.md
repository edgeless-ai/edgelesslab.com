# Generative Art Starter Kit: The Full Guide

You write the rules. The machine draws the picture. That is the entire premise of generative art, and it has been the entire premise since the 1960s when Vera Molnar started feeding instructions to a mainframe plotter. Sixty years later the tools are better, the machines are faster, and the fundamental creative loop is identical: define parameters, run the algorithm, look at the output, adjust, repeat.

This guide covers the generator families included in the kit, the scoring system that helps you filter output, and the workflow for getting SVG files onto paper with a pen plotter. Everything here comes from running thousands of experiments and printing hundreds of physical pieces. The advice is specific because vague advice is useless.


## What Generative Art Is (and Isn't)

Generative art is algorithmic mark-making. The artist defines a system of rules, and the system produces visual output. The rules might be simple (draw 500 lines at random angles) or complex (simulate two chemicals diffusing across a grid for 10,000 iterations), but the artist's role is always the same: design the system, tune the parameters, and curate the results.

This is not AI art. There are no neural networks, no training datasets, no prompts. Every mark in every output can be traced back to a specific line of code and a specific parameter value. When something looks wrong, you can find out why. When something looks beautiful, you can reproduce it exactly by running the same seed.

The aesthetics of generative art come from constraint. A flow field has a fixed set of rules about how lines follow noise gradients. Within those rules, the output varies enormously depending on noise scale, step length, line count, and seed. The parameter space is where the art lives. The code is the instrument. The parameters are the performance.

One thing that surprises people new to this practice: most generated output is mediocre. A good generator produces maybe 5-10% keeper-quality pieces from any given parameter set. This is normal and expected. The scoring pipeline exists precisely because manual curation at scale is tedious. You generate 500 pieces, score them, look at the top 30, and pick the ones that resonate.

The physical output matters more than the screen rendering. A pen plotter draws with real ink on real paper, and the result has a quality that screen pixels cannot replicate. Slight variations in pen pressure, ink saturation, and paper texture give each physical piece a character that the SVG file only approximates. If you have access to a plotter, use it. The feedback loop between screen and paper will reshape how you design your generators.


## The Generator Pattern

Every generator in this kit follows the same four-step structure:

1. **Set up the canvas.** Define width, height, margins, and output format. All generators here output SVG because SVG is resolution-independent, plotter-compatible, and human-readable.

2. **Define parameters.** These are the knobs you turn: noise scale, line count, step length, recursion depth, fill density. Every parameter changes the output. The defaults should produce a decent result; the interesting work is exploring what happens when you push them.

3. **Run the algorithm.** The core computation. For flow fields, this is tracing lines through a noise field. For reaction-diffusion, it is simulating chemical interactions on a grid. For L-systems, it is expanding a grammar and interpreting the result as drawing instructions.

4. **Export SVG.** Convert the computed geometry into SVG elements (polylines, circles, paths) and write the file. The `svgwrite` library handles this cleanly.

In Python, the pattern looks like this:

```python
def generate(params):
    # Compute geometry
    lines = []
    for i in range(params.num_lines):
        line = trace_line(params)
        lines.append(line)
    return lines

def render(lines, params, output_path):
    dwg = svgwrite.Drawing(output_path, size=(params.width, params.height))
    for line in lines:
        dwg.add(dwg.polyline(points=line, stroke="black", fill="none"))
    dwg.save()
```

Every generator in the kit follows this separation. The generation step produces raw geometry (lists of points, lists of circles, lists of segments). The rendering step converts that geometry to SVG. Keeping them separate means you can swap renderers (SVG, PNG, HPGL for older plotters) without touching the algorithm.

The parameter space deserves more attention than most beginners give it. A flow field generator with 8 parameters has a continuous 8-dimensional space of possible outputs. Most of that space produces garbage. The interesting regions are narrow bands where the parameters interact to produce visual tension: enough complexity to be engaging, enough structure to be coherent. Finding those regions is the real craft.


## Flow Fields

Flow fields are the most versatile generator family. A flow field assigns a direction to every point on the canvas (usually derived from Perlin noise), then traces lines that follow those directions. The result is a set of smooth, organic curves that feel like wind, water, or hair.

The `flow_field.py` generator works like this: for each line, pick a random starting point, then repeatedly step in the direction indicated by the noise field at the current position. Each step moves a fixed distance (`step_length`) in the direction of the noise angle at that point. The line accumulates points until it exits the canvas or reaches the maximum step count.

**Noise scale** is the most important parameter. It controls the spatial frequency of the noise field. Low values (0.001-0.003) produce large, sweeping curves that cross the entire canvas. High values (0.008-0.015) produce tight, turbulent patterns where lines change direction rapidly. The transition between these regimes is where the most interesting output lives.

**Step length** controls the resolution of each curve. Shorter steps (1-2 units) produce smoother curves at the cost of more computation and larger SVG files. Longer steps (4-6 units) give a rougher, more angular quality that some people prefer. For pen plotters, steps of 2-3 units work well because the plotter's own mechanical smoothing fills in the gaps.

**Number of lines** controls density. 200-400 lines give an airy, minimal feel. 800-1200 produces a rich texture. Beyond 2000, the field starts to look solid from a distance, which can be striking in large-format prints but loses detail at normal viewing distances.

**Line length** (num_steps) determines whether curves are short dashes or long ribbons. Short curves (20-40 steps) create a stippled texture. Long curves (100-200 steps) create flowing ribbons that reveal the topology of the noise field. Long curves also tend to bunch up in attractors, which creates natural focal points.

Flow fields are ideal for pen plotters because every line is a single continuous stroke. No lifting, no repositioning, no fill operations. A 1000-line flow field with 80 steps per line takes about 15-25 minutes to plot on an AxiDraw at standard speed. The mechanical quality of the plotter adds a subtle hand-drawn character that makes each physical print unique, even from the same SVG.

For multi-pen work, generate separate flow field layers with different seeds or noise scales. Plot each layer with a different color. The interaction between layers creates depth and color mixing that you cannot predict from the individual SVGs.

A technique worth trying: use a mask to vary line density across the canvas. Instead of distributing starting points uniformly, weight them toward certain regions. A radial gradient mask creates a vignette effect (dense in the center, sparse at the edges). An image-derived mask lets you embed a photographic form inside the flow field. The lines still follow the noise field, but their density encodes a second layer of information. This is how many generative artists create portraits or landscapes using flow field techniques.

Another approach is to vary the noise field itself across the canvas. Instead of a single Perlin noise lookup, blend between two noise functions based on position. The left side of the canvas uses one noise offset, the right side uses another, and the middle blends between them. This creates a visual seam where two different flow regimes meet, which can look like a collision of weather systems or the boundary between two bodies of water.


## Reaction-Diffusion

The Gray-Scott model simulates two chemicals (A and B) on a 2D grid. A is the substrate and B is the catalyst. A is continuously fed into the system; B continuously decays. Where A and B meet, they react: A gets consumed and B gets produced.

The interaction between feeding, killing, diffusion, and reaction produces an astonishing range of patterns from a very simple set of equations:

```
A' = Da * laplacian(A) - A*B*B + f*(1-A)
B' = Db * laplacian(B) + A*B*B - (k+f)*B
```

Two parameters control everything: feed rate (f) and kill rate (k). The entire morphological space of reaction-diffusion patterns lives in a narrow diagonal band of the (f, k) plane. Outside this band, the system either goes to a uniform steady state (boring) or oscillates wildly (also boring).

Inside the band:

- **f=0.035, k=0.065**: Spots. Evenly spaced circular blobs that look like leopard print or the patterns on certain sea shells.
- **f=0.025, k=0.056**: Stripes. Parallel undulating bands reminiscent of zebra markings or sand ripples.
- **f=0.055, k=0.062**: Coral. Branching dendritic structures that look like brain coral or river deltas. This is the classic reaction-diffusion aesthetic.
- **f=0.029, k=0.057**: Maze. Winding labyrinthine paths that fill the entire grid without crossing.

The sensitivity to these parameters is extreme. A change of 0.002 in either f or k can shift the output from spots to stripes to extinction. This is what makes reaction-diffusion both fascinating and frustrating: the interesting region is narrow, and you need patience to explore it.

The `reaction_diffusion.py` generator runs the simulation on a grid (default 200x200), then extracts contour lines from the B concentration field. These contours become SVG polylines. The contour extraction is the key step for plotter output. A raw density map would need to be rasterized, but contour lines are already vector geometry.

**Iteration count** matters. At 2000 iterations, you see early-stage patterns: tentative blobs that haven't fully differentiated. At 8000-10000, the pattern is mature. At 15000+, it reaches a stable equilibrium where further iteration produces no visible change. The sweet spot depends on the (f, k) values, but 8000 is a reasonable default.

**Grid resolution** trades detail against computation time. A 200x200 grid takes about 5 seconds for 8000 iterations on a modern laptop. A 400x400 grid takes 20 seconds. A 600x600 grid takes over a minute. The visual improvement from higher resolution is real but diminishing. 200x200 scaled up 4x in the SVG produces clean output for A4/letter-size prints.

One practical note: the simulation uses periodic boundary conditions (the grid wraps), so patterns at the edges connect seamlessly to patterns on the opposite side. This means the output tiles naturally, which is useful if you want to create larger compositions from repeated units.

The initial conditions also matter more than most people expect. The default generator seeds B concentration in small random square patches. But you can seed with any shape: a circle, a line, a text outline, a hand-drawn form. The reaction-diffusion process will grow outward from those seeds, creating patterns that echo the initial geometry but transform it into something organic. Seeding with the letter "A" does not produce a letter "A" in the output, but it does produce a pattern whose growth history is shaped by that initial condition. The relationship between seed geometry and final pattern is indirect, which makes it a fertile area for experimentation.

For the most dramatic plotter output, extract fewer contour levels (3-4) with thicker line widths (0.8-1.0). This produces bold, graphic contour maps that read well at a distance. More contour levels (8-12) with thin lines (0.3-0.4) create a topographic map aesthetic with fine tonal gradation. Both work. The choice depends on viewing distance and paper size.


## Geometric Patterns

Geometric generators produce output from spatial algorithms: packing, tessellation, subdivision, and recursive decomposition. The aesthetic is more structured than noise-based generators, with clear geometric relationships between elements.

**Circle packing** places non-overlapping circles on the canvas. The algorithm is simple: pick a random point, find the largest circle that fits without overlapping existing circles or the canvas boundary, and keep it if it meets the minimum radius threshold. The result is a dense, organic-looking arrangement where large circles anchor the composition and progressively smaller circles fill the interstitial spaces.

The key parameters are minimum radius (controls the smallest details), maximum radius (controls the largest anchoring circles), and padding (the gap between circles, which should be at least as wide as your pen tip). For pen plotters, a padding of 1.5-2.0 units prevents ink bleeding between adjacent circles.

Circle packing is algorithmically simple but visually satisfying because it creates a natural hierarchy of scale. The eye reads the large circles first, then discovers the smaller ones. On paper, this creates a piece that rewards close viewing.

**Voronoi tessellation** divides the plane into cells, each containing all points closer to a given seed than to any other seed. The edges between cells form a network of polygons. Voronoi diagrams appear everywhere in nature: the pattern of scales on a giraffe, the cracks in dried mud, the cells in a leaf. The kit does not include a Voronoi generator (it requires a computational geometry library like scipy.spatial), but it is a natural extension of the circle packing algorithm if you want to build one.

**Recursive subdivision** starts with a single rectangle and recursively splits it with random cuts. At each level, the algorithm decides whether to split horizontally or vertically (biased toward the longer dimension to avoid extreme slivers), and where to place the cut. Leaf rectangles receive fill patterns: parallel hatching at 45 or 135 degrees, cross-hatching, or dot grids.

The `subdivide.py` generator uses this approach. The interesting parameters are recursion depth (how many levels of splitting), minimum size (the smallest allowed rectangle), and fill chance (what percentage of leaf rectangles get filled vs. left empty). A high fill chance with dense hatching creates a heavy, textured piece. A low fill chance with sparse dots creates something closer to a Mondrian composition.

**Islamic geometric patterns** (zellige) are a special case of geometric generation. They start with a regular tiling (triangles, squares, hexagons), then apply a set of construction rules to create interlocking star-and-rosette patterns. The rules are precise and historically documented. Implementing them is an excellent exercise in understanding how constraints create beauty: the patterns are infinite in extent, symmetric under rotation, and visually complex, but they emerge from a handful of geometric operations applied repeatedly.

A useful reference is Craig Kaplan's doctoral work on Islamic star patterns, which provides algorithmic descriptions of the construction methods. The core idea is "polygons in contact": you place regular polygons at the vertices of a tiling, rotate them to a specific contact angle, and the intersections of their edges define the star pattern. Different contact angles and base tilings produce different pattern families. A 10-pointed star on a decagonal tiling produces the classic Alhambra pattern. An 8-pointed star on a square tiling produces the pattern found on countless mosque doors and fountain surrounds.


## L-Systems

Aristid Lindenmayer invented L-systems in 1968 to model the growth of algae. The formalism turned out to be far more general than its original application.

An L-system is a string rewriting system. You start with an axiom (a string of characters), define production rules that replace characters with longer strings, and iterate. After N iterations, you interpret the resulting string as drawing instructions.

The standard turtle graphics alphabet:

- `F`: move forward and draw
- `G`: move forward and draw (useful as a distinct symbol in rules)
- `+`: turn left by the defined angle
- `-`: turn right by the defined angle
- `[`: save current position and heading (push to stack)
- `]`: restore saved position and heading (pop from stack)

The branching symbols `[` and `]` are what make L-systems powerful for modeling plants. A rule like `F -> F[+F][-F]F` says: draw forward, then branch left and draw, then branch right and draw, then continue forward. After several iterations, this produces a tree-like structure with exponentially increasing branch count.

The five presets in `l_system.py` demonstrate the range:

**Koch curve** (`F -> F+F-F-F+F`, angle 90). The simplest fractal L-system. After 4 iterations, it produces the Koch snowflake variant with a distinctive jagged boundary. Good for understanding the mechanics before moving to more complex rules.

**Sierpinski triangle** (`F-G-G`, with `F -> F-G+F+G-F` and `G -> GG`, angle 120). Recursive triangular subdivision that produces the classic Sierpinski gasket. The two-symbol approach (F and G) allows different replacement rules for different structural roles.

**Plant** (`X -> F+[[X]-X]-F[-FX]+X`, angle 25). The most visually interesting preset. Produces a convincing fern or small tree. The nested brackets create multi-level branching. The 25-degree angle gives a natural lean that avoids the rigid symmetry of 30 or 45 degrees.

**Dragon curve** (`X -> X+YF+`, `Y -> -FX-Y`, angle 90). A space-filling curve that folds back on itself like a piece of paper folded repeatedly and then unfolded at 90 degrees. After 12 iterations, it fills a roughly rectangular region with a single continuous path. Excellent for plotters because the entire piece is one stroke.

**Hilbert curve** (`A -> -BF+AFA+FB-`, `B -> +AF-BFB-FA+`, angle 90). A true space-filling curve that visits every cell of a grid exactly once. The plotter coverage is uniform and dense, making it ideal for creating textured fills or testing ink coverage. 6 iterations fills a square region with a continuous path that has good visual rhythm.

The string length grows exponentially with iterations. The plant preset at 6 iterations produces a string of about 500,000 characters. At 8 iterations, it is over 30 million. The `l_system.py` generator handles this gracefully, but be aware that very high iteration counts will produce SVGs with millions of line segments, which some viewers struggle to render.

Writing your own rule sets is where L-systems become genuinely creative. Start with a simple axiom (`F`) and a single rule. Run a few iterations and look at the result. Then modify the rule by adding branches (`[+F]`), changing the angle, or introducing a second symbol with its own replacement rule. The feedback loop is fast: change a character, regenerate, see the result. Most rules produce uninteresting output (a straight line, a spiral, a tangled mess), but occasionally you hit a rule set that produces something unexpected and structurally rich.

A practical tip: the angle parameter has more influence on the visual character than the rules themselves. The same rule set at 25 degrees looks botanical. At 60 degrees, it looks crystalline. At 90 degrees, it looks architectural. Try your favorite rule set at 15, 25, 45, 60, 72, and 90 degrees before writing new rules.


## Moire and Op Art

Moire patterns emerge from the interference between two overlapping periodic structures. Take two grids of concentric circles, offset their centers by a small amount, and large-scale patterns appear that exist in neither grid individually. The effect is purely optical, created by the interaction of fine-scale regularity.

The `moire.py` generator creates this effect with two overlapping grids (either concentric circles or parallel lines). The primary control is the rotation angle between grids. Even 1-2 degrees of rotation produces visible interference bands. At 5-10 degrees, the bands become tighter. At 45 degrees (for line grids), the effect creates a diamond lattice.

Bridget Riley built an entire career on these principles in the 1960s. Her paintings use precisely controlled interference between geometric elements to create the sensation of movement and depth on a flat surface. The computational version has the advantage of precision: you can specify the rotation to a tenth of a degree and explore the space systematically.

**Spacing** is the second critical parameter. Closer spacing (3-5 units) produces finer patterns with more visible interference. Wider spacing (10-15 units) produces bolder patterns where the individual lines are clearly visible and the moire effect operates at a larger scale.

These pieces print beautifully on pen plotters because the geometry is extremely simple (circles or straight lines), the line density is uniform, and the visual complexity comes entirely from overlap rather than from complex individual paths. A circle-based moire with 8-unit spacing takes about 10 minutes to plot and produces a piece that is far more visually striking on paper than on screen, because the precision of the plotter lines is higher than screen pixel rendering.

For multi-pen color work, plot each grid in a different color. Red and blue grids with a 3-degree offset create a moire pattern with purple interference zones. The color mixing happens optically, and it is worth overplotting a few experiments to learn what your ink colors do when layered.


## Scoring Your Output

A productive generative art workflow generates hundreds of pieces and prints a handful. The gap between those numbers is curation. Manual curation is fine for 20 pieces. For 500, you need automation.

The `score.py` pipeline evaluates each SVG on five signals, each scored 0-20 for a composite 0-100:

**Ink Coverage (0-20)** grids the canvas and counts occupied cells. The ideal range is 15-60% coverage. Below 10%, the piece looks empty. Above 80%, it reads as a solid fill, which defeats the purpose of line-based art. The scoring function uses a bell curve centered at 40% coverage to capture this preference.

**Line Complexity (0-20)** measures total path length and segment count. A piece with 50 short lines scores lower than one with 800 flowing curves. This signal rewards generators that produce substantial drawing content. It also acts as a sanity check: a degenerate output with zero lines scores zero.

**Composition Balance (0-20)** divides the canvas into a 3x3 grid and measures how evenly marks are distributed. Perfect uniformity scores slightly below peak (because it usually indicates a space-filling algorithm with no focal points). Moderate variation (coefficient of variation 0.3-0.6) scores highest. Extreme imbalance (all marks in one quadrant) scores low. This signal catches the common failure mode where a flow field's lines all bunch into one corner because the noise gradient funnels them there.

**Visual Entropy (0-20)** measures variation in mark density using Shannon entropy on a grid of density buckets. High entropy means the piece has areas of different visual weight: some dense, some sparse, some medium. Low entropy means the density is uniform everywhere. Both extremes are less interesting than a piece with tonal range.

**Plot Feasibility (0-20)** evaluates whether a pen plotter can execute the piece cleanly. It penalizes excessive element counts (more than 20,000 elements means a very long plot time), very short segments (sub-millimeter marks that a pen cannot render), and extreme density. This signal is specific to pen plotter output. If you only display on screen, you can ignore it or reduce its weight.

A piece scoring 70+ is typically worth printing. 50-70 is acceptable but probably not the best output from that parameter set. Below 40 usually indicates a parameter problem.

The scoring system is opinionated. It reflects one aesthetic preference, not a universal truth. You should modify the weights and thresholds as you develop your own taste. The value is not in the specific numbers but in the automation: being able to sort 500 pieces by score and look at the top 30 instead of scrolling through all of them.

A common modification is to weight plot feasibility at zero if you only display on screen, and to double composition balance if you care about gallery-ready prints. Another useful modification: add a "uniqueness" signal that compares each piece against the others in the batch and penalizes duplicates. This prevents the scorer from returning 10 pieces that look nearly identical because they came from adjacent seeds.

Batch scoring works well as a shell one-liner:

```bash
for f in output/*.svg; do python scoring/score.py "$f" --json; done | python -c "
import sys, json
results = [json.loads(line) for line in sys.stdin if line.strip()]
for r in sorted(results, key=lambda x: -x[0]['composite'])[:10]:
    print(f\"{r[0]['composite']:3d}  {r[0]['file']}\")
"
```

This generates a ranked leaderboard of your output. The top 10 pieces from a batch of 200 are usually worth examining closely. The bottom 50 are almost never worth looking at.


## Pen Plotter Workflow

The path from SVG to physical drawing has several steps, and each one affects the final result.

**Path optimization.** An SVG file arranges elements in document order, which is usually the order they were generated. This is almost never the optimal drawing order for a plotter. The pen lifts between elements, travels to the start of the next element, lowers, draws, lifts, travels again. Minimizing the total pen-up travel time can cut plot time by 30-50%.

The tool for this is `vpype`, an open-source command-line SVG processor designed specifically for pen plotters. The key commands:

```bash
vpype read input.svg linesort reloop linesimplify write output.svg
```

`linesort` reorders paths to minimize travel distance (nearest-neighbor heuristic). `reloop` adjusts the starting point of closed paths so the pen starts at the point closest to where it already is. `linesimplify` removes redundant points from polylines, reducing file size and plot time without visible quality loss.

For multi-layer work (multiple pen colors), separate your SVG layers before optimization:

```bash
vpype read input.svg forlayer linesort reloop linesimplify end write output_%_name%.svg
```

**Layer separation.** If you want to plot different elements in different colors, generate them as separate SVGs or use SVG groups/layers. Most plotter software (Inkscape with the AxiDraw extension, saxi for AxiDraw) can selectively plot individual layers.

A practical multi-layer workflow: generate a flow field in one color, circle packing in another, and a moire pattern as a background in a third. Plot each layer separately, swapping pens between runs. Registration (alignment between layers) is handled by the plotter's homing position. As long as you do not move the paper or re-home between layers, registration is excellent.

**Paper selection.** Not all paper is equal for pen plotter work.

- **Bristol board** (smooth, 270-400 gsm): The standard choice. Smooth surface gives clean lines. Heavy weight means no buckling. Available everywhere.
- **Hot press watercolor paper** (300 gsm): Slightly textured, which adds character to the lines. Absorbs ink well. More expensive than Bristol.
- **Marker paper** (70 gsm, translucent): Good for drafts and tests. Cheap, but too light for final pieces.

Avoid cold press watercolor paper (too textured, the pen catches on the surface), standard copy paper (too thin, ink bleeds), and glossy photo paper (ink does not adhere).

**Ink and pen selection.** The AxiDraw ships with a Pilot G2 pen, which is serviceable but not optimal. Better options:

- **Sakura Pigma Micron** (0.25-0.5mm): Archival pigment ink. Consistent line width. Available in multiple sizes. The 0.3mm is the workhorse.
- **Staedtler Pigment Liner** (0.2-0.5mm): Similar to Microns, slightly more precise. Good for detailed work.
- **Fountain pens with bottled ink**: Variable line width from pressure changes. More expressive, less consistent. De Atramentis document ink is waterproof and archival.
- **Brush pens** (Pentel Aquash, Kuretake): Dramatic line width variation. Requires careful pressure calibration on the plotter.

For multi-color work, gel pens (Sakura Gelly Roll) and Copic multiliners offer good color range. Water-based inks can bleed on certain papers when layered wet-on-wet, so let each layer dry before plotting the next.

**The AxiDraw and alternatives.** The AxiDraw (by Evil Mad Scientist) is the de facto standard pen plotter for generative art. The V3/A3 model handles up to A3 paper size, has good speed control, and works with a wide range of pens. The software ecosystem is mature.

Alternatives worth considering: the iDraw (a budget AxiDraw clone with decent quality), the Line-us (a small robotic arm with a distinctive wobbly aesthetic), and vintage HP plotters (7475A, 7550A) which use HPGL and have a mechanical precision that modern consumer machines cannot match. If you find a working HP 7550A at a surplus sale, buy it immediately.

**Speed and quality tradeoffs.** Most plotters have adjustable pen speed. Slower speeds (10-20% of max) produce cleaner lines because the pen has more time to deposit ink, and the mechanical vibration is lower. Faster speeds (60-80%) are fine for drafts and tests. For final pieces on good paper, run at 15-25% speed. The difference in line quality is visible to the naked eye, and it is dramatic under magnification. A slow-plotted piece on Bristol board with archival ink is an artifact. A fast-plotted piece on copy paper is a draft. Treat the speed dial as a quality setting, not a productivity setting.


## Parameter Tuning

Every generator has an interesting region in its parameter space where the output has visual tension: complex enough to be engaging, structured enough to be coherent. Finding that region is the core creative act.

**Grid search** is the brute-force approach. Pick two parameters you want to explore, define a range for each, and generate one piece per combination. For example, explore the flow field noise_scale from 0.001 to 0.015 in 8 steps, and num_lines from 200 to 2000 in 8 steps. That is 64 pieces. Score them all, look at the top 10, and you have a map of where the interesting region is for those two parameters.

The limitation of grid search is dimensionality. With 8 parameters, a grid of 5 values per parameter is 5^8 = 390,625 pieces. That is impractical. Grid search works well for 2-3 parameters at a time, with the rest held at reasonable defaults.

**Random sampling** covers the space more efficiently for high-dimensional exploration. Generate random parameter combinations, score them, and look at the top percentile. 200-500 random samples often locate interesting regions faster than an equivalent grid search because they are not constrained to a regular lattice.

A practical approach combines both methods. Start with random sampling across the full parameter range to identify promising regions. Then do a grid search within those regions to find the exact sweet spots.

**The "interesting region"** for each generator:

- **Flow fields**: noise_scale 0.003-0.008, num_lines 400-1500, num_steps 60-150. Below this range, the output is too smooth and uniform. Above it, the output is chaotic noise.
- **Reaction-diffusion**: f 0.020-0.060, k 0.050-0.066. The interesting band is roughly 0.01 units wide in both dimensions. Use the preset values as starting points and explore in increments of 0.002.
- **Circle packing**: min_radius 1-5, max_radius 30-100, padding 1-3. The visual character changes most with min_radius (smaller = more detailed fill) and padding (tighter = denser, more organic).
- **Moire**: rotation 1-8 degrees, spacing 4-12. The interaction between these two parameters controls the scale and density of the interference pattern.
- **L-systems**: iteration count is the primary knob. Each additional iteration roughly doubles or triples the visual complexity (depending on the rule set). The plant preset at 5 iterations is minimal; at 7, it is lush; at 8, it overflows.
- **Subdivision**: max_depth 3-7, fill_chance 0.3-0.8, hatch_spacing 3-8. Deeper recursion with sparse fill creates a delicate, architectural quality. Shallow recursion with dense fill creates bold, graphic compositions.

**Bottleneck analysis.** When a generator is not producing good output, the problem is usually one of three things:

1. **Too uniform.** Every part of the output looks the same. Increase variation by adding randomness to a parameter that is currently fixed, or by using a noise field to modulate a constant.

2. **Too chaotic.** No coherent structure is visible. Reduce noise frequency, increase smoothing, or decrease the number of elements.

3. **Bad composition.** The marks are all in one area, or the density is wrong, or the piece has no focal point. This is the hardest to fix algorithmically because composition is an aesthetic judgment. The scoring pipeline helps catch gross failures, but for fine-grained composition control, you need to add spatial biases to your generator (attractors, density masks, or weighted seeding).

When you find parameters that produce good output, save them. The JSON preset files in this kit exist for exactly that reason. A parameter set that produces one good piece will produce many good pieces with different random seeds. Building a library of tuned presets is more valuable than constantly searching for new ones.

**Seed management.** Every generator accepts a random seed. When you find an output you like, record its seed. A seed plus a parameter set is a complete reproduction recipe. Store these in a JSON file alongside the SVG. Six months from now, when you want to reprint a piece or generate it at a different resolution, you will be glad you kept the seed.

A workflow that works well: generate 100 pieces with sequential seeds (1-100), score them, identify the top 10, and save those seed-parameter pairs. Then do a targeted exploration around those parameters with new seeds. This iterative narrowing is faster than pure random search and more thorough than manual tweaking.

**When to stop tuning.** There is a point of diminishing returns where further parameter adjustment produces marginal improvements. You will know you have found a good parameter set when the top-scoring outputs from different seeds are all distinct but all appealing. At that point, stop adjusting parameters and start generating volume. The variation between seeds, within a good parameter set, is where the best individual pieces come from.

The final piece of advice is about volume. Run your generators thousands of times. Score everything. Print the best. The ratio of generated to printed should be at least 50:1. The generators are fast; the paper is cheap; the surprising piece that you never would have designed intentionally is worth all the mediocre ones that came before it.
