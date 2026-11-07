// Guided experiments of the neural network playground (js/nn-playground.js) on
// teaching/2026_2027_SID_Advanced_Statistical_Learning/reseaux-de-neurones.html,
// in French. Exposed as window.NN_EXPERIMENTS, with the default settings
// (window.NN_DEFAULTS) and the titles of the parts (window.NN_PARTS).
//
// Same format as js/nn-experiments.js (the English page of MAPI3), whose
// setups most of these experiments share; B.1 (identical initialization) and
// the early stopping of D.1 are new. Every number quoted in an explanation is
// what the run gives: data, initialization and batches are seeded
// (js/nn-engine.js), and the numbers were computed by replaying each variant
// with the engine.

(function () {
  window.NN_DEFAULTS = {
    dataset: 'moons', noise: 0.2, n: 200, randomLabels: false, dataSeed: 1,
    hidden: [8, 8], activation: 'relu', init: 'random',
    lr: 0.1, batch: 16, lambda: 0, seed: 1,
    speed: 5, stopAt: null,
  };

  window.NN_PARTS = { A: 'A. Architectures', B: 'B. Entraînement', C: 'C. Approximation', D: 'D. Généralisation' };

  window.NN_EXPERIMENTS = [
    // ---- A. Architectures ----
    {
      id: 'A.1', part: 'A', title: 'Sans couche cachée : un modèle linéaire',
      setup: { dataset: 'circles', noise: 0.1, n: 200, hidden: [], lr: 0.3 },
      variants: [
        { label: 'Sans couche cachée', set: {} },
        { label: 'Une couche cachée de 8 ReLU', set: { hidden: [8] } },
      ],
      question: String.raw`Sans couche cachée, le réseau est $x \mapsto \mathrm{sm}(Wx + b)$, avec $W \in \mathbb{R}^{2 \times 2}$ : c'est la régression logistique. Peut-il séparer le disque intérieur de l'anneau ?`,
      watch: 'La frontière, et l’erreur d’entraînement sous la figure.',
      explanation: String.raw`<p>La classe prédite est celle du plus grand logit, donc la frontière est $\{z_1 = z_2\} = \{(w_1 - w_2)^\top x + b_1 - b_2 = 0\}$ : une droite, quoi que fasse l'entraînement. Aucune droite ne sépare un disque d'un anneau, et l'erreur d'entraînement reste vers $1/2$.</p>
<p>Avec une couche cachée de 8 unités ReLU, l'erreur d'entraînement atteint $0$ en quelques centaines d'itérations. C'est la non-linéarité, pas le nombre de paramètres, qui a changé la classe $\mathcal{F}$.</p>`,
    },
    {
      id: 'A.2', part: 'A', title: 'De la profondeur sans non-linéarité',
      setup: { dataset: 'circles', noise: 0.1, n: 200, hidden: [8, 8, 8, 8], activation: 'identity', lr: 0.03 },
      variants: [
        { label: 'σ = identité', set: {} },
        { label: 'Même réseau avec ReLU', set: { activation: 'relu' } },
      ],
      question: String.raw`Quatre couches cachées de 8 unités, mais avec $\sigma(u) = u$. La profondeur aide-t-elle sur les cercles ?`,
      watch: 'La frontière, et les cartes des unités cachées (survolez-les).',
      explanation: String.raw`<p>Chaque unité cachée est une fonction affine de $x$ (sa carte est une rampe), et la sortie aussi : une composée d'applications affines est affine (exercice 3.1). La frontière est la même droite que sans couche cachée, et l'erreur d'entraînement reste vers $1/2$, avec $4 \times 8$ unités pour rien.</p>
<p>Même architecture avec ReLU : erreur d'entraînement nulle en 750 itérations environ. L'expressivité vient de l'<em>alternance</em> d'applications affines et de non-linéarités.</p>`,
    },
    {
      id: 'A.3', part: 'A', title: 'Ce que calcule une unité cachée',
      setup: { dataset: 'xor', noise: 0.1, n: 200, hidden: [4] },
      variants: [
        { label: 'ReLU', set: {} },
        { label: 'tanh', set: { activation: 'tanh' } },
      ],
      question: String.raw`Quatre unités ReLU pour le XOR. Que calcule chacune d'elles, comme fonction de $x \in \mathbb{R}^2$ ?`,
      watch: 'Survolez les quatre unités cachées : leurs cartes, et la façon dont la frontière en est faite.',
      explanation: String.raw`<p>Une unité de la première couche calcule $\sigma(w^\top x + b)$. Avec ReLU, c'est une rampe : nulle d'un côté de la droite $\{w^\top x + b = 0\}$, croissante linéairement de l'autre (la figure du neurone, partie 1). Les logits sont des combinaisons affines des quatre rampes, donc la frontière est faite de morceaux de droites, qui se cassent là où une unité s'allume ou s'éteint. Erreur d'entraînement nulle après 750 itérations environ.</p>
<p>Avec tanh, chaque unité est une marche douce à travers sa droite, et la frontière est courbe.</p>`,
    },
    {
      id: 'A.4', part: 'A', title: 'Un réseau ReLU est affine par morceaux',
      setup: { dataset: 'sine', noise: 0.1, n: 100, hidden: [8], lr: 0.05 },
      variants: [
        { label: 'ReLU', set: {} },
        { label: 'tanh', set: { activation: 'tanh' } },
      ],
      question: 'Une régression sur une seule variable, avec une couche cachée de 8 unités ReLU. À quoi ressemble la courbe de près ? Et en dehors des données ?',
      watch: 'Les coudes de la courbe, marqués par des traits sous la figure, et la courbe dans les zones grises, sans données.',
      explanation: String.raw`<p>Le réseau est $f(x) = \sum_{j \le 8} \eta_j (w_j x + b_j)_+ + c$ : continu, affine par morceaux, avec au plus un coude par unité, en $x = -b_j / w_j$. Survolez les unités cachées : chaque carte est une rampe. Une unité dont le coude tombe hors des données est affine sur celles-ci : elle n'y ajoute aucun coude, seulement de la pente.</p>
<p>Hors des données, le réseau continue en ligne droite : un réseau ReLU extrapole linéairement. Avec tanh, l'ajustement est lisse et s'aplatit loin des données ; remarquez aussi le plateau d'environ 2000 itérations avant que le réseau tanh ne commence à s'ajuster.</p>`,
    },
    {
      id: 'A.5', part: 'A', title: 'Trois classes et le softmax',
      setup: { dataset: 'three', noise: 0.3, n: 300, hidden: [], lr: 0.3 },
      variants: [
        { label: 'Sans couche cachée', set: {} },
        { label: 'Une couche cachée de 8 ReLU', set: { hidden: [8] } },
      ],
      question: 'Trois classes, pas de couche cachée, trois logits. À quoi ressemblent les trois régions ?',
      watch: 'Survolez la figure : la bulle donne les logits et leur softmax. La couleur pâlit là où le réseau hésite.',
      explanation: String.raw`<p>La prédiction est $\mathrm{sm}(Wx + b) \in \Delta_2$, un vecteur de probabilités, et la classe du plus grand logit l'emporte. La frontière entre les classes $k$ et $k'$ est sur $\{z_k = z_{k'}\}$, une droite : les trois régions sont convexes et se rejoignent en un point. Sur ces nuages qui se chevauchent, l'erreur de test est d'environ $5\,\%$.</p>
<p>Entraîner avec l'entropie croisée, c'est le maximum de vraisemblance pour le modèle $\mathbb{P}(y = k \mid x) = \mathrm{sm}(Wx + b)_k$ : la régression logistique multinomiale. Avec une couche cachée, les frontières peuvent se courber.</p>`,
    },

    // ---- B. Training ----
    {
      id: 'B.1', part: 'B', title: 'Initialiser tous les poids à la même valeur',
      setup: { dataset: 'circles', noise: 0.1, n: 200, hidden: [8, 8], activation: 'tanh', init: 'same', lr: 0.1, stopAt: 3000 },
      variants: [
        { label: 'Poids identiques', set: {} },
        { label: 'Poids aléatoires', set: { init: 'random' } },
      ],
      question: String.raw`Tous les poids d'une même couche partent de la même valeur, et les biais de $0$. Le réseau a deux couches de 8 unités tanh. Que deviennent les unités d'une couche pendant l'entraînement ?`,
      watch: 'Les cartes des unités cachées (survolez-les), la frontière, et l’erreur d’entraînement.',
      explanation: String.raw`<p>Les 8 unités de chaque couche restent <em>exactement</em> identiques : après 3000 itérations, les 8 lignes de $W_1$ valent toutes $(0{,}610\,;\,1{,}298)$. Le réseau se comporte comme s'il avait une unité par couche : sa frontière ne dépend que d'une projection $w^\top x$, et l'erreur d'entraînement reste vers $0{,}35$.</p>
<p>C'est l'exercice 5.1 : si deux unités ont les mêmes poids entrants et sortants, elles reçoivent le même gradient, donc gardent les mêmes poids, à chaque pas. Rien ne peut briser la symétrie. Avec une initialisation aléatoire, la même architecture atteint une erreur d'entraînement nulle en moins de 1000 itérations. Initialiser à zéro est pire encore : avec tanh ou ReLU, tous les gradients des couches cachées sont nuls.</p>`,
    },
    {
      id: 'B.2', part: 'B', title: 'Le pas d’apprentissage',
      setup: { dataset: 'moons', noise: 0.2, n: 200, hidden: [8, 8], lr: 0.1 },
      variants: [
        { label: 'γ = 0,001', set: { lr: 0.001 } },
        { label: 'γ = 0,1', set: { lr: 0.1 } },
        { label: 'γ = 3', set: { lr: 3 } },
      ],
      question: String.raw`Mêmes données, même initialisation, trois pas $\gamma$. Prédisez la courbe du risque d'entraînement pour chacun.`,
      watch: 'Les courbes de risque, et les normes des gradients sous le réseau.',
      explanation: String.raw`<p>$\gamma = 0{,}001$ : les pas sont trop petits ; après 2000 itérations, le risque d'entraînement vaut encore $0{,}38$, contre $0{,}008$ pour $\gamma = 0{,}1$.</p>
<p>$\gamma = 3$ : en quelques pas, l'itéré saute en un point où toutes les unités de la dernière couche cachée sont nulles sur toutes les données. Le réseau est alors constant sur les données, les unités sont mortes (carrés en pointillés), et le gradient de chaque poids est <em>exactement</em> nul (les barres sous le réseau disparaissent). Les poids ne bougent plus jamais, et l'erreur d'entraînement reste à $1/2$. La descente de gradient est bloquée en un point critique (le gradient y est exactement nul) : en général, rien ne garantit mieux qu'un gradient petit (partie 4).</p>`,
    },
    {
      id: 'B.3', part: 'B', title: 'Descente de gradient et SGD',
      setup: { dataset: 'moons', noise: 0.2, n: 200, hidden: [8, 8], lr: 0.1, batch: Infinity },
      variants: [
        { label: '|B| = 1', set: { batch: 1 } },
        { label: '|B| = 16', set: { batch: 16 } },
        { label: 'Lot complet (GD)', set: { batch: Infinity } },
      ],
      question: String.raw`Même pas, des lots de $1$, $16$ ou des $200$ points. Quel réglage fait baisser le risque d'entraînement le plus vite par itération ? Par époque, c'est-à-dire par passage sur les données ?`,
      watch: 'La courbe de risque (lisse ou bruitée), et les compteurs d’itérations et d’époques au-dessus du réseau.',
      explanation: String.raw`<p>Une itération de descente de gradient coûte $n = 200$ gradients, une itération de SGD en coûte $|B|$. Par itération, $|B| = 16$ et le lot complet font presque pareil (risque d'entraînement $0{,}023$ et $0{,}022$ après 1000 itérations), mais $|B| = 16$ n'a parcouru les données que 80 fois, contre 1000 fois pour le lot complet.</p>
<p>Avec $|B| = 1$, la courbe est bruitée : la direction est sans biais, et c'est sa variance que l'on paie. Pourtant, après 3000 itérations, soit seulement 15 époques, son risque d'entraînement vaut $0{,}02$.</p>`,
    },
    {
      id: 'B.4', part: 'B', title: 'Plusieurs initialisations, plusieurs minimiseurs',
      setup: { dataset: 'moons', noise: 0.1, n: 40, hidden: [8, 8], lr: 0.1, batch: 8, stopAt: 2000 },
      variants: [
        { label: 'Initialisation n° 1', set: { seed: 1 } },
        { label: 'n° 2', set: { seed: 2 } },
        { label: 'n° 3', set: { seed: 3 } },
        { label: 'n° 4', set: { seed: 4 } },
      ],
      question: 'Mêmes données, même architecture, même algorithme : seule l’initialisation aléatoire change. Les réseaux entraînés sont-ils d’accord ?',
      watch: 'La frontière loin des points, le risque d’entraînement et le risque de test à l’itération 2000.',
      explanation: String.raw`<p>Chaque exécution atteint une erreur d'entraînement nulle et un risque d'entraînement sous $0{,}005$, mais les frontières diffèrent là où il n'y a pas de données, et les risques de test aussi : de $0{,}08$ (initialisation n° 1) à $0{,}22$ (n° 3).</p>
<p>$F$ n'est pas convexe et a beaucoup de (quasi) minimiseurs ; celui que renvoie SGD dépend du point de départ. Ils ne généralisent pas aussi bien, ce qu'aucune borne sur toute la classe $\mathcal{F}$ ne peut voir : l'explication doit faire intervenir l'algorithme (partie 7).</p>`,
    },
    {
      id: 'B.5', part: 'B', title: 'La symétrie par permutation',
      setup: { dataset: 'moons', noise: 0.2, n: 200, hidden: [8, 8], stopAt: 1500 },
      variants: [
        { label: 'Permuter les unités cachées', action: 'permute' },
      ],
      question: 'Une fois le réseau entraîné, on mélange les unités de chaque couche cachée en emportant leurs poids entrants et sortants. La fonction change-t-elle ?',
      watch: 'Le réseau avant et après, la frontière, et les risques au dernier chiffre près.',
      explanation: String.raw`<p>Le dessin du réseau change, la frontière et les risques non : permuter les unités de la couche $l$, avec les lignes de $W_l$ et $b_l$ et les colonnes de $W_{l+1}$, ne change pas $f_\theta$. Chaque minimiseur vient donc avec au moins $8! \times 8! \approx 1{,}6 \times 10^9$ copies (exercice 5.2) : il n'y a aucun espoir d'une solution unique.</p>
<p>Appuyez plusieurs fois sur le bouton : c'est toujours la même fonction.</p>`,
    },
    {
      id: 'B.6', part: 'B', title: 'Gradients évanescents',
      setup: { dataset: 'circles', noise: 0.1, n: 200, hidden: [8, 8, 8, 8, 8], activation: 'sigmoid' },
      variants: [
        { label: 'sigmoïde', set: {} },
        { label: 'tanh', set: { activation: 'tanh' } },
        { label: 'ReLU', set: { activation: 'relu' } },
      ],
      question: 'Cinq couches cachées d’unités sigmoïdes sur les cercles. Le réseau va-t-il apprendre ?',
      watch: 'Les normes des gradients des couches, sous le réseau (échelle log), et l’erreur d’entraînement.',
      explanation: String.raw`<p>La passe arrière multiplie, couche après couche, par $W_l^\top$ et par $\sigma'(z)$ (partie 4). Pour la sigmoïde, $\sigma' \le 1/4$ : le gradient rétrécit à chaque couche. À l'initialisation, il va d'environ $0{,}3$ pour la dernière couche à quelques $10^{-6}$ pour la première. Les premières couches ne bougent presque pas, et l'erreur d'entraînement vaut encore $1/2$ après 5000 itérations.</p>
<p>Avec tanh ($\sigma'(0) = 1$) ou ReLU ($\sigma' = 1$ sur les unités actives), le même réseau atteint une erreur d'entraînement nulle en 500 itérations.</p>`,
    },

    // ---- C. Approximation ----
    {
      id: 'C.1', part: 'C', title: 'Une unité, un coude',
      setup: { dataset: 'sine', noise: 0, n: 100, hidden: [3], lr: 0.03, speed: 20 },
      variants: [
        { label: '3 unités', set: { hidden: [3] } },
        { label: '8 unités', set: { hidden: [8] } },
        { label: '32 unités', set: { hidden: [32] } },
      ],
      question: 'Une couche cachée de 3, 8 ou 32 unités ReLU, sur un sinus à quatre extrema, sans bruit. Jusqu’où chacun peut-il s’approcher ?',
      watch: 'Les coudes (traits sous la figure) et le risque d’entraînement.',
      explanation: String.raw`<p>Avec $m$ unités, le réseau est affine par morceaux avec au plus $m$ coudes : 3 coudes ne peuvent pas suivre quatre extrema. Après 5000 itérations, le risque d'entraînement vaut environ $0{,}19$ avec 3 unités, $0{,}004$ avec 8, $0{,}001$ avec 32.</p>
<p>C'est le théorème de la partie 6 à l'œuvre : les unités sont les coudes, et il en faut d'autant plus que la précision $\epsilon$ demandée est fine ; la démonstration en utilise $G(b-a)/\epsilon$ pour une cible $G$-lipschitzienne, et une cible régulière en demande moins.</p>`,
    },
    {
      id: 'C.2', part: 'C', title: 'Exister n’est pas être trouvé',
      setup: { dataset: 'kinks', noise: 0, n: 100, hidden: [4], lr: 0.03, speed: 20, stopAt: 6000 },
      variants: [
        { label: '4 unités, initialisation n° 1', set: {} },
        { label: '4 unités, n° 2', set: { seed: 2 } },
        { label: '32 unités', set: { hidden: [32] } },
      ],
      question: 'La cible est affine par morceaux avec 3 coudes : 4 unités ReLU la représentent exactement (une par coude, et une pour la pente à gauche). SGD va-t-il trouver ce réseau ?',
      watch: 'Le risque d’entraînement : un ajustement exact donne un risque nul (il n’y a pas de bruit). Survolez les unités cachées.',
      explanation: String.raw`<p>Depuis l'initialisation n° 1, SGD stagne à un risque d'entraînement d'environ $0{,}06$, avec un coude manquant : une unité est gaspillée, et la descente se trouve près d'un point critique qui n'est pas un minimiseur global. Depuis la n° 2, elle s'approche beaucoup plus ($0{,}005$ après 6000 itérations), sans être exacte.</p>
<p>Avec 32 unités, le risque d'entraînement tombe à $10^{-4}$ : le réseau plus large est <em>plus facile à optimiser</em>, alors qu'il n'est pas nécessaire pour l'approximation. L'approximation universelle dit qu'une bonne $f$ est dans $\mathcal{F}$, pas qu'un algorithme la trouve.</p>`,
    },
    {
      id: 'C.3', part: 'C', title: 'Un cas difficile : deux spirales',
      setup: { dataset: 'spirals', noise: 0.1, n: 300, hidden: [16, 16], lr: 0.1, batch: 8, speed: 20, stopAt: 6000 },
      variants: [
        { label: 'Deux couches de 16 unités', set: {} },
        { label: 'Une couche de 32 unités', set: { hidden: [32] } },
      ],
      question: 'Deux spirales entrelacées. Deux couches cachées de 16 unités ReLU peuvent-elles les séparer, et en combien de temps ?',
      watch: 'La frontière qui se forme, et les unités de la seconde couche : elles recombinent les demi-plans de la première.',
      explanation: String.raw`<p>Il faut quelques milliers d'itérations : après 6000, l'erreur d'entraînement est de $3\,\%$ et l'erreur de test de $4\,\%$. La première couche ne fait que couper le plan par des droites ; la seconde combine ces coupes en régions polygonales, non convexes, très découpées.</p>
<p>Une seule couche de 32 unités est universelle aussi (partie 6), avec moins de paramètres ($162$ contre $354$). Après les mêmes 6000 itérations, son risque d'entraînement est de $0{,}27$, contre $0{,}10$ pour deux couches : ici, la profondeur rend l'apprentissage bien plus facile.</p>`,
    },

    // ---- D. Generalization ----
    {
      id: 'D.1', part: 'D', title: 'Surapprentissage, arrêt précoce et pénalité',
      setup: { dataset: 'sine', noise: 0.5, n: 20, hidden: [32, 32], lr: 0.03, speed: 100, stopAt: 20000 },
      variants: [
        { label: 'n = 20', set: {} },
        { label: 'n = 100', set: { n: 100 } },
        { label: 'n = 20, λ = 0,01', set: { lambda: 0.01 } },
      ],
      question: String.raw`20 points bruités, un réseau à $P = 1153$ paramètres. Que deviennent le risque d'entraînement et le risque de test si l'on entraîne longtemps ?`,
      watch: 'Les deux courbes de risque, et la courbe du réseau entre les points.',
      explanation: String.raw`<p>Le bruit a pour variance $0{,}2^2 = 0{,}04$ : c'est le plus petit risque possible pour un prédicteur. Le risque d'entraînement passe <em>sous</em> ce niveau ($0{,}017$ après 20000 itérations) : le réseau apprend le bruit. Pendant ce temps, le risque de test est minimal vers l'itération 600 ($0{,}064$), puis remonte jusqu'à $0{,}19$. S'arrêter au minimum de la courbe de test, mesurée sur un jeu de validation, c'est l'<strong>arrêt précoce</strong> (<em>early stopping</em>), déjà vu pour le gradient boosting au cours 2.</p>
<p>Avec $n = 100$ points, le même réseau surapprend beaucoup moins. Avec $n = 20$ et la pénalité $\lambda \sum_l \|W_l\|_F^2$, $\lambda = 0{,}01$ (la ridge, partie 7), le risque de test reste vers $0{,}08$ : la régularisation réduit le surapprentissage, à $P$ fixé.</p>`,
    },
    {
      id: 'D.2', part: 'D', title: 'Étiquettes aléatoires',
      setup: { dataset: 'xor', noise: 0.1, n: 40, randomLabels: true, hidden: [32, 32, 32], lr: 0.1, batch: 8, speed: 20, stopAt: 6000 },
      variants: [
        { label: 'Étiquettes aléatoires', set: {} },
        { label: 'Vraies étiquettes', set: { randomLabels: false } },
      ],
      question: 'Chaque étiquette d’entraînement est remplacée par un pile ou face, indépendant du point. Le réseau peut-il encore atteindre une erreur d’entraînement nulle ?',
      watch: 'Les erreurs d’entraînement et de test sous la figure, et la frontière.',
      explanation: String.raw`<p>Oui : après 4000 itérations environ, l'erreur d'entraînement est nulle. Le réseau a mémorisé 40 pile ou face, avec des îlots autour de points isolés, et son erreur de test est d'environ $0{,}41$, c'est-à-dire le hasard. C'est l'expérience de Zhang et al. (2017) vue aux cours 1 et 4, en miniature : le réseau interpole des étiquettes arbitraires. S'il y parvient pour (presque) tous les étiquetages, la classe éclate ces 40 points, et toute borne du type « VC-dimension sur $n$ » est au moins $1$ pour elle.</p>
<p>Avec les vraies étiquettes, le même réseau sur les mêmes points atteint aussi une erreur d'entraînement nulle, et une erreur de test d'environ $0{,}035$. Même classe, même algorithme, résultats opposés : ce qui généralise n'est pas expliqué par $\mathcal{F}$ seule.</p>`,
    },
  ];
})();
