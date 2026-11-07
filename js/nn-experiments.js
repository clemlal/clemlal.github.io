// Guided experiments of the neural network playground
// (teaching/2026_2027_MAPI3_Machine_Learning/neural-networks-playground.html),
// one or more per part of the page. Exposed as window.NN_EXPERIMENTS, and
// the default settings of the playground as window.NN_DEFAULTS.
//
// An experiment has:
//   id, part, title   'II.3', 'II', and its name in the list
//   setup             the settings it loads (the others take NN_DEFAULTS);
//                     stopAt pauses the training at that iteration
//   variants          buttons that reload the setup with some settings changed
//                     ({ label, set }), or run an action ({ label, action })
//   question          asked before running: predict the answer first
//   watch             what to look at while it runs
//   explanation       what happens and why, shown on demand
// Texts are HTML with LaTeX between $…$ (typeset by MathJax).
//
// Every number quoted in an explanation is what the run gives: data,
// initialization and batches are seeded (js/nn-engine.js), so the run in the
// page is the same as the one the text was checked on.

(function () {
  window.NN_DEFAULTS = {
    dataset: 'moons', noise: 0.2, n: 200, randomLabels: false, dataSeed: 1,
    hidden: [8, 8], activation: 'relu',
    lr: 0.1, batch: 16, lambda: 0, seed: 1,
    speed: 5, stopAt: null,
  };

  window.NN_EXPERIMENTS = [
    // ---- Part I. Architectures ----
    {
      id: 'I.1', part: 'I', title: 'No hidden layer: a linear model',
      setup: { dataset: 'circles', noise: 0.1, n: 200, hidden: [], lr: 0.3 },
      variants: [
        { label: 'No hidden layer', set: {} },
        { label: 'One hidden layer of 8 ReLU units', set: { hidden: [8] } },
      ],
      question: String.raw`With no hidden layer, the network is $x \mapsto \mathrm{sm}(Wx + b)$, with $W \in \mathbb{R}^{2 \times 2}$. Can it separate the inner disc from the ring?`,
      watch: 'The boundary, and the training error under the plot.',
      explanation: String.raw`<p>The predicted class is the largest logit, so the boundary is $\{z_1 = z_2\} = \{(w_1 - w_2)^\top x + b_1 - b_2 = 0\}$: a straight line, whatever the training does. This is logistic regression, and no line separates a disc from a ring: the training error stays around $1/2$.</p>
<p>Add a hidden layer of 8 ReLU units: the training error reaches $0$ within a few hundred iterations. The non-linearity, not the number of parameters, is what changed the class $\mathcal{F}$.</p>`,
    },
    {
      id: 'I.2', part: 'I', title: 'Depth without non-linearity',
      setup: { dataset: 'circles', noise: 0.1, n: 200, hidden: [8, 8, 8, 8], activation: 'identity', lr: 0.03 },
      variants: [
        { label: 'σ = identity', set: {} },
        { label: 'Same network with ReLU', set: { activation: 'relu' } },
      ],
      question: String.raw`Four hidden layers of 8 units, but with $\sigma(u) = u$. Does depth help on the circles?`,
      watch: 'The boundary, and the maps of the hidden units (hover over them).',
      explanation: String.raw`<p>Every hidden unit is an affine function of $x$ (its map is a plain linear ramp), and so is the output: a composition of affine maps is affine, $W_2 (W_1 x + b_1) + b_2 = (W_2 W_1) x + (W_2 b_1 + b_2)$. The boundary is the same straight line as without hidden layers, and the training error stays around $1/2$, with $4 \times 8$ units for nothing.</p>
<p>Same architecture with ReLU: zero training error within about 750 iterations. Expressivity comes from <em>alternating</em> affine maps and non-linearities.</p>`,
    },
    {
      id: 'I.3', part: 'I', title: 'What a hidden unit computes',
      setup: { dataset: 'xor', noise: 0.1, n: 200, hidden: [4] },
      variants: [
        { label: 'ReLU', set: {} },
        { label: 'tanh', set: { activation: 'tanh' } },
      ],
      question: String.raw`Four ReLU units for the XOR. What does each of them compute, as a function of $x \in \mathbb{R}^2$?`,
      watch: 'Hover over the four hidden units: what their maps look like, and how the boundary is made of them.',
      explanation: String.raw`<p>A unit of the first layer computes $\sigma(w^\top x + b)$. With ReLU it is a ramp: zero on one side of the line $\{w^\top x + b = 0\}$, growing linearly on the other. The logits are affine combinations of the four ramps, so the boundary is made of pieces of lines, which bend where a unit switches on or off. Zero training error after about 750 iterations.</p>
<p>With tanh, each unit is a smooth step across its line, and the boundary is curved.</p>`,
    },
    {
      id: 'I.4', part: 'I', title: 'ReLU networks are piecewise affine',
      setup: { dataset: 'sine', noise: 0.1, n: 100, hidden: [8], lr: 0.05 },
      variants: [
        { label: 'ReLU', set: {} },
        { label: 'tanh', set: { activation: 'tanh' } },
      ],
      question: 'A regression on a single input, with one hidden layer of 8 ReLU units. What does the fitted curve look like up close, and outside the data?',
      watch: 'The kinks of the curve, marked by ticks under the plot, and the curve in the grey zones, where there is no data.',
      explanation: String.raw`<p>The network is $f(x) = \sum_{j \le 8} \eta_j (w_j x + b_j)_+ + c$: continuous, piecewise affine, with at most one kink per unit, at $x = -b_j / w_j$. Hover over the hidden units: each map is a ramp. A unit whose kink lies outside the data is affine on it, and is wasted there.</p>
<p>Outside the data, the network continues as an affine function: ReLU networks extrapolate linearly. With tanh the fit is smooth and flattens far from the data; note also the plateau of about 2000 iterations before the tanh network starts to fit.</p>`,
    },
    {
      id: 'I.5', part: 'I', title: 'Three classes and the softmax',
      setup: { dataset: 'three', noise: 0.3, n: 300, hidden: [], lr: 0.3 },
      variants: [
        { label: 'No hidden layer', set: {} },
        { label: 'One hidden layer of 8 ReLU units', set: { hidden: [8] } },
      ],
      question: 'Three classes, no hidden layer, three logits. What do the three regions look like?',
      watch: 'Hover over the plot: the tooltip gives the logits and their softmax. The shading fades where the network hesitates.',
      explanation: String.raw`<p>The prediction is $\mathrm{sm}(Wx + b) \in \Delta_2$, a probability vector, and the class with the largest logit wins. The boundary between classes $k$ and $k'$ lies on $\{z_k = z_{k'}\}$, a line, so the three regions are convex and meet at one point. On these overlapping clouds the test error is about $5\%$.</p>
<p>Training with the cross-entropy is maximum likelihood for the model $\mathbb{P}(y = k \mid x) = \mathrm{sm}(Wx + b)_k$: this is multinomial logistic regression. With a hidden layer the boundaries can bend.</p>`,
    },

    // ---- Part II. Optimization and the chain rule ----
    {
      id: 'II.1', part: 'II', title: 'The learning rate',
      setup: { dataset: 'moons', noise: 0.2, n: 200, hidden: [8, 8], lr: 0.1 },
      variants: [
        { label: 'γ = 0.001', set: { lr: 0.001 } },
        { label: 'γ = 0.1', set: { lr: 0.1 } },
        { label: 'γ = 3', set: { lr: 3 } },
      ],
      question: String.raw`Same data, same initialization, three step sizes $\gamma$. Predict the curve of the training risk for each.`,
      watch: 'The risk curves, and the gradient norms under the network.',
      explanation: String.raw`<p>$\gamma = 0.001$: the steps are too small, and after 2000 iterations the training risk is still about $0.38$, against $0.008$ for $\gamma = 0.1$.</p>
<p>$\gamma = 3$: within a few steps, the iterate jumps to a point where every unit of the last hidden layer is zero on every data point. The network is then constant on the data (not away from it: look at the plot), the units are dead (dashed squares), and the gradient in every weight is <em>exactly</em> zero (the bars under the network vanish). The weights never move again, only the output bias does, and the training error stays at $1/2$. Gradient descent did converge to a critical point, which is all that can be guaranteed in general.</p>`,
    },
    {
      id: 'II.2', part: 'II', title: 'Gradient descent and SGD',
      setup: { dataset: 'moons', noise: 0.2, n: 200, hidden: [8, 8], lr: 0.1, batch: Infinity },
      variants: [
        { label: '|B| = 1', set: { batch: 1 } },
        { label: '|B| = 16', set: { batch: 16 } },
        { label: 'Full batch (GD)', set: { batch: Infinity } },
      ],
      question: String.raw`Same step size, batches of $1$, $16$ or all $200$ points. Which run makes the training risk decrease fastest per iteration? Per epoch, that is per pass over the data?`,
      watch: 'The risk curve (smooth or noisy), and the counters of iterations and epochs above the network.',
      explanation: String.raw`<p>An iteration of gradient descent costs $n = 200$ gradients of the loss, an iteration of SGD costs $|B|$. Per iteration, $|B| = 16$ and full batch are almost the same (training risk $0.023$ and $0.022$ after 1000 iterations), but $|B| = 16$ has gone through the data 80 times, against 1000 times for full batch.</p>
<p>With $|B| = 1$ the curve is noisy: the direction is unbiased, $\mathbb{E}_B[\nabla_\theta F^{(B)}] = \nabla_\theta F$, and its variance is what is paid for. Yet after 3000 iterations, that is only 15 epochs, its training risk is $0.02$.</p>`,
    },
    {
      id: 'II.3', part: 'II', title: 'Several runs, several minimizers',
      setup: { dataset: 'moons', noise: 0.1, n: 40, hidden: [8, 8], lr: 0.1, batch: 8, stopAt: 2000 },
      variants: [
        { label: 'Initialization #1', set: { seed: 1 } },
        { label: '#2', set: { seed: 2 } },
        { label: '#3', set: { seed: 3 } },
        { label: '#4', set: { seed: 4 } },
      ],
      question: 'Same data, same architecture, same algorithm: only the random initialization changes. Do the trained networks agree?',
      watch: 'The boundary away from the data points, the training risk and the test risk at iteration 2000.',
      explanation: String.raw`<p>Every run reaches zero training error and a training risk below $0.005$, but the boundaries differ wherever there is no data, and so do the test risks: from $0.08$ (initialization #1) to $0.22$ (#3).</p>
<p>$F$ is not convex and has many (near) minimizers; which one SGD returns depends on where it starts. They do not generalize equally well, which no bound over the whole class $\mathcal{F}$ can see: the explanation has to involve the algorithm (Part IV).</p>`,
    },
    {
      id: 'II.4', part: 'II', title: 'Permutation symmetry',
      setup: { dataset: 'moons', noise: 0.2, n: 200, hidden: [8, 8], stopAt: 1500 },
      variants: [
        { label: 'Permute the hidden units', action: 'permute' },
      ],
      question: 'Once the network is trained, shuffle the units of each hidden layer, carrying their incoming and outgoing weights along. Does the function change?',
      watch: 'The network before and after, the boundary, and the risks to the last digit.',
      explanation: String.raw`<p>The diagram changes, the boundary and the risks do not: permuting the units of hidden layer $l$, with the rows of $W_l$ and $b_l$ and the columns of $W_{l+1}$, leaves $f_\theta$ unchanged. Every minimizer therefore comes with at least $\prod_l (d_l)! = 8! \times 8! \approx 1.6 \times 10^9$ copies here: there is no hope of a unique solution.</p>
<p>Press the button several times: the network is always the same function.</p>`,
    },
    {
      id: 'II.5', part: 'II', title: 'Vanishing gradients',
      setup: { dataset: 'circles', noise: 0.1, n: 200, hidden: [8, 8, 8, 8, 8], activation: 'sigmoid' },
      variants: [
        { label: 'sigmoid', set: {} },
        { label: 'tanh', set: { activation: 'tanh' } },
        { label: 'ReLU', set: { activation: 'relu' } },
      ],
      question: 'Five hidden layers of sigmoid units on the circles. Will it train?',
      watch: 'The gradient norms of the layers, under the network (log scale), and the training error.',
      explanation: String.raw`<p>The backward pass multiplies, layer after layer, by $W_l^\top$ and by $\sigma'(z)$ (backpropagation, Part II). For the sigmoid $\sigma' \le 1/4$, so the gradient shrinks at every layer: at initialization it goes from about $0.3$ for the last layer to a few $10^{-6}$ for the first one. The first layers barely move, and the training error is still $1/2$ after 5000 iterations.</p>
<p>With tanh ($\sigma'(0) = 1$) or ReLU ($\sigma' = 1$ on active units), the same network reaches zero training error within 500 iterations.</p>`,
    },

    // ---- Part III. Universal approximation ----
    {
      id: 'III.1', part: 'III', title: 'One unit, one kink',
      setup: { dataset: 'sine', noise: 0, n: 100, hidden: [3], lr: 0.03, speed: 20 },
      variants: [
        { label: '3 units', set: { hidden: [3] } },
        { label: '8 units', set: { hidden: [8] } },
        { label: '32 units', set: { hidden: [32] } },
      ],
      question: 'One hidden layer of 3, 8 or 32 ReLU units, on a sine with four extrema and no noise. How close can each get?',
      watch: 'The kinks (ticks under the plot) and the training risk.',
      explanation: String.raw`<p>With $m$ units the network is piecewise affine with at most $m$ kinks: 3 kinks cannot follow four extrema. After 5000 iterations the training risk is about $0.19$ with 3 units, $0.004$ with 8, $0.001$ with 32.</p>
<p>This is the theorem of Part III at work: the units are the kinks, and the width needed grows as the accuracy $\epsilon$ improves, like $G(b-a)/\epsilon$ for a $G$-Lipschitz target. The figure of Part III below builds the network of the proof.</p>`,
    },
    {
      id: 'III.2', part: 'III', title: 'Existence is not optimization',
      setup: { dataset: 'kinks', noise: 0, n: 100, hidden: [4], lr: 0.03, speed: 20, stopAt: 6000 },
      variants: [
        { label: '4 units, initialization #1', set: {} },
        { label: '4 units, #2', set: { seed: 2 } },
        { label: '32 units', set: { hidden: [32] } },
      ],
      question: 'The target is piecewise affine with 3 kinks: 4 ReLU units represent it exactly (one per kink, and one for the slope at the left end). Will SGD find that network?',
      watch: 'The training risk: an exact fit means a risk of 0 (there is no noise). Hover over the hidden units.',
      explanation: String.raw`<p>From initialization #1, SGD stalls at a training risk of about $0.06$, with a kink missing: a unit is wasted, and gradient descent sits near a critical point that is not a global minimizer. From #2 it gets much closer ($0.005$ after 6000 iterations), still not exactly.</p>
<p>With 32 units, the training risk falls to $10^{-4}$: the wider network is <em>easier to optimize</em>, although it is not needed for approximation. Universal approximation says that a good $f$ is in $\mathcal{F}$, not that any algorithm finds it.</p>`,
    },
    {
      id: 'III.3', part: 'III', title: 'A hard one: two spirals',
      setup: { dataset: 'spirals', noise: 0.1, n: 300, hidden: [16, 16], lr: 0.1, batch: 8, speed: 20, stopAt: 6000 },
      variants: [
        { label: 'Two layers of 16 units', set: {} },
        { label: 'One layer of 32 units', set: { hidden: [32] } },
      ],
      question: 'Two interleaved spirals. Can two hidden layers of 16 ReLU units separate them, and how long does it take?',
      watch: 'The boundary as it forms, and the units of the second layer: they recombine the half-planes of the first layer.',
      explanation: String.raw`<p>It takes a few thousand iterations: after 6000, the training error is $3\%$ and the test error $4\%$. The first layer only cuts the plane by lines; the second combines these cuts into curved, non-convex regions. Depth, not the complexity of any single layer, is where expressivity comes from.</p>
<p>One hidden layer of 32 units is universal too (Part III), with fewer parameters ($162$ against $354$). After the same 6000 iterations its training risk is $0.27$, against $0.10$ for two layers.</p>`,
    },

    // ---- Part IV. Generalization ----
    {
      id: 'IV.1', part: 'IV', title: 'Overfitting',
      setup: { dataset: 'sine', noise: 0.5, n: 20, hidden: [32, 32], lr: 0.03, speed: 100, stopAt: 20000 },
      variants: [
        { label: 'n = 20', set: {} },
        { label: 'n = 50', set: { n: 50 } },
        { label: 'n = 100', set: { n: 100 } },
        { label: 'n = 200', set: { n: 200 } },
        { label: 'n = 20, λ = 0.01', set: { lambda: 0.01 } },
      ],
      question: String.raw`20 noisy points, a network with $P = 1153$ parameters. What happens to the training risk and to the test risk if we train for long?`,
      watch: 'The two risk curves, and the curve between the data points.',
      explanation: String.raw`<p>The noise has variance $0.2^2 = 0.04$, which is the smallest risk any predictor can have. The training risk goes <em>below</em> it ($0.017$ after 20000 iterations): the network fits the noise. Meanwhile the test risk, which estimates $R(f_\theta)$, climbs from $0.06$ to $0.19$, and the gap $R - \widehat{R}_S$ keeps growing.</p>
<p>The other values of $n$ explore the middle regime, where the network still has many more parameters than data points. The gap after 20000 iterations, against the rate $\sqrt{P/n}$ of the bound of Part IV:</p>
<table class="lab-table">
<tr><th>$n$</th><td>20</td><td>30</td><td>50</td><td>100</td><td>200</td><td>500</td></tr>
<tr><th>$\sqrt{P/n}$</th><td>7.6</td><td>6.2</td><td>4.8</td><td>3.4</td><td>2.4</td><td>1.5</td></tr>
<tr><th>gap $R - \widehat{R}_S$</th><td>0.18</td><td>0.05</td><td>0.02</td><td>0.01</td><td>0.003</td><td>0.005</td></tr>
</table>
<p>The gap does shrink with $n$, but the bound explains neither its size nor its speed. It is vacuous over the whole range: $\sqrt{P/n}$ is larger than the risks themselves (about $0.05$), and it would fall below $0.05$ only for $n > P/0.05^2 \approx 460\,000$, while the network already generalizes well at $n = 100$. Its rate is not the observed one either: from $n = 20$ to $n = 50$, $\sqrt{P/n}$ goes from $7.6$ to $4.8$ while the gap is divided by $8$. And the constant hidden in the $O(\cdot)$, exponential in the depth, only makes things worse. Counting parameters sees that a large class <em>can</em> overfit a small sample, not how well this network actually generalizes.</p>
<p>With $n = 20$ and the penalty $\Omega(\theta) = \lambda \sum_l \|W_l\|_F^2$, $\lambda = 0.01$, the test risk stays near $0.08$ and the gap near $0.03$: regularization reduces overfitting, with the same $P$.</p>`,
    },
    {
      id: 'IV.2', part: 'IV', title: 'Random labels',
      setup: { dataset: 'xor', noise: 0.1, n: 40, randomLabels: true, hidden: [32, 32, 32], lr: 0.1, batch: 8, speed: 20, stopAt: 6000 },
      variants: [
        { label: 'Random labels', set: {} },
        { label: 'True labels', set: { randomLabels: false } },
      ],
      question: 'Every training label is replaced by a fair coin flip, independent of the point. Can the network still reach zero training error?',
      watch: 'The training and test errors under the plot, and the boundary.',
      explanation: String.raw`<p>Yes: after about 4000 iterations the training error is $0$. The network has memorized 40 coin flips, with islands around single points, and its test error is about $0.4$, that is chance level. This is the experiment of Zhang, Bengio, Hardt, Recht and Vinyals (2017) in miniature: the class shatters these points, so a bound of the form $\mathrm{VC}(\mathcal{F})/n$ can only be $\ge 1$. Here $\sqrt{P/n} \approx 7.5$, while the gap of a $0$–$1$ loss cannot exceed $1$: the bound is vacuous.</p>
<p>With the true labels, the same network on the same points also reaches zero training error, and a test error of about $0.035$. Same class, same algorithm, opposite outcomes: what generalizes is not explained by $\mathcal{F}$ alone.</p>`,
    },
  ];
})();
