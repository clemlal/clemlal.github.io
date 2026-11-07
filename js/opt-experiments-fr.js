// Guided experiments of the optimization playground (js/opt-playground.js) on
// teaching/2026_2027_SID_Advanced_Statistical_Learning/optimisation-sgd.html,
// in French. Exposed as window.OPT_EXPERIMENTS, with the default settings
// (window.OPT_DEFAULTS) and the titles of the parts (window.OPT_PARTS).
//
// An experiment has (see Lab.experiments in js/lab-kit.js):
//   id, part, title   'II.3', 'II', and its name in the list
//   setup             the settings it loads (the others take OPT_DEFAULTS);
//                     runs[0] and runs[1] are algorithms A and B (B only with
//                     compare: true); stopAt pauses at that iteration,
//                     stopEpochs after that many passes over the data
//   variants          buttons that reload the setup with some settings changed
//   question, watch, explanation   texts in HTML, LaTeX between $…$
//
// Every number quoted in an explanation is what the run gives: runs are
// seeded (algorithm A with seed, B with seed + 101), and the numbers were
// computed by replaying each variant with js/opt-engine.js, exactly as the
// playground does.

(function () {
  const run = o => ({ rule: 'gd', lr: 1, schedule: 'constant', stochastic: false, batch: 1, beta: 0.9, ...o });

  window.OPT_DEFAULTS = {
    landscape: 'quadratic', kappa: 10, rotated: false, centred: false, sigma: 1, start: null,
    runs: [run({}), run({ rule: 'momentum', lr: 0.5 })],
    compare: false, average: false, axis: 'iterations', speed: 5, stopAt: null, stopEpochs: null, seed: 1,
  };

  window.OPT_PARTS = { I: 'I. Descente de gradient', II: 'II. Gradient stochastique', III: 'III. Momentum et Adam' };

  window.OPT_EXPERIMENTS = [
    // ---- I. Gradient descent ----
    {
      id: 'I.1', part: 'I', title: 'Le pas γ sur une quadratique',
      setup: { landscape: 'quadratic', kappa: 10, speed: 1, runs: [run({ lr: 1 })] },
      variants: [
        { label: 'γ = 0,5', set: { runs: [run({ lr: 0.5 })] } },
        { label: 'γ = 1 = 1/L', set: { runs: [run({ lr: 1 })] } },
        { label: 'γ = 1,9', set: { runs: [run({ lr: 1.9 })] } },
        { label: 'γ = 2,1', set: { runs: [run({ lr: 2.1 })] } },
      ],
      question: String.raw`$F(\theta) = \frac12(\mu \theta_1^2 + L \theta_2^2)$ avec $L = 1$ et $\mu = 0{,}1$. Pour chacun des quatre pas, la descente de gradient converge-t-elle ? En zigzag ou tout droit ?`,
      watch: 'La trajectoire sur la carte, et la pente de la courbe de $F(\\theta_t) - F^\\star$ (échelle logarithmique).',
      explanation: String.raw`<p>Les deux coordonnées évoluent séparément : $\theta_{t,1} = (1 - \gamma\mu)^t \theta_{0,1}$ et $\theta_{t,2} = (1 - \gamma L)^t \theta_{0,2}$ (partie 2, « Le conditionnement »). Tout se lit sur les deux facteurs $|1 - \gamma\mu|$ et $|1 - \gamma L|$ :</p>
<table class="lab-table">
<tr><th>$\gamma$</th><td>$0{,}5$</td><td>$1$</td><td>$1{,}9$</td><td>$2{,}1$</td></tr>
<tr><th>$1 - \gamma\mu$ (direction plate)</th><td>$0{,}95$</td><td>$0{,}9$</td><td>$0{,}81$</td><td>$0{,}79$</td></tr>
<tr><th>$1 - \gamma L$ (direction raide)</th><td>$0{,}5$</td><td>$0$</td><td>$-0{,}9$</td><td>$-1{,}1$</td></tr>
<tr><th>itérations pour $10^{-6}$</th><td>135</td><td>66</td><td>73</td><td>diverge</td></tr>
</table>
<p>Avec $\gamma = 1/L$, la direction raide est tuée en un pas et la trajectoire est droite. Avec $\gamma = 1{,}9$, le facteur négatif fait <em>zigzaguer</em> $\theta_{t,2}$ d'un bord de la vallée à l'autre, mais $|{-0{,}9}| < 1$ : ça converge. Avec $\gamma = 2{,}1 > 2/L$, $|1 - \gamma L| = 1{,}1$ et $\theta_{t,2} = 3 \times (-1{,}1)^t$ explose ; le jeu s'arrête à l'itération 182, quand $|\theta_t|$ dépasse $10^8$.</p>
<p>Le pas $\gamma = 1{,}9$ converge presque aussi vite que $\gamma = 1$ (73 itérations contre 66) : le plus lent des deux facteurs vaut $0{,}9$ dans les deux cas. Le meilleur pas pour une quadratique est en fait $2/(L + \mu) \approx 1{,}82$, qui égalise les deux facteurs. Mais il demande de connaître $\mu$, et le lemme de descente ne garantit la décroissance de $F$ que pour $\gamma < 2/L$.</p>`,
    },
    {
      id: 'I.2', part: 'I', title: 'Le conditionnement κ',
      setup: { landscape: 'quadratic', kappa: 10, runs: [run({ lr: 1 })] },
      variants: [
        { label: 'κ = 1', set: { kappa: 1 } },
        { label: 'κ = 10', set: { kappa: 10 } },
        { label: 'κ = 100', set: { kappa: 100 } },
      ],
      question: String.raw`Toujours $\gamma = 1/L$. Combien d'itérations faut-il pour atteindre $F(\theta_t) - F^\star < 10^{-6}$ quand $\kappa = L/\mu$ vaut $1$, $10$ puis $100$ ?`,
      watch: 'Le compteur d’itérations quand le message d’arrêt apparaît, et la forme des lignes de niveau.',
      explanation: String.raw`<p>$1$, $66$ et $574$ itérations. Pour $\kappa = 1$, les lignes de niveau sont des cercles, $-\nabla F(\theta)$ pointe droit sur le minimiseur et $\gamma = 1/L$ y arrive en un pas. Pour $\kappa = 100$, l'ellipse est cent fois plus longue que large : la direction raide est réglée en un pas, puis l'algorithme rampe le long de la direction plate au rythme $1 - 1/\kappa = 0{,}99$ par pas.</p>
<p>Le théorème du cours garantit $F(\theta_t) - F^\star \le (1 - 1/\kappa)^t (F(\theta_0) - F^\star)$, soit $t \ge \kappa \ln\big((F(\theta_0) - F^\star)/10^{-6}\big)$ itérations : $156$ pour $\kappa = 10$ et $1535$ pour $\kappa = 100$. Le jeu fait mieux, $66$ et $574$, car sur une quadratique $F - F^\star$ est le <em>carré</em> de la coordonnée plate, qui décroît comme $(1 - 1/\kappa)^{2t}$. Ce qui compte : le nombre d'itérations est proportionnel à $\kappa$.</p>`,
    },
    {
      id: 'I.3', part: 'I', title: 'Centrer les données',
      setup: { landscape: 'leastSquares', centred: false, runs: [run({ lr: 0.08 })] },
      variants: [
        { label: 'xᵢ non centrés, γ = 0,08', set: {} },
        { label: 'xᵢ non centrés, γ = 0,19', set: { runs: [run({ lr: 0.19 })] } },
        { label: 'xᵢ centrés, γ = 0,7', set: { centred: true, runs: [run({ lr: 0.7 })] } },
      ],
      question: String.raw`Moindres carrés pour $y \approx w x + b$, avec des $x_i$ entre $1$ et $5$. On recentre ensuite les $x_i$ (on leur retire leur moyenne $3$). Qu'est-ce que cela change pour la descente de gradient ?`,
      watch: 'La forme des lignes de niveau, les constantes $L$, $\\mu$, $\\kappa$ sous le tableau, et le nombre d’itérations.',
      explanation: String.raw`<p>La hessienne des moindres carrés est $\begin{pmatrix} \overline{x^2} & \bar x \\ \bar x & 1 \end{pmatrix}$ (exercice 1.1). Avec des $x_i$ entre $1$ et $5$, $\bar x = 3$ : $L \approx 11{,}24$, $\mu \approx 0{,}121$, $\kappa \approx 93$. Les lignes de niveau sont des ellipses très allongées et inclinées, car $w$ et $b$ se compensent : augmenter la pente et baisser l'ordonnée à l'origine change peu les prédictions.</p>
<p>Avec $\gamma = 0{,}08 \approx 1/L$, il faut $701$ itérations pour $10^{-6}$. Avec $\gamma = 0{,}19 > 2/L \approx 0{,}178$, ça diverge. Une fois les $x_i$ centrés, $\bar x = 0$, la hessienne est diagonale, $L \approx 1{,}36$, $\mu = 1$, $\kappa \approx 1{,}36$ : $7$ itérations avec $\gamma = 0{,}7$. Même modèle, mêmes prédictions, cent fois moins de calcul. C'est la raison d'optimisation, en plus de la raison statistique vue au cours 1, de centrer et réduire les variables avant d'entraîner un modèle linéaire, une SVM ou un réseau.</p>`,
    },
    {
      id: 'I.4', part: 'I', title: 'Deux puits et un point selle',
      setup: { landscape: 'wells', speed: 1, runs: [run({ lr: 0.1 })], start: [0.3, 1.6] },
      variants: [
        { label: 'départ (0,3 ; 1,6)', set: { start: [0.3, 1.6] } },
        { label: 'départ (−0,2 ; 1,6)', set: { start: [-0.2, 1.6] } },
        { label: 'départ sur la selle, θ₁ = 0,0754…', set: { start: [0.07542915856974822, 1.6] } },
      ],
      question: String.raw`$F$ n'est pas convexe : deux minima et un point selle. Où la descente de gradient s'arrête-t-elle, selon le point de départ ?`,
      watch: 'Le point d’arrivée, la valeur finale de $F(\\theta_t) - F^\\star$ et le message d’arrêt.',
      explanation: String.raw`<p>Depuis $(0{,}3\,;\,1{,}6)$, la descente tombe dans le puits de droite : un <em>minimum local</em>, $F(\theta_t) - F^\star \approx 0{,}60$, et elle s'y arrête (le gradient y est nul). Depuis $(-0{,}2\,;\,1{,}6)$, elle trouve le minimum global en $34$ itérations pour $10^{-6}$.</p>
<p>Ici $F$ est une somme d'une fonction de $\theta_1$ et d'une fonction de $\theta_2$, donc $\theta_1$ évolue seul. Partant exactement à l'abscisse du point selle, $\theta_{t,1}$ ne bouge jamais et la descente converge vers le <em>point selle</em>, à $F - F^\star \approx 1{,}32$. Il faut pour cela un point de départ très particulier : partout ailleurs, la descente quitte la selle, mais elle peut ralentir beaucoup à son voisinage. Un point critique n'est pas forcément un minimum, et celui où l'on arrive dépend du point de départ. En dimension un million, on ne visualise plus rien, mais le phénomène demeure. L'expérience II.5 montre ce que le bruit change.</p>`,
    },

    // ---- II. Stochastic gradient ----
    {
      id: 'II.1', part: 'II', title: 'GD contre SGD, à calcul égal',
      setup: { landscape: 'leastSquares', centred: false, compare: true, axis: 'epochs', speed: 20, stopEpochs: 200,
        runs: [run({ lr: 0.17 }), run({ lr: 0.02, stochastic: true, batch: 1 })] },
      variants: [],
      question: String.raw`A : descente de gradient, $\gamma = 0{,}17$ (presque $2/L$). B : SGD, un point tiré par itération, $\gamma = 0{,}02$. On les compare à <em>calcul égal</em> : pendant que A fait une itération (elle lit les $n = 100$ points), B en fait $100$. Qui est devant après $5$ passages sur les données ? après $200$ ?`,
      watch: 'La courbe en fonction du nombre de passages sur les données, et les compteurs d’itérations dans le tableau.',
      explanation: String.raw`<p>À calcul égal, SGD part beaucoup plus vite : après $5$ passages sur les données, $F - F^\star \approx 0{,}12$ pour SGD contre $9{,}8$ pour la descente de gradient ; après $20$ passages, $3 \times 10^{-4}$ contre $0{,}92$. Une itération de GD coûte autant que $100$ itérations de SGD, et ces $100$ petits pas, chacun dans une direction juste en moyenne, avancent bien plus qu'un seul grand pas, limité par $\gamma < 2/L$.</p>
<p>Ensuite SGD cesse de progresser : sa courbe oscille autour d'un palier (de l'ordre de $4 \times 10^{-2}$ en moyenne entre 100 et 200 passages, avec de grands écarts), alors que GD continue de descendre en ligne droite (échelle log) : $1{,}3 \times 10^{-2}$ après $100$ passages, $2 \times 10^{-4}$ après $200$. C'est le compromis de la partie 3 : SGD gagne quand une précision modérée suffit, ce qui est le cas en apprentissage, où l'erreur d'optimisation n'a pas besoin d'être plus petite que l'erreur statistique.</p>`,
    },
    {
      id: 'II.2', part: 'II', title: 'Le plancher de bruit',
      setup: { landscape: 'leastSquares', centred: true, compare: true, speed: 100, stopAt: 10000,
        runs: [run({ lr: 0.1, stochastic: true }), run({ lr: 0.02, stochastic: true })] },
      variants: [
        { label: 'A : γ = 0,1, B : γ = 0,02', set: {} },
        { label: 'A : pas décroissant γ/(1 + t/50)', set: { runs: [run({ lr: 0.1, stochastic: true, schedule: 'inv' }), run({ lr: 0.02, stochastic: true })] } },
      ],
      question: String.raw`SGD à pas constant, un point par itération, avec deux pas. Où s'arrête la descente de $F(\theta_t) - F^\star$ ? Que change un pas qui décroît avec $t$ ?`,
      watch: 'Les deux paliers de la courbe, et la valeur de $F(\\theta_t) - F^\\star$ dans le tableau (elle fluctue : regardez son ordre de grandeur).',
      explanation: String.raw`<p>Chaque courbe a deux phases. D'abord une phase de <em>biais</em> : la courbe descend, SGD oublie son point de départ. Puis une phase de <em>variance</em> : la courbe plafonne, en moyenne sur les 5000 dernières itérations à $F - F^\star \approx 4 \times 10^{-2}$ pour $\gamma = 0{,}1$ et $\approx 4 \times 10^{-3}$ pour $\gamma = 0{,}02$. C'est le <em>plancher de bruit</em> du théorème de la partie 3 : à pas constant, $\mathbb{E}[F(\theta_t)] - F^\star$ converge vers un niveau de l'ordre de $\gamma \sigma^2$, pas vers $0$. Un pas plus petit abaisse le plancher (moins de variance), mais oublie plus lentement le point de départ (plus de biais au début : B est en retard).</p>
<p>Avec le pas décroissant $\gamma_t = 0{,}1/(1 + t/50)$, A continue de descendre : $7{,}5 \times 10^{-5}$ à $t = 1000$, $4 \times 10^{-8}$ à $t = 10\,000$. Le pas décroissant combine le départ rapide d'un grand pas et la précision d'un petit pas : grand quand le biais domine, petit quand la variance domine.</p>`,
    },
    {
      id: 'II.3', part: 'II', title: 'La taille de lot',
      setup: { landscape: 'leastSquares', centred: true, compare: true, speed: 100, stopAt: 10000,
        runs: [run({ lr: 0.1, stochastic: true, batch: 1 }), run({ lr: 0.1, stochastic: true, batch: 10 })] },
      variants: [
        { label: 'en itérations', set: {} },
        { label: 'à calcul égal', set: { axis: 'epochs', stopAt: null, stopEpochs: 100 } },
      ],
      question: String.raw`Même pas $\gamma = 0{,}1$, des lots de $b = 1$ (A) ou $b = 10$ points (B). Lequel atteint le plancher le plus bas ? Et si l'on compte le calcul plutôt que les itérations ?`,
      watch: 'Les paliers, puis, avec le second bouton, l’axe des passages sur les données.',
      explanation: String.raw`<p>En itérations, les deux courbes ont la même phase de biais (même pas), mais B ($b = 10$) plafonne bien plus bas : $\approx 1{,}3 \times 10^{-3}$ en moyenne, contre $\approx 4 \times 10^{-2}$ pour A. Moyenner $b$ gradients divise la variance de l'estimateur par $b$ (exercice 3.1), et le plancher, qui est le terme de variance, baisse avec elle : ici d'un facteur $30$ environ, plus que $b$, car près du minimum la variance des gradients dépend aussi de $\theta$.</p>
<p>Mais une itération de B coûte $10$ gradients. À calcul égal, A est devant au début ($0{,}11$ contre $0{,}82$ après un passage) car il fait dix fois plus de pas ; B le dépasse ensuite grâce à son plancher plus bas. Augmenter $b$ ne réduit pas le nombre de passages nécessaires : cela rend chaque pas plus fiable, et cela se calcule en parallèle sur un GPU. C'est la raison pratique des lots de 32 à 4096 exemples.</p>`,
    },
    {
      id: 'II.4', part: 'II', title: 'Moyenner les itérés',
      setup: { landscape: 'leastSquares', centred: true, average: true, speed: 100, stopAt: 20000,
        runs: [run({ lr: 0.1, stochastic: true })] },
      variants: [],
      question: String.raw`SGD à pas constant tourne autour du minimiseur sans s'en approcher. Et la moyenne $\bar\theta_t = (\theta_1 + \dots + \theta_t)/t$ de ses itérés ?`,
      watch: 'La trajectoire en tirets (la moyenne) sur la carte, et les deux courbes : trait plein pour $\\theta_t$, tirets pour $\\bar\\theta_t$.',
      explanation: String.raw`<p>Le dernier itéré $\theta_t$ reste au plancher de bruit : $F - F^\star \approx 4 \times 10^{-2}$ en moyenne, $1{,}2 \times 10^{-2}$ à $t = 20\,000$. La moyenne $\bar\theta_t$, elle, continue de converger : $8 \times 10^{-4}$ à $t = 1000$, $2 \times 10^{-5}$ à $t = 5000$, $4 \times 10^{-6}$ à $t = 20\,000$.</p>
<p>À pas constant, $\theta_t$ finit par fluctuer autour de $\theta^\star$ ; ces fluctuations se compensent dans la moyenne, dont la variance est bien plus petite. C'est pour cela que le théorème de SGD dans le cas convexe porte sur $\bar\theta_t$ et non sur $\theta_t$ (moyenne de Polyak et Ruppert). À pas constant, cela marche aussi bien parce que $F$ est quadratique ; en général, on combine la moyenne avec un pas décroissant. Sur la carte, la trajectoire en tirets s'enroule vers $\theta^\star$ pendant que la trajectoire pleine continue de tourner autour.</p>`,
    },
    {
      id: 'II.5', part: 'II', title: 'Le bruit fait sortir d’un point selle',
      setup: { landscape: 'wells', sigma: 0.2, compare: true, speed: 5, stopAt: 3000, start: [0.07542915856974822, 1.6],
        runs: [run({ lr: 0.1 }), run({ lr: 0.1, stochastic: true })] },
      variants: [
        { label: 'tirage n° 1', set: { seed: 1 } },
        { label: 'tirage n° 2', set: { seed: 2 } },
      ],
      question: String.raw`Les deux algorithmes partent exactement au-dessus du point selle. A utilise le vrai gradient, B un gradient bruité ($\sigma = 0{,}2$). Où vont-ils ?`,
      watch: 'Les deux trajectoires près de la selle.',
      explanation: String.raw`<p>A, avec le vrai gradient, glisse vers le point selle et s'y arrête : sa coordonnée $\theta_1$ ne bouge jamais (expérience I.4). B, au contraire, est poussé hors de la crête par son bruit, puis la pente l'emporte et il tombe dans un des deux puits : avec le tirage n° 1, le puits de droite ($\theta_1 \approx 0{,}99$), avec le tirage n° 2, celui de gauche ($\theta_1 \approx -1{,}02$).</p>
<p>Un point selle est instable : la moindre perturbation dans la bonne direction est amplifiée. Les itérés de SGD ne restent donc pas bloqués sur les points selle. Ce n'est pas qu'un phénomène de dimension $2$ : en grande dimension, les points critiques de valeur élevée sont surtout des points selle (Dauphin et al., 2014), que le bruit aide à quitter.</p>`,
    },

    // ---- III. Momentum and Adam ----
    {
      id: 'III.1', part: 'III', title: 'Le momentum dans une vallée étroite',
      setup: { landscape: 'quadratic', kappa: 100, compare: true, speed: 1,
        runs: [run({ lr: 1 }), run({ rule: 'momentum', lr: 3.3, beta: 0.67 })] },
      variants: [
        { label: 'B : β = 0,67, γ = 3,3 (réglage optimal)', set: {} },
        { label: 'B : β = 0,9, γ = 1', set: { runs: [run({ lr: 1 }), run({ rule: 'momentum', lr: 1, beta: 0.9 })] } },
      ],
      question: String.raw`$\kappa = 100$. A : descente de gradient, $\gamma = 1/L$. B : momentum (boule pesante). Combien d'itérations chacun pour $F(\theta_t) - F^\star < 10^{-6}$ ?`,
      watch: 'Les trajectoires (B dépasse le fond de la vallée et revient), et les compteurs à l’arrêt.',
      explanation: String.raw`<p>$574$ itérations pour la descente de gradient, $53$ pour le momentum réglé de façon optimale ($\beta = \big((\sqrt\kappa - 1)/(\sqrt\kappa + 1)\big)^2 \approx 0{,}67$, $\gamma = 4/(\sqrt L + \sqrt\mu)^2 \approx 3{,}3$), et $132$ avec le réglage courant $\beta = 0{,}9$, $\gamma = 1$.</p>
<p>Le momentum accumule les gradients passés, $m_t = \beta m_{t-1} + \nabla F(\theta_{t-1})$. Dans la direction plate, les gradients ont toujours le même signe et s'additionnent : la boule prend de la vitesse. Dans la direction raide, ils changent de signe à chaque traversée et se compensent. Sur une quadratique, le facteur de contraction par pas passe de $1 - 1/\kappa = 0{,}99$ à $(\sqrt\kappa - 1)/(\sqrt\kappa + 1) \approx 0{,}82$ : $\kappa$ est remplacé par $\sqrt\kappa$ dans le nombre d'itérations.</p>`,
    },
    {
      id: 'III.2', part: 'III', title: 'Adam et l’échelle des coordonnées',
      setup: { landscape: 'quadratic', kappa: 100, compare: true, speed: 5,
        runs: [run({ lr: 1 }), run({ rule: 'adam', lr: 0.1 })] },
      variants: [
        { label: 'ellipse alignée sur les axes', set: {} },
        { label: 'ellipse tournée de 45°', set: { rotated: true } },
      ],
      question: String.raw`Même $\kappa = 100$. A : descente de gradient, $\gamma = 1/L$. B : Adam, $\gamma = 0{,}1$. Adam divise chaque coordonnée du gradient par sa propre échelle. Est-ce que cela aide ? Et si l'ellipse est tournée de $45°$ ?`,
      watch: 'La direction des premiers pas de B, et les compteurs à l’arrêt.',
      explanation: String.raw`<p>Ellipse alignée sur les axes : $116$ itérations pour Adam contre $574$ pour la descente de gradient. Adam divise chaque coordonnée du gradient par une estimation de sa taille, $\sqrt{\hat v_t}$ ; ses premiers pas sont de l'ordre de $\gamma$ dans <em>chaque</em> coordonnée, quelle que soit la raideur, et partent en diagonale. Quand le mauvais conditionnement vient de coordonnées d'échelles différentes, Adam le corrige en partie.</p>
<p>Ellipse tournée de $45°$ : $1000$ itérations pour Adam, contre $546$ pour la descente de gradient. Les directions plate et raide mélangent maintenant les deux coordonnées, et un changement d'échelle coordonnée par coordonnée ne peut plus les séparer. Adam n'est pas une méthode de Newton : c'est un préconditionneur <em>diagonal</em>.</p>`,
    },
    {
      id: 'III.3', part: 'III', title: 'Adam a aussi besoin d’un pas décroissant',
      setup: { landscape: 'leastSquares', centred: true, compare: true, speed: 100, stopAt: 10000,
        runs: [run({ rule: 'adam', lr: 0.02, stochastic: true }), run({ rule: 'adam', lr: 0.1, stochastic: true, schedule: 'inv' })] },
      variants: [],
      question: String.raw`Adam avec des gradients stochastiques ($b = 1$). A : pas constant $\gamma = 0{,}02$. B : pas décroissant $\gamma_t = 0{,}1/(1 + t/50)$. Lequel s'approche du minimum ?`,
      watch: 'Les deux courbes après quelques milliers d’itérations.',
      explanation: String.raw`<p>A, à pas constant, plafonne : $F - F^\star \approx 4 \times 10^{-3}$ en moyenne sur les 5000 dernières itérations. B, avec $\gamma_t = 0{,}1/(1 + t/50)$, atteint $3 \times 10^{-5}$ à $t = 1000$ et $1{,}4 \times 10^{-6}$ à $t = 10\,000$.</p>
<p>Le dénominateur $\sqrt{\hat v_t}$ d'Adam mesure la taille des gradients bruités, qui ne tend pas vers $0$ près du minimum : le pas effectif reste de l'ordre de $\gamma$, et Adam a lui aussi un plancher de bruit. En pratique, Adam s'utilise toujours avec un pas qui décroît (et souvent une phase d'échauffement au début, voir la partie 4).</p>`,
    },
    {
      id: 'III.4', part: 'III', title: 'La vallée de Rosenbrock',
      setup: { landscape: 'rosenbrock', compare: true, speed: 5,
        runs: [run({ lr: 0.01 }), run({ rule: 'momentum', lr: 0.004, beta: 0.9 })] },
      variants: [
        { label: 'A : GD, B : momentum', set: {} },
        { label: 'A : GD, B : Adam γ = 0,1', set: { runs: [run({ lr: 0.01 }), run({ rule: 'adam', lr: 0.1 })] } },
        { label: 'A : GD avec γ = 0,02', set: { compare: false, runs: [run({ lr: 0.02 })] } },
      ],
      question: String.raw`Une vallée courbe et étroite, non convexe : sa direction change en chemin. Comment se comparent la descente de gradient, le momentum et Adam ?`,
      watch: 'Les trajectoires dans la vallée et les compteurs à l’arrêt.',
      explanation: String.raw`<p>Pour $F(\theta_t) - F^\star < 10^{-6}$ : $1623$ itérations pour la descente de gradient ($\gamma = 0{,}01$), $314$ pour le momentum ($\beta = 0{,}9$, $\gamma = 0{,}004$), $172$ pour Adam ($\gamma = 0{,}1$). Avec $\gamma = 0{,}02$, la descente de gradient diverge en $8$ itérations : la hessienne en $(1, 1)$ a pour plus grande valeur propre $101{,}6$, et $0{,}02 > 2/101{,}6 \approx 0{,}0197$, si bien que le minimum lui-même est instable à ce pas.</p>
<p>Au fond de la vallée, la hessienne a pour valeurs propres $101{,}6$ et $0{,}39$ : $\kappa \approx 258$. La descente de gradient rebondit sur les parois en avançant lentement le long du fond ; le momentum garde sa vitesse dans le virage ; Adam égalise l'échelle des deux coordonnées. Aucun ne connaît $F$ : ils ne voient que des gradients.</p>`,
    },
  ];
})();
