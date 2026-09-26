/**
 * Données des projets.
 *
 * Un projet = 1 bloc de géométrie d’images (`shots`, non traduit) + 1 bloc de
 * texte par langue (`text`). Les extraits de code sont partagés dans `snippets`
 * et référencés par clé, pour ne pas les recopier trois fois.
 *
 * Pour ajouter un projet : copie un objet, dépose ses images dans
 * `public/images/<slug>/` et renseigne width/height (évite le layout shift).
 */

import type { ImageMetadata } from 'astro';
import type { Locale } from '../i18n/config';
import { locales } from '../i18n/config';
import type { DiagramKey } from './diagrams';

/* ── Médias ────────────────────────────────────────────────────────── */

// Les images sont importées depuis `src/assets/` : Astro les optimise à la
// compilation (webp + srcset) et fournit leurs dimensions, donc rien à saisir
// à la main. Les GIF animés sont reconnus à leur format et servis tels quels
// (le pipeline d’images ne garderait que la première image).

import boardImage from '../assets/raymarcher/board.png';
import pawnGif from '../assets/raymarcher/pawn.gif';
import knightGif from '../assets/raymarcher/knight.gif';
import maskImage from '../assets/cuda-motion/mask.png';
import kernelTimeImage from '../assets/cuda-motion/kernel-time.png';
import detectionClip from '../assets/cuda-motion/detection.mp4';
import inputImage from '../assets/automata-vision/input.png';
import statesImage from '../assets/automata-vision/states.png';
import arcsImage from '../assets/automata-vision/arcs.png';
import labelsImage from '../assets/automata-vision/labels.png';
import hogImage from '../assets/automata-vision/hog.png';
import datasetImage from '../assets/automata-vision/dataset.png';
import sunraysImage from '../assets/toongl/sunrays.png';
import outlinesImage from '../assets/toongl/outlines.png';
import pinesImage from '../assets/toongl/pines.png';
import barkImage from '../assets/toongl/bark.png';
import pulmonixOverviewImage from '../assets/pulmonix/overview.png';
import pulmonixViewerImage from '../assets/pulmonix/viewer.png';
import pulmonixAnomaliesImage from '../assets/pulmonix/anomalies.png';
import unetPredictionsImage from '../assets/unet-coco/predictions.png';
import unetCurvesImage from '../assets/unet-coco/curves.png';
import unetBestImage from '../assets/unet-coco/best.png';
import unetWorstImage from '../assets/unet-coco/worst.png';
import shSessionImage from '../assets/42sh/session.png';
import shTestsImage from '../assets/42sh/tests.png';
import sudokuAppImage from '../assets/raiders-sudoku/app.png';
import sudokuScanImage from '../assets/raiders-sudoku/scan.jpg';
import sudokuBinaryImage from '../assets/raiders-sudoku/binary.png';
import sudokuHoughImage from '../assets/raiders-sudoku/hough.png';
import sudokuCellImage from '../assets/raiders-sudoku/cell.png';
import sudokuSolvedImage from '../assets/raiders-sudoku/solved.png';
import sudokuTrainingImage from '../assets/raiders-sudoku/training.png';
import ntcViewerImage from '../assets/neural-texture/viewer.jpg';
import ntcRateImage from '../assets/neural-texture/rate-distortion.png';
import tigerPipelineImage from '../assets/tiger/pipeline.png';
import tigerAstImage from '../assets/tiger/ast.png';

/** Un visuel fixe ou animé. */
export interface Shot {
  image: ImageMetadata;
  /**
   * Fond propre à l’image (figures Graphviz sur noir, captures sur blanc) :
   * on l’affiche alors dans un cadre de cette couleur, pour que le montage
   * paraisse voulu dans les deux thèmes.
   */
  background?: 'light' | 'dark';
}

/**
 * Une vidéo, servie telle quelle (sans piste audio ni métadonnées : voir
 * `tools/mp4-video-only.mjs`). Les dimensions sont saisies à la main, Vite ne
 * renvoyant qu’une URL pour les fichiers vidéo.
 */
export interface Clip {
  src: string;
  width: number;
  height: number;
}

/* ── Séries chiffrées, partagées entre les langues ──────────────────── */

/**
 * Les libellés sont des noms de versions techniques : ils ne se traduisent
 * pas. Seuls le titre et la note du graphique sont localisés.
 */
const datasets = {
  /** Débit moyen du filtre, par version (relevés du bench maison). */
  filterThroughput: {
    unit: 'fps',
    better: 'high',
    bars: [
      { label: 'CPU', value: 80 },
      { label: 'GPU baseline', value: 930 },
      { label: '+ shared memory', value: 935 },
      { label: '+ structure of arrays', value: 1190 },
      { label: '+ work per thread', value: 1215 },
    ],
  },
  /** Temps GPU cumulé de tous les kernels, par version. */
  kernelTime: {
    unit: 'µs / frame',
    better: 'low',
    bars: [
      { label: 'baseline', value: 403 },
      { label: '+ shared memory', value: 395 },
      { label: '+ lazy RNG', value: 218 },
    ],
  },
  /** Qualité de reconstruction, codec neural contre rééchantillonnage. */
  ntcQuality: {
    unit: 'dB',
    better: 'high',
    bars: [
      { label: 'neural, 8-bit latents', value: 42.35 },
      { label: 'neural, 4-bit latents', value: 38.92 },
      { label: 'resampling, 2.59 bpp', value: 34.2 },
      { label: 'neural, 2-bit latents', value: 34.28 },
      { label: 'resampling, 1.34 bpp', value: 33.58 },
    ],
  },
  /** Débit des mêmes réglages. BC7 n'est là que pour son débit fixe. */
  ntcRate: {
    unit: 'bpp',
    better: 'low',
    bars: [
      { label: 'BC7 (fixed rate)', value: 8 },
      { label: 'neural, 8-bit latents', value: 5.09 },
      { label: 'neural, 4-bit latents', value: 2.59 },
      { label: 'neural, 2-bit latents', value: 1.34 },
    ],
  },
  /** Rapport OCVX, étude 1 : évaluations de f sur Rosenbrock selon α₀. */
  armijoCost: {
    unit: '#',
    better: 'low',
    bars: [
      { label: 'α₀ = 0.05', value: 48513 },
      { label: 'α₀ = 1', value: 11204 },
      { label: 'α₀ = 10', value: 27440 },
    ],
  },
  /** Rapport OCVX, étude 2 : FR et PR sur Rosenbrock, 100 départs. */
  frprRosenbrock: {
    unit: '#',
    better: 'low',
    bars: [
      { label: 'FR · x̃', value: 44.5 },
      { label: 'PR · x̃', value: 29 },
      { label: 'FR · x̄', value: 60.6 },
      { label: 'PR · x̄', value: 30.1 },
      { label: 'FR · max', value: 260 },
      { label: 'PR · max', value: 46 },
    ],
  },
  /** Rapport OCVX, étude 3 : itérations sur Rosenbrock. */
  benchRosenbrock: {
    unit: '#',
    better: 'low',
    bars: [
      { label: 'CG-FR', value: 201 },
      { label: 'CG-PR+', value: 61 },
      { label: 'BFGS', value: 35 },
    ],
  },
} as const satisfies Record<
  string,
  { unit: string; better: 'high' | 'low'; bars: readonly { label: string; value: number }[] }
>;

type DatasetKey = keyof typeof datasets;

/** Extraits de code, partagés entre les langues. */
const snippets = {
  marchLoop: {
    lang: 'cpp',
    code: `float d = 0.0f;
for (int i = 0; i < MAX_STEPS; i++)
{
    Point3 p = ray.at(d);
    SceneHit hit = get_scene_data(p);

    if (hit.distance < SURF_DIST)   // touché
        return shade(p, hit, ray);

    d += hit.distance * 0.7f;       // marge de sécurité
    if (d > MAX_DIST)
        break;
}
return background_;`,
  },
  blend: {
    lang: 'cpp',
    code: `inline float blend(float d1, float d2, float k)
{
    float h = std::clamp(0.5f + 0.5f * (d2 - d1) / k, 0.0f, 1.0f);
    return std::lerp(d2, d1, h) - k * h * (1.0f - h);
}`,
  },
  pawnAssembly: {
    lang: 'cpp',
    code: `float r = blend(head, neck, 0.3f);
r = std::min(r, blend(body_upper, body_mid, 3.0f));
r = std::min(r, body_lower);
r = std::min(r, chess_piece_base(p, 0.8f));`,
  },
  toonRamp: {
    lang: 'glsl',
    code: `float NdotL = max(dot(N, L), 0.0);

vec3 ramp   = texture(lighting_sampler, vec2(NdotL, 0.5)).rgb;
vec3 albedo = texture(texture_sampler, uv_).rgb;
vec3 color  = albedo * ramp * sun_color;

float rim  = 1.0 - max(dot(N, viewDir), 0.0);   // bord rasant
float edge = smoothstep(rim_low, rim_high, rim);
color = mix(color, vec3(0.0), edge);`,
  },
  godRays: {
    lang: 'glsl',
    code: `vec2 sun_uv = (sclip.xy / sclip.w) * 0.5 + 0.5;
vec2 delta  = (uv - sun_uv) * (rays_density / float(rays_samples));
vec2 coord  = uv;
float illum = 1.0;
for (int i = 0; i < rays_samples; ++i) {
    coord -= delta;
    vec3 s = texture(scene_tex, coord).rgb;
    float bright = max(0.0, max(max(s.r, s.g), s.b) - 1.0);
    rays  += s * bright * illum * rays_weight;
    illum *= rays_decay;
}`,
  },
  lungMask: {
    lang: 'python',
    code: `thr_vol = self.patient.volume < threshold      # -400 HU

# l'air autour du patient est un seul composant : on le retire
labeled, _ = ndimage.label(thr_vol)
thr_vol[labeled == labeled[0, 0, 0]] = 0

for z in range(thr_vol.shape[0]):              # boucher vaisseaux et bronches
    filled[z] = ndimage.binary_fill_holes(thr_vol[z])

labels, n = ndimage.label(filled)              # ne garder que les deux poumons
sizes = ndimage.sum(filled, labels, range(1, n + 1))
lung_mask = np.isin(labels, np.argsort(sizes)[-2:] + 1)

lung_mask = ndimage.binary_dilation(lung_mask, iterations=3)   # nodules pleuraux
lung_mask = ndimage.binary_erosion(lung_mask, iterations=5)    # paroi`,
  },
  twoPasses: {
    lang: 'python',
    code: `for candidate in candidates:
    # forme + statistiques + texture GLCM, sur le cube et son masque
    feat_vec = _build_feature(candidate, nodules_mask)
    if feat_vec is None:
        continue

    fp_proba = fp_reducer.predict_proba(feat_vec.reshape(1, -1))[0][1]
    if fp_proba < 0.7:
        continue                       # faux positif : on n'affiche rien

    mal_proba = malignancy_model.predict_proba(feat_vec.reshape(1, -1))[0][1]
    results.append({
        "centroid": candidate["centroid"],
        "bbox": candidate["bbox"],
        "malignancy_score": float(mal_proba),
    })`,
  },
  unetUp: {
    lang: 'python',
    code: `class Up(nn.Module):
    """Sur-échantillonnage appris, concaténation du skip, double convolution."""

    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.up = nn.ConvTranspose2d(in_ch, in_ch // 2, kernel_size=2, stride=2)
        self.conv = DoubleConv(in_ch, out_ch)

    def forward(self, x, skip):
        x = self.up(x)
        x = torch.cat([skip, x], dim=1)   # le détail que le pooling avait perdu
        return self.conv(x)`,
  },
  diceLoss: {
    lang: 'python',
    code: `def dice_loss(logits, targets, eps=1.0):
    probs = torch.sigmoid(logits)
    num = 2 * (probs * targets).sum(dim=(2, 3)) + eps
    den = probs.sum(dim=(2, 3)) + targets.sum(dim=(2, 3)) + eps
    return 1 - (num / den).mean()


def criterion(logits, targets):
    # BCE : des gradients lisses par pixel. Dice : le recouvrement, directement.
    return bce(logits, targets) + dice_loss(logits, targets)`,
  },
  shPipeline: {
    lang: 'c',
    code: `static int exec_ast_pipeline(struct ast *node)
{
    int fds[2];
    if (pipe(fds) == -1)
        return 1;

    pid_t lpid = fork();
    if (lpid == 0)
    {
        close(fds[0]);
        dup2(fds[1], STDOUT_FILENO);  /* la gauche écrit dans le tube */
        close(fds[1]);
        exit(exec_ast(node->left));   /* récursif : a | b | c s'imbrique */
    }

    pid_t rpid = fork();
    if (rpid == 0)
    {
        close(fds[1]);
        dup2(fds[0], STDIN_FILENO);   /* la droite y lit */
        close(fds[0]);
        exit(exec_ast(node->right));
    }

    close(fds[0]);
    close(fds[1]);

    int lstatus;
    int rstatus;
    waitpid(lpid, &lstatus, 0);
    waitpid(rpid, &rstatus, 0);

    return WEXITSTATUS(rstatus);  /* le tube vaut ce que vaut sa droite */
}`,
  },
  adaptThreshold: {
    lang: 'c',
    code: `void adapt_threshold(Uint8* image, int width, int height, double t) {
    const int s2 = fmax(width, height) / 16;   /* demi-fenêtre */
    int* cumulative_intensity_map = calloc(width * height, sizeof(int));
    int sum = 0;

    /* Image intégrale : la somme d'une fenêtre coûte quatre lectures,
       quelle que soit sa taille. */
    /* ... remplissage de la table ... */

    for (int i = 0; i < width; i++) {
        for (int j = 0; j < height; j++) {
            int x1 = fmax(i - s2, 1), x2 = fmin(i + s2, width - 1);
            int y1 = fmax(j - s2, 1), y2 = fmin(j + s2, height - 1);
            int count = (x2 - x1) * (y2 - y1);

            sum = cumulative_intensity_map[y2 * width + x2]
                  - cumulative_intensity_map[(y1 - 1) * width + x2]
                  - cumulative_intensity_map[y2 * width + (x1 - 1)]
                  + cumulative_intensity_map[(y1 - 1) * width + (x1 - 1)];

            /* Plus sombre que la moyenne locale, marge t : c'est de l'encre. */
            if (image[j * width + i] * count < sum * (1.0 - t))
                image[j * width + i] = 0x00;
            else
                image[j * width + i] = 0xFF;
        }
    }

    free(cumulative_intensity_map);
}`,
  },
  sudokuSolve: {
    lang: 'c',
    code: `int resolve(int grid[GRID_SIZE][GRID_SIZE]) {
    int x, y, empty_case = 0;
    /* Première case vide, en lecture ligne par ligne. */
    for (x = 0; x < GRID_SIZE && !empty_case; x++)
        for (y = 0; y < GRID_SIZE; y++)
            if (grid[x][y] == 0) { empty_case = 1; break; }

    if (!empty_case)
        return 1;              /* plus une seule case vide : c'est résolu */

    for (int value = 1; value <= 9; value++) {
        if (is_valid(grid, x, y, value)) {
            grid[x][y] = value;
            if (resolve(grid))
                return 1;
            grid[x][y] = 0;    /* le pari ne menait nulle part */
        }
    }

    return 0;
}`,
  },
  houghVote: {
    lang: 'c',
    code: `List* hough_transform(SDL_Surface* image, int* angle) {
    double diag = sqrt(width * width + height * height);
    double accuracy = 2 * diag;          /* pas d'échantillonnage sur theta */
    /* ... allocation de l'accumulateur, tables de cos et sin ... */

    /* Chaque pixel de contour vote pour toutes les droites qui le traversent. */
    for (int x = 0; x < width; x++) {
        for (int y = 0; y < height; y++) {
            if ((pixels[y * width + x] & 0xFF) < 127)
                continue;                /* pas un contour : pas de vote */

            for (int theta = 0; theta <= accuracy; theta++) {
                int rho = x * coss[theta] + y * sins[theta] + diag;
                if (rho >= 0)
                    acc[rho][theta] += 1;
            }
        }
    }

    /* ... balayage de l'accumulateur à la recherche des pics ... */
    for (int theta = 0; theta <= accuracy; theta++) {
        /* Un pic vaut une droite, à condition de peser assez : le seuil est
           relatif au sixième meilleur vote, pas absolu. */
        if (val < max_vote * 0.44)
            continue;

        angles_used[abs((int) (thetas[pt] * 180.0 / PI))] += 1;
        /* ... construction de la droite à partir de (rho, theta) ... */
    }

    /* L'angle le plus voté est l'inclinaison de la photo : le redressement
       tombe du même calcul, sans passe supplémentaire. */
    *angle = 0;
    for (int i = 0; i < 181; i++)
        if (angles_used[i] > angles_used[*angle])
            *angle = i;

    return result;
}`,
  },
  forwardBackward: {
    lang: 'c',
    code: `Matrix* forward_backward_pass(int batch_size, Matrix* x, double y[],
                              Matrix* layer1, Matrix* layer2,
                              Matrix** out_l1, Matrix** out_l2) {
    /* Aller : 784 -> 256 sous sigmoïde, 256 -> 10 sous softmax. */
    Matrix* x_layer1 = mat_mult(x, layer1);
    Matrix* x_sigmoid = sigmoid(x_layer1);
    d_sigmoid(x_layer1);            /* la dérivée, gardée pour le retour */

    Matrix* x_layer2 = mat_mult(x_sigmoid, layer2);
    softmax(x_layer2);
    Matrix* dsoft = d_softmax(x_layer2);

    /* Erreur : sortie - cible, ramenée à la taille du lot, puis multipliée
       par la dérivée du softmax. */
    Matrix* error = mat_copy(x_layer2);
    mat_elem_substract(error, targets);
    mat_mult_scal(error, 2.0 / batch_size);
    mat_elem_mult(error, dsoft);

    /* Retour : le gradient de chaque couche est un produit de matrices. */
    mat_transpose(x_sigmoid);
    *out_l2 = mat_mult(x_sigmoid, error);

    mat_transpose(error);
    Matrix* error2 = mat_mult(layer2, error);
    mat_transpose(error2);
    mat_elem_mult(error2, x_layer1);
    mat_transpose(x);
    *out_l1 = mat_mult(x, error2);

    /* ... libération des intermédiaires ... */
    return x_layer2;
}`,
  },
  ntcLayer: {
    lang: 'wgsl',
    code: `// Une couche du MLP, telle que mlp.js l'écrit pour 16 -> 64.
// Les bornes et les décalages sont des constantes : plus rien à lire
// en mémoire pour savoir où sont les poids.
var a1 : array<vec4f, 16>;
for (var o = 0u; o < 16u; o++) {
  var s = W[256u + o];                       // biais
  for (var i = 0u; i < 4u; i++) {
    let x = a0[i];
    let r = 0u + o * 16u + i;
    s += vec4f(dot(W[r],       x), dot(W[r +  4u], x),
               dot(W[r +  8u], x), dot(W[r + 12u], x));
  }
  a1[o] = max(s, vec4f(0.0));                // ReLU
}`,
  },
  ntcDispatch: {
    lang: 'wgsl',
    code: `@compute @workgroup_size(8, 8)
fn cs(@builtin(global_invocation_id) id : vec3u) {
  if (any(id.xy >= V.size)) { return; }
  let s = (vec2f(id.xy) + 0.5) / vec2f(V.size);
  let uv = vec2f(V.centerX, V.centerY)
         + (s - 0.5) * vec2f(V.aspect, 1.0) / V.zoom;
  if (any(uv < vec2f(0.0)) || any(uv > vec2f(1.0))) { return; }
  let d = mlp(uv);
  for (var l = 0u; l < OUT4; l++) {
    textureStore(outTex, id.xy, l, d[l]);
  }
}`,
  },
  /* Raiders Sudoku — la transposition ne déplace aucun réel. */
  matTranspose: {
    lang: 'c',
    code: `void mat_transpose(Matrix* mat) {
    int temp = mat->rows;
    mat->rows = mat->columns;
    mat->columns = temp;

    if (mat->isTransposed) {
        mat->isTransposed = 0;
    } else {
        mat->isTransposed = 1;
    }
}

/* C'est la lecture qui paie : elle change de parcours. */
double mat_get(Matrix* mat, int row, int column) {
    if (mat->isTransposed) {
        return (mat->data)[column * (mat->rows) + row];
    }

    return (mat->data)[row * (mat->columns) + column];
}`,
  },
  /* Raiders Sudoku — une loi normale sans bibliothèque. */
  matNormal: {
    lang: 'c',
    code: `Matrix* mat_init_normal(int rows, int columns)
{
    /* ... allocation ... */
    int mid = (rows * columns) / 2;

    for (int i = 0; i <= mid; ++i) {
        /* Méthode polaire de Marsaglia : on tire dans le carré
           jusqu'à tomber dans le disque, et le couple rejeté
           coûte moins cher qu'un sinus. */
        double x, y, s;
        do {
            x = ((double) rand() / RAND_MAX) * 2.0 - 1.0;
            y = ((double) rand() / RAND_MAX) * 2.0 - 1.0;
            s = x * x + y * y;
        } while (s <= 0 || s >= 1);

        /* Un tirage donne deux valeurs : une par moitié du tampon. */
        (result->data)[i] = (x * sqrt((-2.0 * log(s)) / s)) / 2.0;
        if (mid + i < rows * columns) {
            (result->data)[mid + i] = (y * sqrt((-2.0 * log(s)) / s)) / 2.0;
        }
    }

    return result;
}`,
  },
  /* U-Net — l'augmentation doit retourner l'image ET son masque. */
  unetDataset: {
    lang: 'python',
    code: `class CocoBinarySegDataset(Dataset):
    """Avant-plan / arrière-plan, tenseurs déjà en RAM."""

    def __getitem__(self, i):
        idx = self.indices[i]
        img = self.images[idx].float() / 255.0
        mask = self.masks[idx].float()

        # Un seul tirage pour les deux : retourner l'image sans
        # retourner son masque, c'est apprendre le contraire.
        if self.augment and random.random() < 0.5:
            img = torch.flip(img, dims=[2])
            mask = torch.flip(mask, dims=[2])

        return img, mask`,
  },
  /* U-Net — une seule fonction pour l'entraînement et la validation. */
  unetEpoch: {
    lang: 'python',
    code: `def run_epoch(model, loader, optimizer=None):
    # Passer un optimiseur, ou non : c'est tout ce qui distingue
    # une époque d'entraînement d'une époque de validation.
    training = optimizer is not None
    model.train() if training else model.eval()

    with torch.set_grad_enabled(training):
        for imgs, masks in loader:
            imgs, masks = imgs.to(device), masks.to(device)
            logits = model(imgs)
            loss = criterion(logits, masks)
            if training:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
            # ... cumul de loss, Dice, IoU, exactitude ...
    return tot_loss / n, tot_dice / n, tot_iou / n, tot_acc / n


for epoch in range(1, EPOCHS + 1):
    train_loss, train_dice, _, _ = run_epoch(model, train_loader, optimizer)
    val_loss, val_dice, val_iou, _ = run_epoch(model, val_loader)
    scheduler.step(val_dice)

    # Le modèle retenu est celui du meilleur Dice de validation,
    # pas celui de la dernière époque.
    if val_dice > best_val_dice:
        best_val_dice, best_epoch = val_dice, epoch
        best_state = copy.deepcopy(
            {k: v.cpu() for k, v in model.state_dict().items()})`,
  },
  /*
   * ── Extraits du cours « Du rayon au pixel » ──────────────────────────
   *
   * Recopiés de `raymarcher/`, à la lettre : `source` dit d'où, ligne comprise,
   * et la légende l'affiche. Une élision est toujours écrite comme un
   * commentaire « … » — jamais une ligne réécrite. Le seul extrait qui ne vient pas du dépôt est marqué
   * `source: 'course'` : il a été écrit pour le cours, et la page le dit.
   */
  coursePixel: {
    lang: 'cpp',
    source: 'raymarcher/src/core/camera.cpp:25',
    code: `Point3 Camera::pixel_position(const float i, const float j, const size_t nx,
                              const size_t ny) const
{
    const float ux = 2.0f * (i / static_cast<float>(nx) - 0.5f);
    const float vy = 2.0f * (0.5f - j / static_cast<float>(ny));

    return center_ + w_ + (u_ * (ux * half_width_))
        + (v_ * (vy * half_height_));
}`,
  },
  courseRaySphere: {
    lang: 'cpp',
    source: 'course',
    code: `// |o + t·d − center|² = r²  →  t² + 2b·t + c = 0
// avec |d| = 1, b = oc·d et c = |oc|² − r²
std::optional<float> hit_sphere(const Ray& ray, const Point3& center, float r)
{
    const Vector3 oc = ray.origin() - center;
    const float b = oc.dot(ray.direction());
    const float c = oc.dot(oc) - r * r;
    const float disc = b * b - c;       // le discriminant, divisé par 4

    if (disc < 0.0f)
        return std::nullopt;            // le rayon passe à côté
    const float s = std::sqrt(disc);
    if (-b - s > 0.0f)
        return -b - s;                  // l'entrée
    if (-b + s > 0.0f)
        return -b + s;                  // la sortie : l'origine est dedans
    return std::nullopt;                // la sphère est derrière le rayon
}`,
  },
  courseMarch: {
    lang: 'cpp',
    source: 'raymarcher/src/scene/scene.cpp:172',
    code: `for (int i = 0; i < MAX_STEPS; i++)
{
    Point3 p = ray.at(d);
    SceneHit hit = get_scene_data(p);

    if (hit.distance < SURF_DIST)
    { // Hit surface
        /* … ombrage : voir les chapitres suivants … */
    }

    float step = hit.distance * 0.7f;

    d += step;
    if (d > MAX_DIST)
        break;
}`,
  },
  courseNormal: {
    lang: 'cpp',
    source: 'raymarcher/src/scene/scene.cpp:131',
    code: `Vector3 Scene::get_normal(const Point3& p, const SDF* sdf, float dp) const
{
    const float eps = 0.001f;
    const Vector3 dx(eps, 0, 0), dy(0, eps, 0), dz(0, 0, eps);
    return Vector3(sdf->distance(p + dx) - dp, sdf->distance(p + dy) - dp,
                   sdf->distance(p + dz) - dp)
        .normalized();
}`,
  },
  courseLambert: {
    lang: 'cpp',
    source: 'raymarcher/src/scene/scene.cpp:198',
    code: `// Diffuse (Lambertian)
float diff = std::max(normal.dot(light_dir), 0.0f);
final_color +=
    params.kd * light->get_color() * diff * shadow_term;`,
  },
  courseBlinn: {
    lang: 'cpp',
    source: 'raymarcher/src/scene/scene.cpp:203',
    code: `// Specular (Blinn-Phong)
Vector3 half_dir = (light_dir + view_dir).normalized();
float spec =
    std::pow(std::max(normal.dot(half_dir), 0.0f), params.ns);
final_color +=
    params.ks * light->get_color() * spec * shadow_term;`,
  },
  courseShadow: {
    lang: 'cpp',
    source: 'raymarcher/src/scene/scene.cpp:140',
    code: `float Scene::get_shadows(const Point3& p, const Vector3& light_dir,
                         float dist_to_light, const Vector3& normal,
                         float softness) const
{
    Point3 ro = p + normal * 0.05f;
    float t = 0.05f;
    float min_h = 1e20f; // distance minimale rencontrée

    for (int i = 0; i < MAX_STEPS; i++)
    {
        Point3 curr_p = ro + light_dir * t;
        float h = get_min_distance(curr_p);

        if (h < SURF_DIST)
            return 0.0f;

        // Track la distance min, pondérée par la distance parcourue
        min_h = std::min(min_h, softness * h / t);

        t += std::max(h, 0.02f);
        if (t >= dist_to_light - 0.05f || t > MAX_DIST)
            break;
    }

    return std::clamp(min_h, 0.0f, 1.0f);
}`,
  },
  courseMirror: {
    lang: 'cpp',
    source: 'raymarcher/src/scene/scene.cpp:211',
    code: `// Reflection
if (depth > 0 && params.kr.luminance() > 0.0f)
{
    Vector3 refl_dir =
        ray_dir - normal * (2.0f * ray_dir.dot(normal));

    Point3 refl_origin = p + normal * (SURF_DIST * 2.0f);
    Ray refl_ray(refl_origin, refl_dir);

    Color refl_color = march(refl_ray, depth - 1);
    Color unit(1, 1, 1);
    final_color =
        (unit - params.kr) * final_color + params.kr * refl_color;
}`,
  },
} as const;

export type SnippetKey = keyof typeof snippets;

export type Block =
  | { type: 'text'; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; snippet: SnippetKey; caption?: string }
  /** Référence une clé de `shots`. */
  | { type: 'media'; shot: string }
  /** Référence une clé de `clips` ; son texte vit dans `shots` (alt + légende). */
  | { type: 'video'; clip: string }
  /** Référence une série de `datasets` ; titre et note sont localisés. */
  | { type: 'chart'; dataset: DatasetKey; title: string; note?: string }
  /** Rendu WebGPU interactif ; son texte vit dans `src/i18n/ui.ts`. */
  | { type: 'live' }
  /**
   * Un schéma calculé à la compilation (`src/components/diagrams/`). Son texte
   * de remplacement vit dans `src/i18n/ui.ts` ; la légende, elle, est ici.
   */
  | { type: 'diagram'; diagram: DiagramKey; caption: string }
  /**
   * La place d'une figure qui n'existe pas encore. Réservé aux notes en
   * brouillon (`draft: true`), qui ne sont jamais publiées : un cadre en
   * pointillés marque l'endroit où l'image viendra.
   */
  | { type: 'placeholder' };

export interface Section {
  id: string;
  /** Surtitre court, ex. '01'. */
  kicker: string;
  title: string;
  blocks: Block[];
}

/** Tout ce qui se traduit, pour un projet. */
interface ProjectText {
  tagline: string;
  /** 2 phrases, pas plus. */
  description: string;
  /** Alt + légende de chaque visuel (images comme vidéos). */
  shots: Record<string, { alt: string; caption: string }>;
  sections: Section[];
}

/**
 * Famille d’un projet. L’accueil range les barres sous ces trois titres, dans
 * l’ordre de `categoryOrder` : c’est la seule table des matières du site.
 */
export type Category = 'rendering' | 'vision' | 'systems';

export const categoryOrder = ['rendering', 'vision', 'systems'] as const;

/**
 * Les tags — la seconde entrée du dossier.
 *
 * Une famille (`Category`) range un projet une fois pour toutes : c'est le plan
 * de la page. Un tag le range autant de fois qu'il le mérite, et c'est ce qui
 * permet de demander « les projets en C++ » ou « ceux qui touchent au GPU »
 * sans que ces questions aient à découper la page.
 *
 * Deux groupes, parce qu'on ne cherche pas de la même façon : le langage qu'on
 * connaît, ou le domaine qui intéresse. Les libellés de langage ne se
 * traduisent pas (`tagLabels`) ; ceux de domaine vivent dans `src/i18n/ui.ts`,
 * sous la clé `tag.<nom>`.
 *
 * Pour ajouter un tag : une entrée ici, sa traduction dans `ui.ts` si c'est un
 * domaine, et il apparaît de lui-même dans le filtre de l'accueil — qui ne
 * montre jamais que les tags réellement portés par un projet.
 */
export const tagGroups = {
  langs: ['cpp', 'c', 'python'],
  fields: [
    'rendering',
    'gpu',
    'imaging',
    'vision',
    'deep-learning',
    'machine-learning',
    'systems',
    'optimization',
  ],
} as const;

export type Tag = (typeof tagGroups)[keyof typeof tagGroups][number];

/** Tous les tags, langages d'abord, dans l'ordre d'affichage du filtre. */
export const allTags: readonly Tag[] = [...tagGroups.langs, ...tagGroups.fields];

/** Les libellés qui s'écrivent pareil dans les trois langues. */
export const tagLabels: Partial<Record<Tag, string>> = {
  cpp: 'C++',
  c: 'C',
  python: 'Python',
};

/**
 * L’accent d’un projet. Il ne remplit rien : il colore un filet, un numéro, un
 * titre au survol. C’est le même sur sa ligne d’accueil et sur sa page, si bien
 * qu’on reconnaît où l’on vient d’arriver avant d’avoir lu le titre.
 *
 * Les six valeurs sont les six accents de la palette (`--color-accent-*`),
 * c’est-à-dire les six accents de Dracula.
 */
export type Tone = 'cyan' | 'green' | 'orange' | 'pink' | 'purple' | 'yellow';

interface ProjectDef {
  slug: string;
  /** Non traduit — même titre dans les trois langues. */
  title: string;
  category: Category;
  tone: Tone;
  /**
   * Projet encore ouvert. Il porte alors une mention, sur sa ligne comme sur sa
   * page — c’est ce que les années disaient avant de disparaître, en plus
   * honnête : « en cours » se vérifie, « 2026 » se périme.
   */
  status?: 'wip';
  tech: string[];
  /**
   * Les tags du projet, pour le filtre de l'accueil. La pile technique (`tech`)
   * dit ce qui a servi ; les tags disent de quoi il s'agit — et une liste de
   * dix technos ne se parcourt pas, là où sept domaines se cliquent.
   */
  tags: Tag[];
  /**
   * Deux ou trois chiffres du projet, affichés au survol de sa ligne.
   *
   * Ils ne se traduisent pas, et c'est une contrainte d'écriture : **pas de
   * mots**, seulement des nombres et des unités lues pareil dans les trois
   * langues (`fps`, `dB`, `bpp`, `µs`, `%`, `px`, `Dice`, `MNIST`…). Le
   * séparateur décimal est le point, pas la virgule : une page anglaise
   * afficherait sinon « 38,9 dB ».
   *
   * Ils sont recopiés des sections, jamais inventés — si un chiffre n'est pas
   * démontré plus bas dans la page, il n'a rien à faire ici. Un projet qui n'a
   * rien de mesuré n'en porte pas : Tiger, par exemple, n'affiche aucun HUD
   * plutôt qu'un chiffre de complaisance.
   */
  metrics?: string[];
  /**
   * URL du dépôt public. Absente, le projet est signalé comme dépôt privé :
   * plusieurs sont des rendus d'école, que leur école ne veut pas en ligne.
   */
  repo?: string;
  shots: Record<string, Shot>;
  clips?: Record<string, Clip>;
  /** Clé du visuel de couverture (toujours une image). */
  cover: string;
  /**
   * Clé d’une vidéo qui ouvre la page projet à la place de la couverture.
   * La couverture, elle, reste l’image de partage (`og:image`).
   */
  leadClip?: string;
  /** Clés des visuels de la galerie, dans l’ordre. */
  gallery: string[];
  text: Record<Locale, ProjectText>;
}

/* ── Projets ───────────────────────────────────────────────────────── */

const raymarcher: ProjectDef = {
  slug: 'raymarcher',
  category: 'rendering',
  title: 'Chess Ray Marcher',
  tone: 'pink',
  tech: ['C++20', 'CMake', 'OpenMP', 'Ray Marching', 'SDF'],
  tags: ['cpp', 'rendering'],
  metrics: ['2650 × 1656 px', '256 iter.'],
  repo: 'https://github.com/Neww3r/zugzwang',

  shots: {
    board: { image: boardImage },
    pawn: { image: pawnGif },
    knight: { image: knightGif },
  },
  cover: 'board',
  gallery: ['pawn', 'knight'],

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      tagline: 'A CPU renderer in C++20 that draws a chess game from its PGN file',
      description:
        'No meshes, no 3D assets: the six pieces are signed distance functions, written by hand. The renderer replays a PGN and computes one image per half-move.',
      shots: {
        board: {
          alt: 'Render of a full chessboard in the starting position, black and white theme, with cast shadows and the pieces reflected on the board.',
          caption: 'Starting position, 2650×1656 — soft shadows and reflections.',
        },
        pawn: {
          alt: 'Animation showing the chess pawn built up layer by layer: the base, then the body, the neck and finally the spherical head.',
          caption: 'The pawn, primitive by primitive: a 2D profile, before revolution.',
        },
        knight: {
          alt: 'Animation showing the chess knight built up layer by layer: the base, the neck, the tilted muzzle, then the ears.',
          caption: 'The knight: no revolution here — volumes added, carved, intersected.',
        },
      },
      sections: [
        {
          id: 'ray-marching',
          kicker: '01',
          title: 'Ray marching',
          blocks: [
            {
              type: 'text',
              content:
                'A classic ray tracer solves an equation to find where a ray meets a surface. Ray marching solves nothing — it walks. A signed distance function tells it exactly how far it can walk without hitting anything.',
            },
            { type: 'code', snippet: 'marchLoop', caption: 'src/scene/scene.cpp' },
            {
              type: 'text',
              content:
                'The loop ends on a hit (closer than 0.001), when the ray escapes (past 200 units), or after 256 steps. The 0.7 factor is a safety margin: composed fields slightly overestimate the distance, so stepping short avoids tunnelling through thin surfaces.',
            },
          ],
        },
        {
          id: 'sdf',
          kicker: '02',
          title: 'Distance fields',
          blocks: [
            {
              type: 'text',
              content:
                'length(p) - r is a sphere. One line, no vertex, no resolution. And since a shape is just a number, combining shapes means combining numbers:',
            },
            {
              type: 'list',
              items: [
                'min(a, b) — union',
                'max(a, b) — intersection',
                'max(a, -b) — subtraction: a, hollowed out by b',
                'blend(a, b, k) — union with a fillet of width k',
              ],
            },
            { type: 'code', snippet: 'blend', caption: 'src/sdf/sdf.hh — polynomial smooth min' },
            {
              type: 'text',
              content:
                'Two folds finish the vocabulary: replacing p.x with |p.x| mirrors space, so only one half needs modelling; replacing (x, z) with √(x² + z²) turns a 2D profile into a solid of revolution.',
            },
          ],
        },
        {
          id: 'pieces',
          kicker: '03',
          title: 'Modelling a piece',
          blocks: [
            {
              type: 'text',
              content:
                'The pawn is a revolution: five 2D ellipses and a circle, stacked in the (radial, height) plane.',
            },
            { type: 'media', shot: 'pawn' },
            {
              type: 'text',
              content:
                'The smoothing width is what styles it. k = 0.3 under the head keeps a crisp groove; k = 3.0 between shaft and belly melts two ellipses into one continuous curve.',
            },
            { type: 'code', snippet: 'pawnAssembly', caption: 'src/sdf/chess/pawn_sdf.cpp' },
            {
              type: 'text',
              content:
                'The knight has no revolution symmetry, so it is carved instead: a tilted round cone for the neck, a second one rotated 1.3 rad for the muzzle, half-spaces to hollow the cheeks, and a final intersection to keep everything inside a piece’s envelope.',
            },
            { type: 'media', shot: 'knight' },
          ],
        },
        {
          id: 'image',
          kicker: '04',
          title: 'From shape to image',
          blocks: [
            {
              type: 'text',
              content:
                'Normals come out of the field itself: three extra evaluations, one per axis, approximate the gradient. Soft shadows are nearly free — march towards the light and keep the smallest distance you brushed past.',
            },
            {
              type: 'list',
              items: [
                'Blinn-Phong shading, recursive reflections, gamma 1/2.2.',
                'An 8×8 grid: a square only tests the pieces whose bounding sphere covers it, instead of all 32.',
                'Adaptive supersampling: one sample per pixel, edge detection against the 8 neighbours, then 16 samples on edges only.',
                'Render loop parallelised with OpenMP.',
              ],
            },
            {
              type: 'text',
              content:
                'The pipeline replays the PGN move by move: one scene per position, one PPM per scene, ffmpeg for the GIF. A 40-move game is 80 renders.',
            },
            {
              type: 'text',
              content:
                'Below, that engine runs in your browser. The six distance fields, the 8×8 grid, Blinn-Phong and the soft shadows were ported to WGSL line by line — same formulas, same constants. What takes the CPU minutes takes the GPU one frame, so the game can be stepped through move by move.',
            },
            { type: 'live' },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      tagline: 'Un moteur de rendu CPU en C++20 qui dessine une partie d’échecs depuis son PGN',
      description:
        "Aucun mesh, aucun asset 3D : les six pièces sont des fonctions de distance signée, écrites à la main. Le moteur rejoue un PGN et calcule une image par demi-coup.",
      shots: {
        board: {
          alt: "Rendu d’un échiquier complet en position de départ, thème noir et blanc, avec ombres portées et reflets des pièces sur le plateau.",
          caption: 'Position de départ, 2650×1656 — ombres douces et réflexions.',
        },
        pawn: {
          alt: "Animation montrant le pion d’échecs se construire strate par strate : la base, puis le corps, le col et enfin la tête sphérique.",
          caption: 'Le pion, primitive par primitive : un profil 2D, avant révolution.',
        },
        knight: {
          alt: "Animation montrant le cavalier d’échecs se construire strate par strate : la base, l’encolure, le museau incliné, puis les oreilles.",
          caption: 'Le cavalier : pas de révolution ici — des volumes ajoutés, taillés, intersectés.',
        },
      },
      sections: [
        {
          id: 'ray-marching',
          kicker: '01',
          title: 'Le ray marching',
          blocks: [
            {
              type: 'text',
              content:
                "Un lancer de rayon classique résout une équation pour trouver où le rayon coupe une surface. Le ray marching, lui, ne résout rien : il avance. Et une fonction de distance signée lui dit exactement de combien il peut avancer sans rien toucher.",
            },
            { type: 'code', snippet: 'marchLoop', caption: 'src/scene/scene.cpp' },
            {
              type: 'text',
              content:
                "La boucle s’arrête sur un contact (sous 0,001), quand le rayon s’échappe (au-delà de 200), ou après 256 pas. Le facteur 0,7 est une marge : les SDF composées surestiment un peu la distance, donc avancer moins évite de traverser une surface fine.",
            },
          ],
        },
        {
          id: 'sdf',
          kicker: '02',
          title: 'Les champs de distance',
          blocks: [
            {
              type: 'text',
              content:
                "length(p) - r, c’est une sphère. Une ligne, aucun sommet, aucune résolution. Et comme une forme n’est qu’un nombre, combiner des formes revient à combiner des nombres :",
            },
            {
              type: 'list',
              items: [
                'min(a, b) — union',
                'max(a, b) — intersection',
                'max(a, -b) — soustraction : a, dans lequel on creuse b',
                'blend(a, b, k) — union avec un congé de largeur k',
              ],
            },
            { type: 'code', snippet: 'blend', caption: 'src/sdf/sdf.hh — le smooth min polynomial' },
            {
              type: 'text',
              content:
                "Deux symétries complètent le vocabulaire : remplacer p.x par |p.x| plie l’espace, on ne modélise qu’une moitié ; remplacer (x, z) par √(x² + z²) transforme un profil 2D en solide de révolution.",
            },
          ],
        },
        {
          id: 'pieces',
          kicker: '03',
          title: 'Modéliser une pièce',
          blocks: [
            {
              type: 'text',
              content:
                'Le pion est un solide de révolution : cinq ellipses 2D et un cercle, empilés dans le plan (radial, hauteur).',
            },
            { type: 'media', shot: 'pawn' },
            {
              type: 'text',
              content:
                "C’est la largeur du raccord qui fait le style. k = 0,3 sous la tête garde un creux net ; k = 3,0 entre le fût et le ventre fond deux ellipses en une seule courbe.",
            },
            { type: 'code', snippet: 'pawnAssembly', caption: 'src/sdf/chess/pawn_sdf.cpp' },
            {
              type: 'text',
              content:
                "Le cavalier n’a pas de symétrie de révolution : il est taillé. Un cône arrondi incliné pour l’encolure, un second tourné de 1,3 rad pour le museau, des demi-espaces pour creuser les joues, et une intersection finale pour contenir le tout dans le gabarit d’une pièce.",
            },
            { type: 'media', shot: 'knight' },
          ],
        },
        {
          id: 'image',
          kicker: '04',
          title: 'De la forme à l’image',
          blocks: [
            {
              type: 'text',
              content:
                "La normale sort du champ lui-même : trois évaluations de plus, une par axe, approchent le gradient. Les ombres douces sont presque gratuites — on marche vers la lumière et on garde la plus petite distance frôlée.",
            },
            {
              type: 'list',
              items: [
                'Ombrage Blinn-Phong, réflexions récursives, gamma 1/2,2.',
                'Grille 8×8 : chaque case ne teste que les pièces dont la sphère englobante la recouvre, au lieu des 32.',
                'Supersampling adaptatif : 1 échantillon par pixel, détection des contours sur les 8 voisins, puis 16 échantillons sur les contours seulement.',
                'Boucle de rendu parallélisée avec OpenMP.',
              ],
            },
            {
              type: 'text',
              content:
                'Le pipeline rejoue le PGN coup par coup : une scène par position, un PPM par scène, ffmpeg pour le GIF. Une partie de 40 coups, ce sont 80 rendus.',
            },
            {
              type: 'text',
              content:
                "Ci-dessous, ce moteur tourne dans votre navigateur. Les six champs de distance, la grille 8×8, le Blinn-Phong et les ombres douces ont été portés en WGSL ligne à ligne — mêmes formules, mêmes constantes. Ce qui prend des minutes au processeur prend une image au GPU : la partie se parcourt coup par coup.",
            },
            { type: 'live' },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      tagline: 'Ein CPU-Renderer in C++20, der eine Schachpartie aus ihrer PGN-Datei zeichnet',
      description:
        'Keine Meshes, keine 3D-Assets: die sechs Figuren sind handgeschriebene Signed-Distance-Funktionen. Der Renderer spielt eine PGN nach und berechnet ein Bild pro Halbzug.',
      shots: {
        board: {
          alt: 'Rendering eines vollständigen Schachbretts in der Startstellung, in Schwarz-Weiß, mit Schattenwurf und Spiegelungen der Figuren auf dem Brett.',
          caption: 'Startstellung, 2650×1656 — weiche Schatten und Spiegelungen.',
        },
        pawn: {
          alt: 'Animation, die den Bauern Schicht für Schicht entstehen lässt: der Sockel, dann der Körper, der Hals und schließlich der kugelförmige Kopf.',
          caption: 'Der Bauer, Primitive für Primitive: ein 2D-Profil, vor der Rotation.',
        },
        knight: {
          alt: 'Animation, die den Springer Schicht für Schicht entstehen lässt: der Sockel, der Hals, die geneigte Schnauze, dann die Ohren.',
          caption: 'Der Springer: hier keine Rotation — Volumen addiert, ausgehöhlt, geschnitten.',
        },
      },
      sections: [
        {
          id: 'ray-marching',
          kicker: '01',
          title: 'Ray Marching',
          blocks: [
            {
              type: 'text',
              content:
                'Klassisches Raytracing löst eine Gleichung, um den Schnittpunkt von Strahl und Oberfläche zu finden. Ray Marching löst nichts — es geht. Eine Signed-Distance-Funktion sagt ihm genau, wie weit es gehen kann, ohne etwas zu treffen.',
            },
            { type: 'code', snippet: 'marchLoop', caption: 'src/scene/scene.cpp' },
            {
              type: 'text',
              content:
                'Die Schleife endet bei einem Treffer (unter 0,001), wenn der Strahl entkommt (jenseits von 200) oder nach 256 Schritten. Der Faktor 0,7 ist eine Sicherheitsmarge: zusammengesetzte Felder überschätzen die Distanz leicht, kürzere Schritte verhindern das Durchstoßen dünner Flächen.',
            },
          ],
        },
        {
          id: 'sdf',
          kicker: '02',
          title: 'Distanzfelder',
          blocks: [
            {
              type: 'text',
              content:
                'length(p) - r ist eine Kugel. Eine Zeile, kein Vertex, keine Auflösung. Und weil eine Form nur eine Zahl ist, heißt Formen kombinieren: Zahlen kombinieren.',
            },
            {
              type: 'list',
              items: [
                'min(a, b) — Vereinigung',
                'max(a, b) — Schnitt',
                'max(a, -b) — Differenz: a, ausgehöhlt durch b',
                'blend(a, b, k) — Vereinigung mit einer Rundung der Breite k',
              ],
            },
            { type: 'code', snippet: 'blend', caption: 'src/sdf/sdf.hh — polynomialer Smooth-Min' },
            {
              type: 'text',
              content:
                'Zwei Spiegelungen vervollständigen das Vokabular: p.x durch |p.x| ersetzen faltet den Raum, man modelliert nur eine Hälfte; (x, z) durch √(x² + z²) ersetzen macht aus einem 2D-Profil einen Rotationskörper.',
            },
          ],
        },
        {
          id: 'pieces',
          kicker: '03',
          title: 'Eine Figur modellieren',
          blocks: [
            {
              type: 'text',
              content:
                'Der Bauer ist ein Rotationskörper: fünf 2D-Ellipsen und ein Kreis, gestapelt in der Ebene (radial, Höhe).',
            },
            { type: 'media', shot: 'pawn' },
            {
              type: 'text',
              content:
                'Die Breite der Rundung macht den Stil. k = 0,3 unter dem Kopf hält eine scharfe Kehle; k = 3,0 zwischen Schaft und Bauch verschmilzt zwei Ellipsen zu einer einzigen Kurve.',
            },
            { type: 'code', snippet: 'pawnAssembly', caption: 'src/sdf/chess/pawn_sdf.cpp' },
            {
              type: 'text',
              content:
                'Der Springer hat keine Rotationssymmetrie, also wird er geschnitten: ein geneigter Round Cone für den Hals, ein zweiter um 1,3 rad gedreht für die Schnauze, Halbräume zum Aushöhlen der Wangen und ein finaler Schnitt, der alles in der Silhouette einer Figur hält.',
            },
            { type: 'media', shot: 'knight' },
          ],
        },
        {
          id: 'image',
          kicker: '04',
          title: 'Von der Form zum Bild',
          blocks: [
            {
              type: 'text',
              content:
                'Die Normale kommt aus dem Feld selbst: drei zusätzliche Auswertungen, eine pro Achse, nähern den Gradienten. Weiche Schatten sind fast gratis — man marschiert zum Licht und behält die kleinste gestreifte Distanz.',
            },
            {
              type: 'list',
              items: [
                'Blinn-Phong-Shading, rekursive Spiegelungen, Gamma 1/2,2.',
                'Ein 8×8-Gitter: ein Feld testet nur die Figuren, deren Hüllkugel es überdeckt, statt aller 32.',
                'Adaptives Supersampling: ein Sample pro Pixel, Kantenerkennung über die 8 Nachbarn, dann 16 Samples nur auf Kanten.',
                'Render-Schleife mit OpenMP parallelisiert.',
              ],
            },
            {
              type: 'text',
              content:
                'Die Pipeline spielt die PGN Zug für Zug nach: eine Szene pro Stellung, ein PPM pro Szene, ffmpeg für das GIF. Eine Partie mit 40 Zügen sind 80 Renderings.',
            },
            {
              type: 'text',
              content:
                'Unten läuft genau diese Engine im Browser. Die sechs Distanzfelder, das 8×8-Gitter, Blinn-Phong und die weichen Schatten wurden Zeile für Zeile nach WGSL portiert — dieselben Formeln, dieselben Konstanten. Was die CPU Minuten kostet, kostet die GPU ein Bild: die Partie lässt sich Zug für Zug durchgehen.',
            },
            { type: 'live' },
          ],
        },
      ],
    },
  },
};

/* ── Détecteur de mouvement CUDA ───────────────────────────────────── */

const cudaMotion: ProjectDef = {
  slug: 'cuda-motion',
  category: 'rendering',
  title: 'CUDA Motion Filter',
  tone: 'green',
  tech: ['CUDA', 'C++17', 'GStreamer', 'CMake', 'Nsight'],
  tags: ['cpp', 'gpu', 'imaging'],
  metrics: ['1215 fps', '218 µs', '×15'],

  shots: {
    mask: { image: maskImage },
    kernelTime: { image: kernelTimeImage, background: 'light' },
  },
  clips: {
    demo: { src: detectionClip, width: 1744, height: 1082 },
  },
  cover: 'mask',
  // Le filtre se voit mieux en mouvement qu’à l’arrêt : la page s’ouvre sur la
  // vidéo. `cover` reste une image — le partage (`og:image`) en a besoin.
  leadClip: 'demo',
  gallery: ['kernelTime'],

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      tagline: 'A background-subtraction filter ported from CPU to CUDA, then profiled and tuned',
      description:
        'A GStreamer element that flags moving pixels in a video stream: background model, morphology, hysteresis. Written first in C++ as the reference, then rewritten kernel by kernel in CUDA — the interesting part is the four optimisation passes that followed.',
      shots: {
        mask: {
          alt: 'Frame from a traffic video where every moving car is painted in translucent red by the filter, while the road and the roadside stay untouched.',
          caption: 'Filter output: moving pixels marked in red, everything static left alone.',
        },
        demo: {
          alt: 'Three-second screen capture of the filter running on a live stream: the moving subject is tracked in red frame after frame while the background stays clear.',
          caption: 'The filter live, in the GStreamer pipeline — no sound.',
        },
        kernelTime: {
          alt: 'Donut chart splitting GPU time across kernels: background_update takes 66.5 %, erode_disk 10.3 %, reconstruction 9.7 %, dilate_disk 9.6 %, everything else under 4 %.',
          caption: 'Nsight profile, straight from the project report: one kernel owns two thirds of the frame.',
        },
      },
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'One frame, six kernels',
          blocks: [
            {
              type: 'text',
              content:
                'The filter is a GStreamer plugin: the same element exists as a CPU library and a CUDA one, swapped by a symlink, so both can be compared on the same stream. Every frame goes through the same five stages.',
            },
            {
              type: 'list',
              items: [
                'Background model: each pixel keeps 4 colour reservoirs; a match within an RGB distance of 20 reinforces one (weight capped at 50), otherwise a randomly drawn reservoir is replaced.',
                'Distance to the model gives a score image, turned into a raw mask.',
                'Morphological opening with a disk of radius 3, then closing with a disk of radius 2 — removes speckle, closes holes.',
                'Hysteresis thresholding: pixels above 30 are seeds, pixels above 15 survive only if connected to a seed, propagated by an iterative reconstruction kernel.',
                'The mask is composited over the frame in red.',
              ],
            },
            {
              type: 'text',
              content:
                'Each stage is one CUDA kernel over a 16×16 block grid — two for the morphology, one to erode and one to dilate. Validating on CPU first meant the GPU port always had a reference output to be compared against, frame by frame.',
            },
            { type: 'media', shot: 'mask' },
          ],
        },
        {
          id: 'profiling',
          kicker: '02',
          title: 'Measure before optimising',
          blocks: [
            {
              type: 'text',
              content:
                'Nsight says where the time goes, and it is not spread evenly: two thirds of the GPU time sits in a single kernel.',
            },
            { type: 'media', shot: 'kernelTime' },
            {
              type: 'list',
              items: [
                'background_update_kernel — 66.5 % of GPU time',
                'erode_disk_kernel — 10.3 %',
                'reconstruction_kernel — 9.7 %',
                'dilate_disk_kernel — 9.6 %',
                'everything else — under 4 %',
              ],
            },
            {
              type: 'text',
              content:
                'So the background model is the only target worth attacking first. Optimising the morphology would have been polishing 20 % of the runtime.',
            },
          ],
        },
        {
          id: 'optimisations',
          kicker: '03',
          title: 'Four passes',
          blocks: [
            {
              type: 'list',
              items: [
                'Shared memory in erode/dilate: each block loads its tile once, halo included. Morphology drops from 96 to 86 µs per frame and memory throughput goes from 31.6 % to 47.7 % — real, but only 20 % of the runtime.',
                'Lazy RNG: the reservoir draw only needs a random number when no reservoir matches. Generating it on demand instead of every pixel cuts the heavy kernel from 278 to 103 µs.',
                'Structure of arrays: one array per reservoir channel instead of an array of structs, so a warp reads contiguous addresses.',
                'Work per thread: one thread handles several pixels, amortising index computation and keeping the caches warm.',
              ],
            },
            {
              type: 'chart',
              dataset: 'kernelTime',
              title: 'Total kernel time per frame',
              note: 'Lazy RNG alone accounts for almost the entire drop — it removes work from the kernel that dominates the profile.',
            },
            {
              type: 'chart',
              dataset: 'filterThroughput',
              title: 'Average throughput per version',
              note: 'Same sequence for every version. The CPU reference is the first bar; the GPU port is about 12× faster before any tuning, 15× after.',
            },
            {
              type: 'text',
              content:
                'Two lessons stuck. Shared memory is the textbook optimisation and it gained the least here, because it improved a kernel that was not the bottleneck. And once the kernels are fast, host↔device copies become the next wall: they already account for the majority of the transfer budget.',
            },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      tagline: 'Un filtre de soustraction de fond porté du CPU vers CUDA, puis profilé et optimisé',
      description:
        "Un élément GStreamer qui marque les pixels en mouvement dans un flux vidéo : modèle de fond, morphologie, hystérésis. Écrit d’abord en C++ comme référence, puis réécrit kernel par kernel en CUDA — l’intéressant est dans les quatre passes d’optimisation qui ont suivi.",
      shots: {
        mask: {
          alt: 'Image extraite d’une vidéo de circulation où chaque voiture en mouvement est peinte en rouge translucide par le filtre, tandis que la route et les bords restent intacts.',
          caption: 'Sortie du filtre : les pixels en mouvement en rouge, le décor fixe intact.',
        },
        demo: {
          alt: 'Capture d’écran de trois secondes montrant le filtre tourner sur un flux en direct : le sujet en mouvement est suivi en rouge image après image, le fond reste net.',
          caption: 'Le filtre en direct, dans le pipeline GStreamer — sans son.',
        },
        kernelTime: {
          alt: 'Diagramme en anneau répartissant le temps GPU par kernel : background_update 66,5 %, erode_disk 10,3 %, reconstruction 9,7 %, dilate_disk 9,6 %, tout le reste moins de 4 %.',
          caption: 'Le profil Nsight, tiré du rapport du projet : un kernel occupe les deux tiers de l’image.',
        },
      },
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'Une image, six kernels',
          blocks: [
            {
              type: 'text',
              content:
                "Le filtre est un plugin GStreamer : le même élément existe en bibliothèque CPU et en bibliothèque CUDA, échangées par un symlink, ce qui permet de comparer les deux sur le même flux. Chaque image passe par les mêmes cinq étapes.",
            },
            {
              type: 'list',
              items: [
                "Modèle de fond : chaque pixel garde 4 réservoirs de couleur ; une correspondance à moins de 20 de distance RGB en renforce un (poids plafonné à 50), sinon un réservoir tiré au hasard est remplacé.",
                'La distance au modèle donne une image de score, convertie en masque brut.',
                'Ouverture morphologique par un disque de rayon 3, puis fermeture par un disque de rayon 2 — supprime le grain, referme les trous.',
                "Seuillage par hystérésis : au-dessus de 30 les pixels sont des germes, au-dessus de 15 ils ne survivent que s’ils touchent un germe, propagé par un kernel de reconstruction itératif.",
                'Le masque est composité en rouge sur l’image.',
              ],
            },
            {
              type: 'text',
              content:
                "Chaque étape est un kernel CUDA lancé sur une grille de blocs 16×16 — deux pour la morphologie, un pour éroder, un pour dilater. Valider d’abord sur CPU donnait au portage GPU une sortie de référence à comparer, image par image.",
            },
            { type: 'media', shot: 'mask' },
          ],
        },
        {
          id: 'profiling',
          kicker: '02',
          title: 'Mesurer avant d’optimiser',
          blocks: [
            {
              type: 'text',
              content:
                "Nsight dit où passe le temps, et la répartition est très inégale : deux tiers du temps GPU tiennent dans un seul kernel.",
            },
            { type: 'media', shot: 'kernelTime' },
            {
              type: 'list',
              items: [
                'background_update_kernel — 66,5 % du temps GPU',
                'erode_disk_kernel — 10,3 %',
                'reconstruction_kernel — 9,7 %',
                'dilate_disk_kernel — 9,6 %',
                'tout le reste — moins de 4 %',
              ],
            },
            {
              type: 'text',
              content:
                "Le modèle de fond est donc la seule cible qui vaille d’être attaquée en premier. Optimiser la morphologie, c’était polir 20 % du temps de calcul.",
            },
          ],
        },
        {
          id: 'optimisations',
          kicker: '03',
          title: 'Quatre passes',
          blocks: [
            {
              type: 'list',
              items: [
                "Mémoire partagée dans erode/dilate : chaque bloc charge sa tuile une fois, halo compris. La morphologie passe de 96 à 86 µs par image et le débit mémoire de 31,6 % à 47,7 % — réel, mais sur 20 % du temps seulement.",
                "RNG paresseux : le tirage de réservoir n’a besoin d’un nombre aléatoire que si aucun réservoir ne correspond. Le générer à la demande plutôt qu’à chaque pixel fait tomber le kernel lourd de 278 à 103 µs.",
                "Structure of arrays : un tableau par canal de réservoir au lieu d’un tableau de structures, pour qu’un warp lise des adresses contiguës.",
                'Work per thread : un thread traite plusieurs pixels, ce qui amortit le calcul d’indices et garde les caches chauds.',
              ],
            },
            {
              type: 'chart',
              dataset: 'kernelTime',
              title: 'Temps GPU cumulé par image',
              note: "Le RNG paresseux explique presque toute la baisse : il retire du travail au kernel qui domine le profil.",
            },
            {
              type: 'chart',
              dataset: 'filterThroughput',
              title: 'Débit moyen par version',
              note: 'Même séquence pour toutes les versions. La référence CPU est la première barre ; le portage GPU est environ 12× plus rapide avant réglages, 15× après.',
            },
            {
              type: 'text',
              content:
                "Deux leçons restent. La mémoire partagée est l’optimisation de manuel et c’est celle qui a le moins rapporté ici, parce qu’elle améliorait un kernel qui n’était pas le goulot. Et une fois les kernels rapides, les copies hôte↔device deviennent le mur suivant : elles occupent déjà l’essentiel du budget de transfert.",
            },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      tagline: 'Ein Hintergrundsubtraktions-Filter, von CPU auf CUDA portiert, dann profiliert und optimiert',
      description:
        'Ein GStreamer-Element, das bewegte Pixel in einem Videostream markiert: Hintergrundmodell, Morphologie, Hysterese. Zuerst in C++ als Referenz geschrieben, dann Kernel für Kernel in CUDA neu — das Interessante sind die vier Optimierungsschritte danach.',
      shots: {
        mask: {
          alt: 'Einzelbild aus einem Verkehrsvideo, in dem jedes fahrende Auto vom Filter durchscheinend rot eingefärbt wird, während Straße und Randbereiche unberührt bleiben.',
          caption: 'Ausgabe des Filters: bewegte Pixel in Rot, die statische Szene unangetastet.',
        },
        demo: {
          alt: 'Dreisekündige Bildschirmaufnahme des Filters auf einem Live-Stream: das bewegte Motiv wird Bild für Bild rot verfolgt, der Hintergrund bleibt klar.',
          caption: 'Der Filter live, in der GStreamer-Pipeline — ohne Ton.',
        },
        kernelTime: {
          alt: 'Ringdiagramm der GPU-Zeit pro Kernel: background_update 66,5 %, erode_disk 10,3 %, reconstruction 9,7 %, dilate_disk 9,6 %, alles Übrige unter 4 %.',
          caption: 'Das Nsight-Profil, direkt aus dem Projektbericht: ein Kernel belegt zwei Drittel des Bildes.',
        },
      },
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'Ein Bild, sechs Kernel',
          blocks: [
            {
              type: 'text',
              content:
                'Der Filter ist ein GStreamer-Plugin: dasselbe Element existiert als CPU- und als CUDA-Bibliothek, per Symlink getauscht — so lassen sich beide am selben Stream vergleichen. Jedes Bild durchläuft die gleichen fünf Stufen.',
            },
            {
              type: 'list',
              items: [
                'Hintergrundmodell: jedes Pixel hält 4 Farbreservoirs; eine Übereinstimmung innerhalb eines RGB-Abstands von 20 verstärkt eines (Gewicht bei 50 gedeckelt), sonst wird ein zufällig gezogenes Reservoir ersetzt.',
                'Der Abstand zum Modell ergibt ein Score-Bild, das zu einer Rohmaske wird.',
                'Morphologisches Öffnen mit einer Scheibe vom Radius 3, dann Schließen mit Radius 2 — entfernt Rauschen, schließt Löcher.',
                'Hysterese-Schwellwert: über 30 sind Pixel Keime, über 15 überleben sie nur, wenn sie mit einem Keim verbunden sind — propagiert von einem iterativen Rekonstruktions-Kernel.',
                'Die Maske wird rot über das Bild gelegt.',
              ],
            },
            {
              type: 'text',
              content:
                'Jede Stufe ist ein CUDA-Kernel auf einem 16×16-Blockgitter — zwei für die Morphologie, einer zum Erodieren, einer zum Dilatieren. Erst auf der CPU zu validieren gab der GPU-Portierung Bild für Bild eine Referenzausgabe zum Vergleich.',
            },
            { type: 'media', shot: 'mask' },
          ],
        },
        {
          id: 'profiling',
          kicker: '02',
          title: 'Messen vor dem Optimieren',
          blocks: [
            {
              type: 'text',
              content:
                'Nsight sagt, wohin die Zeit geht, und sie verteilt sich alles andere als gleichmäßig: zwei Drittel der GPU-Zeit stecken in einem einzigen Kernel.',
            },
            { type: 'media', shot: 'kernelTime' },
            {
              type: 'list',
              items: [
                'background_update_kernel — 66,5 % der GPU-Zeit',
                'erode_disk_kernel — 10,3 %',
                'reconstruction_kernel — 9,7 %',
                'dilate_disk_kernel — 9,6 %',
                'alles Übrige — unter 4 %',
              ],
            },
            {
              type: 'text',
              content:
                'Das Hintergrundmodell ist damit das einzige Ziel, das sich zuerst lohnt. Die Morphologie zu optimieren hieße, 20 % der Laufzeit zu polieren.',
            },
          ],
        },
        {
          id: 'optimisations',
          kicker: '03',
          title: 'Vier Durchgänge',
          blocks: [
            {
              type: 'list',
              items: [
                'Shared Memory in erode/dilate: jeder Block lädt seine Tile einmal, Halo inklusive. Die Morphologie fällt von 96 auf 86 µs pro Bild, der Speicherdurchsatz steigt von 31,6 % auf 47,7 % — echt, aber nur auf 20 % der Laufzeit.',
                'Lazy RNG: die Reservoir-Ziehung braucht nur dann eine Zufallszahl, wenn kein Reservoir passt. Sie bei Bedarf statt für jedes Pixel zu erzeugen senkt den schweren Kernel von 278 auf 103 µs.',
                'Structure of Arrays: ein Array pro Reservoir-Kanal statt eines Arrays von Structs, damit ein Warp zusammenhängende Adressen liest.',
                'Work per Thread: ein Thread bearbeitet mehrere Pixel, was die Indexrechnung amortisiert und die Caches warm hält.',
              ],
            },
            {
              type: 'chart',
              dataset: 'kernelTime',
              title: 'Gesamte Kernel-Zeit pro Bild',
              note: 'Lazy RNG erklärt fast den ganzen Rückgang — es nimmt genau dem Kernel Arbeit ab, der das Profil dominiert.',
            },
            {
              type: 'chart',
              dataset: 'filterThroughput',
              title: 'Durchschnittlicher Durchsatz pro Version',
              note: 'Dieselbe Sequenz für jede Version. Die CPU-Referenz ist der erste Balken; die GPU-Portierung ist vor dem Tuning etwa 12×, danach 15× schneller.',
            },
            {
              type: 'text',
              content:
                'Zwei Lehren bleiben. Shared Memory ist die Lehrbuch-Optimierung und hat hier am wenigsten gebracht, weil sie einen Kernel verbesserte, der nicht der Flaschenhals war. Und sind die Kernel schnell, wird die nächste Wand der Host↔Device-Transfer: er belegt schon den Großteil des Transferbudgets.',
            },
          ],
        },
      ],
    },
  },
};

/* ── Reconnaissance d’automates ────────────────────────────────────── */

const automata: ProjectDef = {
  slug: 'automata-vision',
  category: 'vision',
  title: 'Automata Vision',
  tone: 'green',
  tech: ['Python', 'NumPy', 'OpenCV', 'C++17', 'CMake'],
  tags: ['python', 'cpp', 'imaging', 'vision'],
  metrics: ['92.8 %', '×8 C++', '4.2 s'],
  repo: 'https://github.com/adprogit/Graph-Segmentator',

  shots: {
    input: { image: inputImage, background: 'light' },
    states: { image: statesImage, background: 'dark' },
    arcs: { image: arcsImage, background: 'dark' },
    labels: { image: labelsImage, background: 'dark' },
    hog: { image: hogImage, background: 'light' },
    dataset: { image: datasetImage, background: 'light' },
  },
  cover: 'input',
  gallery: ['states', 'arcs', 'labels', 'hog', 'dataset'],

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      tagline: 'Reading a finite automaton back out of its picture, without a neural network',
      description:
        'Input: a Graphviz rendering of a DFA. Output: its structure as text — states, initial, accepting, alphabet, transitions. Classical vision throughout: connected components, morphology, arc following, hand-written HOG and a k-NN.',
      shots: {
        input: {
          alt: 'Graphviz rendering of a deterministic finite automaton: four circular states named s0 to s3, linked by labelled arrows, three of them drawn as double circles.',
          caption: 'The input image. Nothing else is given — no graph file, no coordinates.',
        },
        states: {
          alt: 'The same automaton, binarised, with every detected state circled in red and the outer circle of accepting states in orange.',
          caption: 'Detected states in red; the second circle of accepting states in orange.',
        },
        arcs: {
          alt: 'The same automaton with each followed arrow traced in a different colour, including strongly curved arcs and self-loops.',
          caption: 'Each arc followed and coloured — this is the adjacency matrix.',
        },
        labels: {
          alt: 'The automaton where each transition letter is boxed in the colour of the arc it was attached to.',
          caption: 'Each label boxed in the colour of its arc: now transitions carry a symbol.',
        },
        hog: {
          alt: 'Visualisation of the gradient orientation histograms computed per cell over a character crop.',
          caption: 'HOG: nine orientations per 8×8 cell, 144 numbers per glyph.',
        },
        dataset: {
          alt: 'Grid of synthetic character crops rendered by Graphviz at several sizes, thicknesses and rotations.',
          caption: 'The training set, rendered by Graphviz itself — labels come for free.',
        },
      },
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'Each step erases its own work',
          blocks: [
            {
              type: 'text',
              content:
                'Otsu binarisation, then five stages: states, arrow tips, arc following, labels, recognition. The guiding rule is that every stage deletes from the image what it just consumed, so the next one faces a simpler picture.',
            },
            {
              type: 'list',
              items: [
                'States found → erased → only arrows and letters remain.',
                'Arcs followed → erased → only letters remain.',
                'Letters cropped → classified → the table can be written.',
              ],
            },
          ],
        },
        {
          id: 'segmentation',
          kicker: '02',
          title: 'Finding states and arcs',
          blocks: [
            {
              type: 'text',
              content:
                'A state is a closed circle, so its inside is a connected component of the background, fully enclosed by ink. Invert the image, take the components, keep those with a Heywood circularity above 0.85 — that is the whole detector, and it holds because Graphviz output is clean and regular.',
            },
            {
              type: 'text',
              content:
                'Accepting states are double circles, found in two passes: detect the inner circles, erase them, and whatever concentric ring is left over marks an accepting state.',
            },
            { type: 'media', shot: 'states' },
            {
              type: 'text',
              content:
                'Arrow tips are compact blobs, so a 3×3 morphological opening erodes the thin strokes and the letters but keeps the triangles. For each tip, the pixel closest to a state is the apex — that gives the destination. Following the stroke back from there yields the adjacency matrix; a label is then attached to the arc whose trace passes nearest its centroid, which works whether it sits above, below or beside the curve.',
            },
            { type: 'media', shot: 'arcs' },
            { type: 'media', shot: 'labels' },
          ],
        },
        {
          id: 'recognition',
          kicker: '03',
          title: 'Characters without a CNN',
          blocks: [
            {
              type: 'text',
              content:
                'Printed glyphs, one fixed font, clean rendering: a CNN would be oversized and opaque here. Each letter is cropped, centred in a square and resized to 32×32, then described by a HOG written by hand — Sobel gradients, unsigned orientation, nine bins per 8×8 cell, L2 normalised: 144 numbers.',
            },
            { type: 'media', shot: 'hog' },
            {
              type: 'text',
              content:
                'The classifier is a k-NN with 1/d² weighting. The training set costs nothing: the test images are rendered by Graphviz, so the characters are rendered by Graphviz too — same engine, same font, no domain gap, and the label is whatever was asked for. Augmentation adds thickness, ±8° rotation, noise and offsets.',
            },
            { type: 'media', shot: 'dataset' },
          ],
        },
        {
          id: 'results',
          kicker: '04',
          title: 'Prototype, port, cross-check',
          blocks: [
            {
              type: 'text',
              content:
                'Python stays the reference; the C++ port has to reproduce it exactly. Cross tests compare each stage — k-NN, features, segmentation, tables — against the prototype on real images, so a new feature has to be written on both sides before it counts.',
            },
            {
              type: 'list',
              items: [
                'On 150 images, both versions output byte-identical tables.',
                'C++ runs the batch in ~4.2 s against ~33.5 s for Python — about 8×.',
                'Structural score 98.1 / 97.2 / 92.8 % on simple / medium / hard.',
                'Exact reconstruction 84 / 60 / 0 % — isomorphism is all-or-nothing, one missing transition breaks it.',
              ],
            },
            {
              type: 'text',
              content:
                'The remaining failures are honest: on dense automata, arrow tips overlap. Split tips with distinct strokes can be recovered by k-means plus multi-branch following. When tips and strokes both merge, the information no longer exists in the pixels — but DFA invariants still detect it, since every state must have exactly one outgoing edge per symbol.',
            },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      tagline: 'Relire un automate fini dans son image, sans réseau de neurones',
      description:
        "Entrée : le rendu Graphviz d’un automate déterministe. Sortie : sa structure en texte — états, initial, acceptants, alphabet, transitions. Vision classique de bout en bout : composantes connexes, morphologie, suivi de tracé, HOG écrit à la main et k-NN.",
      shots: {
        input: {
          alt: "Rendu Graphviz d’un automate fini déterministe : quatre états circulaires nommés s0 à s3, reliés par des flèches étiquetées, dont trois dessinés en double cercle.",
          caption: "L’image d’entrée. Rien d’autre n’est fourni — ni fichier de graphe, ni coordonnées.",
        },
        states: {
          alt: 'Le même automate, binarisé, chaque état détecté cerclé de rouge et le cercle extérieur des états acceptants en orange.',
          caption: 'États détectés en rouge ; second cercle des acceptants en orange.',
        },
        arcs: {
          alt: 'Le même automate avec chaque flèche suivie tracée dans une couleur différente, y compris les arcs très courbés et les boucles.',
          caption: "Chaque arc suivi et colorié — c’est la matrice d’adjacence.",
        },
        labels: {
          alt: "L’automate où chaque lettre de transition est encadrée de la couleur de l’arc auquel elle a été rattachée.",
          caption: 'Chaque étiquette encadrée de la couleur de son arc : les transitions ont un symbole.',
        },
        hog: {
          alt: "Visualisation des histogrammes d’orientation des gradients calculés par cellule sur un crop de caractère.",
          caption: 'HOG : neuf orientations par cellule 8×8, soit 144 nombres par glyphe.',
        },
        dataset: {
          alt: 'Grille de crops de caractères synthétiques rendus par Graphviz à plusieurs tailles, épaisseurs et rotations.',
          caption: "Le corpus d’entraînement, rendu par Graphviz lui-même — les labels sont gratuits.",
        },
      },
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'Chaque étape efface son travail',
          blocks: [
            {
              type: 'text',
              content:
                "Binarisation d’Otsu, puis cinq étapes : états, têtes de flèches, suivi de tracé, étiquettes, reconnaissance. Le principe directeur : chaque étape efface de l’image ce qu’elle vient de traiter, si bien que la suivante affronte une image plus simple.",
            },
            {
              type: 'list',
              items: [
                'États trouvés → effacés → ne restent que flèches et lettres.',
                'Arcs suivis → effacés → ne restent que les lettres.',
                'Lettres recadrées → classées → la table peut être écrite.',
              ],
            },
          ],
        },
        {
          id: 'segmentation',
          kicker: '02',
          title: 'Trouver les états et les arcs',
          blocks: [
            {
              type: 'text',
              content:
                "Un état est un cercle fermé : son intérieur est donc une composante connexe du fond, entièrement entourée de trait. On inverse l’image, on prend les composantes, on garde celles dont la circularité de Heywood dépasse 0,85 — c’est tout le détecteur, et il tient parce qu’un rendu Graphviz est propre et régulier.",
            },
            {
              type: 'text',
              content:
                'Les états acceptants sont des doubles cercles, trouvés en deux passes : détecter les cercles intérieurs, les effacer, et tout anneau concentrique résiduel signe un état acceptant.',
            },
            { type: 'media', shot: 'states' },
            {
              type: 'text',
              content:
                "Les têtes de flèches sont des blobs compacts : une ouverture morphologique 3×3 érode les traits fins et les lettres, mais préserve les triangles. Pour chaque tête, le pixel le plus proche d’un état est l’apex — il donne la destination. Remonter le tracé depuis là donne la matrice d’adjacence ; une étiquette est ensuite rattachée à l’arc dont le tracé passe le plus près de son centroïde, ce qui marche qu’elle soit au-dessus, en dessous ou à côté de la courbe.",
            },
            { type: 'media', shot: 'arcs' },
            { type: 'media', shot: 'labels' },
          ],
        },
        {
          id: 'recognition',
          kicker: '03',
          title: 'Des caractères sans CNN',
          blocks: [
            {
              type: 'text',
              content:
                "Caractères imprimés, police fixe, rendus réguliers : un CNN serait surdimensionné et opaque. Chaque lettre est recadrée, centrée dans un carré, redimensionnée en 32×32, puis décrite par un HOG écrit à la main — gradients de Sobel, orientation non signée, neuf intervalles par cellule 8×8, normalisation L2 : 144 nombres.",
            },
            { type: 'media', shot: 'hog' },
            {
              type: 'text',
              content:
                "Le classifieur est un k-NN à vote pondéré en 1/d². Le corpus ne coûte rien : les images de test sont rendues par Graphviz, donc les caractères d’entraînement le sont aussi — même moteur, même police, aucun écart de domaine, et le label est celui qu’on a demandé. L’augmentation ajoute épaisseur, rotation ±8°, bruit et décalages.",
            },
            { type: 'media', shot: 'dataset' },
          ],
        },
        {
          id: 'results',
          kicker: '04',
          title: 'Prototype, portage, validation croisée',
          blocks: [
            {
              type: 'text',
              content:
                'Le Python reste la référence ; le portage C++ doit le reproduire à l’identique. Des tests croisés comparent chaque étape — k-NN, descripteurs, segmentation, tables — aux sorties du prototype sur des images réelles : une nouvelle fonctionnalité doit donc être écrite des deux côtés pour compter.',
            },
            {
              type: 'list',
              items: [
                'Sur 150 images, les deux versions sortent des tables identiques octet pour octet.',
                'Le C++ traite le lot en ~4,2 s contre ~33,5 s pour Python — environ 8×.',
                'Score structurel de 98,1 / 97,2 / 92,8 % sur simple / medium / hard.',
                "Reconstruction exacte 84 / 60 / 0 % — l’isomorphisme est binaire, une transition manquante suffit à le rompre.",
              ],
            },
            {
              type: 'text',
              content:
                "Les échecs restants sont honnêtes : sur les automates denses, les pointes de flèches se confondent. Quand les pointes fusionnent mais que les tracés restent distincts, un k-means et un suivi multi-branches les récupèrent. Quand pointes et tracés fusionnent, l’information n’existe plus dans les pixels — mais les invariants du DFA la détectent encore, puisque chaque état doit avoir exactement une sortie par symbole.",
            },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      tagline: 'Einen endlichen Automaten aus seinem Bild zurücklesen — ohne neuronales Netz',
      description:
        'Eingabe: das Graphviz-Rendering eines deterministischen Automaten. Ausgabe: seine Struktur als Text — Zustände, Startzustand, akzeptierende Zustände, Alphabet, Übergänge. Durchweg klassische Bildverarbeitung: Zusammenhangskomponenten, Morphologie, Linienverfolgung, handgeschriebenes HOG und ein k-NN.',
      shots: {
        input: {
          alt: 'Graphviz-Rendering eines deterministischen endlichen Automaten: vier kreisförmige Zustände s0 bis s3, verbunden durch beschriftete Pfeile, drei davon als Doppelkreis gezeichnet.',
          caption: 'Das Eingabebild. Mehr gibt es nicht — keine Graphdatei, keine Koordinaten.',
        },
        states: {
          alt: 'Derselbe Automat, binarisiert, jeder erkannte Zustand rot umkreist, der äußere Kreis akzeptierender Zustände in Orange.',
          caption: 'Erkannte Zustände in Rot; zweiter Kreis der akzeptierenden in Orange.',
        },
        arcs: {
          alt: 'Derselbe Automat, jeder verfolgte Pfeil in einer eigenen Farbe nachgezeichnet, samt stark gekrümmter Bögen und Schleifen.',
          caption: 'Jeder Bogen verfolgt und gefärbt — das ist die Adjazenzmatrix.',
        },
        labels: {
          alt: 'Der Automat, bei dem jeder Übergangsbuchstabe in der Farbe des zugeordneten Bogens umrahmt ist.',
          caption: 'Jede Beschriftung in der Farbe ihres Bogens: die Übergänge haben ein Symbol.',
        },
        hog: {
          alt: 'Visualisierung der Gradienten-Orientierungshistogramme, pro Zelle über einem Zeichen-Crop berechnet.',
          caption: 'HOG: neun Orientierungen pro 8×8-Zelle, also 144 Zahlen pro Glyphe.',
        },
        dataset: {
          alt: 'Raster synthetischer Zeichen-Crops, von Graphviz in mehreren Größen, Strichstärken und Drehungen gerendert.',
          caption: 'Der Trainingskorpus, von Graphviz selbst gerendert — die Labels sind gratis.',
        },
      },
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'Jede Stufe löscht ihre eigene Arbeit',
          blocks: [
            {
              type: 'text',
              content:
                'Otsu-Binarisierung, dann fünf Stufen: Zustände, Pfeilspitzen, Linienverfolgung, Beschriftungen, Erkennung. Leitregel: jede Stufe löscht aus dem Bild, was sie gerade verarbeitet hat — die nächste trifft auf ein einfacheres Bild.',
            },
            {
              type: 'list',
              items: [
                'Zustände gefunden → gelöscht → nur Pfeile und Buchstaben bleiben.',
                'Bögen verfolgt → gelöscht → nur Buchstaben bleiben.',
                'Buchstaben ausgeschnitten → klassifiziert → die Tabelle kann geschrieben werden.',
              ],
            },
          ],
        },
        {
          id: 'segmentation',
          kicker: '02',
          title: 'Zustände und Bögen finden',
          blocks: [
            {
              type: 'text',
              content:
                'Ein Zustand ist ein geschlossener Kreis, sein Inneres also eine Zusammenhangskomponente des Hintergrunds, vollständig von Strich umschlossen. Bild invertieren, Komponenten nehmen, die mit einer Heywood-Zirkularität über 0,85 behalten — das ist der ganze Detektor, und er hält, weil Graphviz-Ausgaben sauber und regelmäßig sind.',
            },
            {
              type: 'text',
              content:
                'Akzeptierende Zustände sind Doppelkreise, in zwei Durchgängen gefunden: innere Kreise erkennen, löschen, und jeder übrig bleibende konzentrische Ring kennzeichnet einen akzeptierenden Zustand.',
            },
            { type: 'media', shot: 'states' },
            {
              type: 'text',
              content:
                'Pfeilspitzen sind kompakte Blobs: ein morphologisches Öffnen mit 3×3 erodiert dünne Striche und Buchstaben, lässt die Dreiecke aber stehen. Für jede Spitze ist das einem Zustand nächste Pixel der Apex — er gibt das Ziel. Von dort den Strich zurückzuverfolgen ergibt die Adjazenzmatrix; eine Beschriftung wird dann dem Bogen zugeordnet, dessen Spur ihrem Schwerpunkt am nächsten kommt — gleich ob sie über, unter oder neben der Kurve liegt.',
            },
            { type: 'media', shot: 'arcs' },
            { type: 'media', shot: 'labels' },
          ],
        },
        {
          id: 'recognition',
          kicker: '03',
          title: 'Zeichen ohne CNN',
          blocks: [
            {
              type: 'text',
              content:
                'Gedruckte Glyphen, eine feste Schrift, saubere Renderings: ein CNN wäre überdimensioniert und opak. Jeder Buchstabe wird ausgeschnitten, in einem Quadrat zentriert und auf 32×32 skaliert, dann durch ein selbst geschriebenes HOG beschrieben — Sobel-Gradienten, unsignierte Orientierung, neun Bins pro 8×8-Zelle, L2-normiert: 144 Zahlen.',
            },
            { type: 'media', shot: 'hog' },
            {
              type: 'text',
              content:
                'Der Klassifikator ist ein k-NN mit 1/d²-Gewichtung. Der Korpus kostet nichts: die Testbilder werden von Graphviz gerendert, also auch die Trainingszeichen — gleiche Engine, gleiche Schrift, kein Domänenabstand, und das Label ist das, was man angefordert hat. Die Augmentierung ergänzt Strichstärke, ±8°-Drehung, Rauschen und Verschiebungen.',
            },
            { type: 'media', shot: 'dataset' },
          ],
        },
        {
          id: 'results',
          kicker: '04',
          title: 'Prototyp, Portierung, Kreuzvalidierung',
          blocks: [
            {
              type: 'text',
              content:
                'Python bleibt die Referenz; die C++-Portierung muss sie exakt reproduzieren. Kreuztests vergleichen jede Stufe — k-NN, Merkmale, Segmentierung, Tabellen — auf echten Bildern mit dem Prototyp: eine neue Funktion muss also auf beiden Seiten geschrieben werden, um zu zählen.',
            },
            {
              type: 'list',
              items: [
                'Auf 150 Bildern liefern beide Versionen Byte-identische Tabellen.',
                'C++ verarbeitet den Stapel in ~4,2 s gegenüber ~33,5 s in Python — etwa 8×.',
                'Struktureller Score 98,1 / 97,2 / 92,8 % auf simple / medium / hard.',
                'Exakte Rekonstruktion 84 / 60 / 0 % — Isomorphie ist binär, ein fehlender Übergang bricht sie.',
              ],
            },
            {
              type: 'text',
              content:
                'Die verbleibenden Fehler sind ehrlich: bei dichten Automaten verschmelzen die Pfeilspitzen. Verschmolzene Spitzen mit getrennten Strichen lassen sich per k-means und mehrzweigiger Verfolgung retten. Verschmelzen Spitzen und Striche, existiert die Information in den Pixeln nicht mehr — die DFA-Invarianten erkennen das dennoch, denn jeder Zustand braucht genau einen Ausgang pro Symbol.',
            },
          ],
        },
      ],
    },
  },
};

const toongl: ProjectDef = {
  slug: 'toongl',
  category: 'rendering',
  title: 'ToonGL',
  tone: 'cyan',
  tech: ['C++20', 'OpenGL 4.1', 'GLSL', 'CMake', 'Dear ImGui'],
  tags: ['cpp', 'gpu', 'rendering'],
  metrics: ['100 samples/px', 'GL 4.1'],
  repo: 'https://github.com/adprogit/POGL',

  shots: {
    sunrays: { image: sunraysImage },
    outlines: { image: outlinesImage },
    pines: { image: pinesImage },
    bark: { image: barkImage },
  },
  cover: 'sunrays',
  gallery: ['pines', 'bark', 'outlines'],

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      tagline: 'A real-time cel shading pipeline in OpenGL: flat tones, ink outlines, sun rays',
      description:
        'A stylized nature scene rendered in real time by a hand-written OpenGL pipeline: lighting quantized by a tone ramp, outlines inked in post-process, light scattering in screen space. Every parameter is tweakable live in a Dear ImGui panel.',
      shots: {
        sunrays: {
          alt: 'Stylized sunset render: rays of sunlight streaming between cel-shaded pine trees over a low-poly meadow.',
          caption: 'Light scattering at sunset — 100 samples marched towards the sun, per pixel.',
        },
        outlines: {
          alt: 'Cel-shaded clearing at dusk, with black outlines around every pine, rock and blade of grass.',
          caption: 'Outlines in post-process: depth edges and normal edges, the stronger of the two wins.',
        },
        pines: {
          alt: 'Three low-poly pines shaded in flat green tones on a plain grey background, without outlines.',
          caption: 'Tones flattened by the 1D ramp, before the outline pass.',
        },
        bark: {
          alt: 'Tileable pine bark texture, input of the histogram quantization.',
          caption: 'The input bark texture: its histogram picks the flat tones of the ramp.',
        },
      },
      sections: [
        {
          id: 'toon',
          kicker: '01',
          title: 'Tones, not gradients',
          blocks: [
            {
              type: 'text',
              content:
                'Toon shading replaces the smooth Lambert falloff with a handful of flat tones. The diffuse term N·L is not used as a colour but as a coordinate: it indexes a 256×1 ramp texture, quantized into a few levels built from the histogram of the object’s texture. A rim term darkens grazing edges, for the cost of one more dot product.',
            },
            { type: 'code', snippet: 'toonRamp', caption: 'shaders/fragment.shd' },
            { type: 'media', shot: 'pines' },
            { type: 'media', shot: 'bark' },
          ],
        },
        {
          id: 'outlines',
          kicker: '02',
          title: 'Ink outlines',
          blocks: [
            {
              type: 'text',
              content:
                'The scene is first rendered into an offscreen framebuffer, colour and depth. A post-process pass then draws the outlines from the depth buffer alone:',
            },
            {
              type: 'list',
              items: [
                'Depth outlines: a pixel much further than its four neighbours means one object sits in front of another.',
                'Normal outlines: normals are reconstructed from depth positions (the smaller finite difference on each axis, to avoid bleeding across silhouettes) — a sharp change in direction is a crease.',
                'The stronger of the two passes through a smoothstep threshold, then the pixel is mixed towards the ink colour.',
              ],
            },
            { type: 'media', shot: 'outlines' },
          ],
        },
        {
          id: 'rays',
          kicker: '03',
          title: 'Sun rays',
          blocks: [
            {
              type: 'text',
              content:
                'The god rays are a 2D ray march in screen space: the sun is projected to the screen, and each pixel walks 100 steps towards it. Only highlights contribute, and their weight decays with the distance travelled — the classic light-scattering trick, tinted by the sun colour.',
            },
            { type: 'code', snippet: 'godRays', caption: 'shaders/post_fragment.shd' },
          ],
        },
        {
          id: 'live',
          kicker: '04',
          title: 'Tuned live',
          blocks: [
            {
              type: 'text',
              content:
                'The whole pipeline runs at interactive rates: 8 scene passes (sky, ground, vegetation, forest) into the framebuffer, then one post pass. Every uniform is exposed in a Dear ImGui panel — outline thickness and thresholds, ray count and decay, colour grading, vignette — so each effect is judged with the eyes, not by recompiling.',
            },
            {
              type: 'list',
              items: [
                'No engine and no GLM: matrices, camera, OBJ loader and TGA reader are written by hand.',
                'C++20, OpenGL 4.1 core, GLEW/GLUT; Dear ImGui fetched by CMake.',
                'Free stylized assets (Quaternius), chosen for their clean silhouettes.',
              ],
            },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      tagline: 'Un pipeline de cel shading temps réel en OpenGL : aplats, contours encrés, rayons de soleil',
      description:
        "Une scène de nature stylisée rendue en temps réel par un pipeline OpenGL écrit à la main : éclairage quantifié par une rampe de tons, contours encrés en post-traitement, light scattering en espace écran. Chaque paramètre se règle en direct dans un panneau Dear ImGui.",
      shots: {
        sunrays: {
          alt: 'Rendu stylisé au couchant : des rayons de soleil filtrent entre des pins en cel shading au-dessus d’une prairie low-poly.',
          caption: 'Light scattering au couchant — 100 échantillons marchés vers le soleil, par pixel.',
        },
        outlines: {
          alt: 'Clairière en cel shading au crépuscule, chaque pin, rocher et brin d’herbe cerné d’un contour noir.',
          caption: 'Contours en post-traitement : bords de profondeur et bords de normales, le plus fort des deux gagne.',
        },
        pines: {
          alt: 'Trois pins low-poly en aplats de verts sur fond gris uni, sans contours.',
          caption: 'Les tons aplatis par la rampe 1D, avant la passe de contours.',
        },
        bark: {
          alt: 'Texture d’écorce de pin répétable, entrée de la quantification par histogramme.',
          caption: 'La texture d’écorce d’entrée : son histogramme choisit les aplats de la rampe.',
        },
      },
      sections: [
        {
          id: 'toon',
          kicker: '01',
          title: 'Des tons, pas des dégradés',
          blocks: [
            {
              type: 'text',
              content:
                "Le toon shading remplace le dégradé de Lambert par quelques aplats. Le terme diffus N·L ne sert pas de couleur mais de coordonnée : il indexe une texture-rampe de 256×1, quantifiée en quelques niveaux construits à partir de l’histogramme de la texture de l’objet. Un terme de rim assombrit les bords rasants, pour un produit scalaire de plus.",
            },
            { type: 'code', snippet: 'toonRamp', caption: 'shaders/fragment.shd' },
            { type: 'media', shot: 'pines' },
            { type: 'media', shot: 'bark' },
          ],
        },
        {
          id: 'outlines',
          kicker: '02',
          title: 'Contours encrés',
          blocks: [
            {
              type: 'text',
              content:
                "La scène est d’abord rendue dans un framebuffer hors écran, couleur et profondeur. Une passe de post-traitement dessine ensuite les contours à partir du seul tampon de profondeur :",
            },
            {
              type: 'list',
              items: [
                "Contours de profondeur : un pixel bien plus loin que ses quatre voisins signifie qu’un objet passe devant un autre.",
                "Contours de normales : les normales sont reconstruites depuis les positions de profondeur (la plus petite différence finie sur chaque axe, pour ne pas baver à travers les silhouettes) — un changement brutal de direction est une arête.",
                "Le plus fort des deux passe un seuil en smoothstep, puis le pixel est mélangé vers la couleur d’encre.",
              ],
            },
            { type: 'media', shot: 'outlines' },
          ],
        },
        {
          id: 'rays',
          kicker: '03',
          title: 'Rayons de soleil',
          blocks: [
            {
              type: 'text',
              content:
                "Les rayons sont un ray marching 2D en espace écran : le soleil est projeté à l’écran, et chaque pixel marche 100 pas vers lui. Seules les hautes lumières contribuent, et leur poids décroît avec la distance parcourue — l’astuce classique du light scattering, teintée par la couleur du soleil.",
            },
            { type: 'code', snippet: 'godRays', caption: 'shaders/post_fragment.shd' },
          ],
        },
        {
          id: 'live',
          kicker: '04',
          title: 'Réglé en direct',
          blocks: [
            {
              type: 'text',
              content:
                "Tout le pipeline tourne en interactif : 8 passes de scène (ciel, sol, végétation, forêt) vers le framebuffer, puis une passe de post. Chaque uniform est exposé dans un panneau Dear ImGui — épaisseur et seuils des contours, nombre de pas et décroissance des rayons, étalonnage, vignette — chaque effet se juge à l’œil, pas en recompilant.",
            },
            {
              type: 'list',
              items: [
                "Ni moteur ni GLM : matrices, caméra, chargeur OBJ et lecteur TGA écrits à la main.",
                "C++20, OpenGL 4.1 core, GLEW/GLUT ; Dear ImGui récupéré par CMake.",
                "Assets stylisés libres (Quaternius), choisis pour leurs silhouettes nettes.",
              ],
            },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      tagline: 'Eine Echtzeit-Cel-Shading-Pipeline in OpenGL: Farbflächen, Tuschekonturen, Sonnenstrahlen',
      description:
        'Eine stilisierte Naturszene, in Echtzeit gerendert von einer handgeschriebenen OpenGL-Pipeline: Beleuchtung über eine Tonrampe quantisiert, Konturen im Post-Processing getuscht, Light Scattering im Screen Space. Jeder Parameter lässt sich live in einem Dear-ImGui-Panel einstellen.',
      shots: {
        sunrays: {
          alt: 'Stilisiertes Rendering bei Sonnenuntergang: Sonnenstrahlen fallen zwischen cel-shaded Kiefern über eine Low-Poly-Wiese.',
          caption: 'Light Scattering bei Sonnenuntergang — 100 Samples pro Pixel, zur Sonne marschiert.',
        },
        outlines: {
          alt: 'Cel-shaded Lichtung in der Dämmerung, jede Kiefer, jeder Fels und Grashalm mit schwarzer Kontur.',
          caption: 'Konturen im Post-Processing: Tiefenkanten und Normalenkanten, die stärkere gewinnt.',
        },
        pines: {
          alt: 'Drei Low-Poly-Kiefern in flachen Grüntönen auf grauem Hintergrund, ohne Konturen.',
          caption: 'Die von der 1D-Rampe abgeflachten Töne, vor dem Konturen-Pass.',
        },
        bark: {
          alt: 'Kachelbare Kiefernrinden-Textur, Eingabe der Histogramm-Quantisierung.',
          caption: 'Die Rinden-Textur am Eingang: ihr Histogramm wählt die Farbflächen der Rampe.',
        },
      },
      sections: [
        {
          id: 'toon',
          kicker: '01',
          title: 'Töne statt Verläufe',
          blocks: [
            {
              type: 'text',
              content:
                'Toon Shading ersetzt den weichen Lambert-Verlauf durch wenige Farbflächen. Der Diffusterm N·L dient nicht als Farbe, sondern als Koordinate: Er indiziert eine 256×1-Rampentextur, quantisiert in einige Stufen, die aus dem Histogramm der Objekttextur gebaut werden. Ein Rim-Term dunkelt streifende Kanten ab — für ein Skalarprodukt mehr.',
            },
            { type: 'code', snippet: 'toonRamp', caption: 'shaders/fragment.shd' },
            { type: 'media', shot: 'pines' },
            { type: 'media', shot: 'bark' },
          ],
        },
        {
          id: 'outlines',
          kicker: '02',
          title: 'Tuschekonturen',
          blocks: [
            {
              type: 'text',
              content:
                'Die Szene wird zuerst in einen Offscreen-Framebuffer gerendert, Farbe und Tiefe. Ein Post-Processing-Pass zeichnet die Konturen dann allein aus dem Tiefenpuffer:',
            },
            {
              type: 'list',
              items: [
                'Tiefenkonturen: Ein Pixel, das deutlich weiter liegt als seine vier Nachbarn, heißt: ein Objekt steht vor einem anderen.',
                'Normalenkonturen: Die Normalen werden aus den Tiefenpositionen rekonstruiert (die kleinere finite Differenz je Achse, damit nichts über Silhouetten hinausblutet) — ein harter Richtungswechsel ist eine Kante.',
                'Die stärkere der beiden passiert eine Smoothstep-Schwelle, dann wird das Pixel zur Tuschefarbe gemischt.',
              ],
            },
            { type: 'media', shot: 'outlines' },
          ],
        },
        {
          id: 'rays',
          kicker: '03',
          title: 'Sonnenstrahlen',
          blocks: [
            {
              type: 'text',
              content:
                'Die Strahlen sind ein 2D-Ray-Marching im Screen Space: Die Sonne wird auf den Bildschirm projiziert, und jedes Pixel marschiert 100 Schritte auf sie zu. Nur die Lichter tragen bei, ihr Gewicht fällt mit der zurückgelegten Strecke — der klassische Light-Scattering-Trick, getönt von der Sonnenfarbe.',
            },
            { type: 'code', snippet: 'godRays', caption: 'shaders/post_fragment.shd' },
          ],
        },
        {
          id: 'live',
          kicker: '04',
          title: 'Live eingestellt',
          blocks: [
            {
              type: 'text',
              content:
                'Die ganze Pipeline läuft interaktiv: 8 Szenen-Passes (Himmel, Boden, Vegetation, Wald) in den Framebuffer, dann ein Post-Pass. Jede Uniform liegt in einem Dear-ImGui-Panel — Dicke und Schwellen der Konturen, Schrittzahl und Abklingen der Strahlen, Grading, Vignette — jeder Effekt wird mit den Augen beurteilt, nicht durch Neukompilieren.',
            },
            {
              type: 'list',
              items: [
                'Keine Engine, kein GLM: Matrizen, Kamera, OBJ-Loader und TGA-Reader von Hand geschrieben.',
                'C++20, OpenGL 4.1 Core, GLEW/GLUT; Dear ImGui über CMake bezogen.',
                'Freie stilisierte Assets (Quaternius), gewählt für ihre klaren Silhouetten.',
              ],
            },
          ],
        },
      ],
    },
  },
};

const pulmonix: ProjectDef = {
  slug: 'pulmonix',
  category: 'vision',
  title: 'Pulmonix',
  tone: 'yellow',
  tech: ['Python', 'FastAPI', 'Dash', 'PostgreSQL', 'Docker', 'XGBoost', 'VTK'],
  tags: ['python', 'imaging', 'machine-learning'],
  metrics: ['100 LIDC-IDRI', '5-fold CV'],
  repo: 'https://github.com/Evrard11/medviz-metastazix',

  shots: {
    overview: { image: pulmonixOverviewImage, background: 'dark' },
    viewer: { image: pulmonixViewerImage, background: 'dark' },
    anomalies: { image: pulmonixAnomaliesImage, background: 'dark' },
  },
  cover: 'overview',
  gallery: ['anomalies', 'viewer'],

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      tagline: 'A DICOM chest scan goes in, a scored list of lung nodules comes out',
      description:
        'A DICOM chest scan is segmented, its nodule candidates are filtered and scored for malignancy, and the whole volume is rendered in the browser. Classical image processing feeds radiomic features to two XGBoost models — no deep learning anywhere in the chain.',
      shots: {
        overview: {
          alt: 'The application in a browser: patient list on the left, interactive 3D volume and 2D slice in the middle, list of detected anomalies on the right.',
          caption: 'The whole application: patients, 3D volume, 2D slice, scored anomalies.',
        },
        viewer: {
          alt: 'Detail of the two viewers: a volume rendering of a chest scan with its transfer-function editor, next to an axial CT slice.',
          caption: 'The volume is rendered by VTK.js; the slice next to it accepts freehand annotation.',
        },
        anomalies: {
          alt: 'Right panel listing two detected anomalies with their slice number, volume in cubic millimetres and origin.',
          caption: 'One card per surviving candidate: slice, volume, and how it was found.',
        },
      },
      sections: [
        {
          id: 'stack',
          kicker: '01',
          title: 'Three services, one compose file',
          blocks: [
            {
              type: 'text',
              content:
                'Three containers, not three layers of one program. Each has its own dependency set, which matters here: the imaging stack alone needs a C++ toolchain to build.',
            },
            {
              type: 'list',
              items: [
                'A Dash frontend, which owns the interface and never touches a DICOM file.',
                'A FastAPI backend, which loads the two models at startup and does the segmentation and the scoring.',
                'A FastAPI service in front of PostgreSQL, exposing patients, exams, segmentations and nodules through a repository layer.',
              ],
            },
            {
              type: 'text',
              content:
                'A GitHub Actions pipeline builds the three images, checks that no container exits on its own, runs the backend tests and the database tests against a real PostgreSQL service, then publishes the images to the registry — but only from the main branch.',
            },
          ],
        },
        {
          id: 'lungs',
          kicker: '02',
          title: 'Isolating the lungs',
          blocks: [
            {
              type: 'text',
              content:
                'Everything downstream depends on this mask, and it is pure morphology — no learning involved. Air is anything below −400 Hounsfield units, but the air around the patient qualifies too: it is removed as the connected component that touches the corner of the volume. Holes are filled slice by slice so vessels and bronchi do not punch through the lungs, and only the two largest components are kept.',
            },
            { type: 'code', snippet: 'lungMask', caption: 'backend/app/segmentation/segmenter.py' },
            {
              type: 'text',
              content:
                'The last two lines are the ones that matter. Dilating by three iterations pulls in the nodules stuck against the pleura, which a tight mask would cut away; eroding by five then pushes the chest wall back out, because it is dense enough to be mistaken for a nodule later on.',
            },
          ],
        },
        {
          id: 'candidates',
          kicker: '03',
          title: 'Two detectors rather than one',
          blocks: [
            {
              type: 'text',
              content:
                'Nodules do not all look alike, so two segmentations run in parallel on the cropped lung volume and their masks are merged:',
            },
            {
              type: 'list',
              items: [
                'Otsu thresholding, computed on the lung voxels only, catches the clean high-contrast objects.',
                'Region growing from SimpleITK, seeded at the local maxima and bounded to [−200, 400] HU, catches the ones that fade into their surroundings.',
                'Components under 20 voxels are dropped; each survivor yields a 32³ cube centred on its centroid, plus its bounding box and voxel spacing.',
              ],
            },
            {
              type: 'text',
              content:
                'This stage is deliberately over-eager: missing a nodule here is unrecoverable, whereas a false positive still has a model in front of it.',
            },
          ],
        },
        {
          id: 'classify',
          kicker: '04',
          title: 'Filtering, then scoring',
          blocks: [
            {
              type: 'text',
              content:
                'Each cube is described by radiomic features — shape, first-order statistics, and GLCM texture — computed by PyRadiomics on the cube and its segmentation mask. Two XGBoost models then read the same feature vector: the first rejects false positives, the second scores malignancy. Only candidates the first model scores at 0.7 or above reach the second.',
            },
            { type: 'code', snippet: 'twoPasses', caption: 'backend/app/classification/pipeline.py' },
            {
              type: 'text',
              content:
                'Both models are trained on 100 LIDC-IDRI patients. The false-positive reducer learns from candidates matched against the radiologists’ annotations, a match counting only above an IoU of 0.1; the malignancy model learns from the annotation XML directly, where a mean radiologist score of 3.5 or more is the positive class. 200 trees, depth 6, class weights derived from the imbalance, scored by 5-fold cross-validation.',
            },
            { type: 'media', shot: 'anomalies' },
          ],
        },
        {
          id: 'browser',
          kicker: '05',
          title: 'Getting the volume to the browser',
          blocks: [
            {
              type: 'text',
              content:
                'A chest CT is far too large to hand to a web page as is. The backend subsamples it — every other slice, every fourth pixel in the plane — clamps the Hounsfield range to [−1000, 400] and rescales it to 8 bits, adjusting the voxel spacing to match so the volume keeps its real proportions. What crosses the wire is a flat list of 8-bit samples, its dimensions, its spacing, and the scored anomalies.',
            },
            {
              type: 'text',
              content:
                'The frontend hands that to VTK.js for the volume rendering and to Plotly for the slice viewer, where a radiologist can draw a closed path by hand. Manual outlines and automatic detections then live side by side in the same list, each carrying where it came from.',
            },
            { type: 'media', shot: 'viewer' },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      tagline: 'Un scanner thoracique entre, une liste de nodules pulmonaires scorés sort',
      description:
        "Un scanner thoracique DICOM est segmenté, ses candidats nodules sont filtrés puis scorés en malignité, et le volume entier est rendu dans le navigateur. Du traitement d’image classique alimente des descripteurs radiomiques et deux modèles XGBoost — pas de deep learning dans la chaîne.",
      shots: {
        overview: {
          alt: "L’application dans un navigateur : liste de patients à gauche, volume 3D interactif et coupe 2D au centre, liste des anomalies détectées à droite.",
          caption: "L’application entière : patients, volume 3D, coupe 2D, anomalies scorées.",
        },
        viewer: {
          alt: "Détail des deux visualiseurs : un rendu volumique de scanner thoracique avec son éditeur de fonction de transfert, à côté d’une coupe axiale.",
          caption: 'Le volume est rendu par VTK.js ; la coupe, à côté, accepte les tracés à main levée.',
        },
        anomalies: {
          alt: 'Panneau de droite listant deux anomalies détectées avec leur numéro de coupe, leur volume en millimètres cubes et leur origine.',
          caption: "Une carte par candidat retenu : la coupe, le volume, et comment il a été trouvé.",
        },
      },
      sections: [
        {
          id: 'stack',
          kicker: '01',
          title: 'Trois services, un seul fichier compose',
          blocks: [
            {
              type: 'text',
              content:
                "Trois conteneurs, et non trois couches d’un même programme. Chacun a ses propres dépendances, ce qui compte ici : la pile d’imagerie à elle seule réclame une chaîne de compilation C++.",
            },
            {
              type: 'list',
              items: [
                "Un frontend Dash, qui porte l’interface et ne touche jamais un fichier DICOM.",
                'Un backend FastAPI, qui charge les deux modèles au démarrage et assure la segmentation puis le scoring.',
                'Un service FastAPI devant PostgreSQL, qui expose patients, examens, segmentations et nodules à travers une couche de dépôts.',
              ],
            },
            {
              type: 'text',
              content:
                "Une chaîne GitHub Actions construit les trois images, vérifie qu’aucun conteneur ne s’arrête tout seul, lance les tests du backend puis ceux de la base contre un vrai service PostgreSQL, et publie enfin les images au registre — depuis la branche principale seulement.",
            },
          ],
        },
        {
          id: 'lungs',
          kicker: '02',
          title: 'Isoler les poumons',
          blocks: [
            {
              type: 'text',
              content:
                "Tout le reste dépend de ce masque, et il ne tient qu’à de la morphologie — aucun apprentissage. L’air, c’est tout ce qui est sous −400 unités Hounsfield ; sauf que l’air autour du patient en fait partie : on le retire comme la composante connexe qui touche le coin du volume. Les trous sont bouchés coupe par coupe pour que vaisseaux et bronches ne percent pas les poumons, et seules les deux plus grosses composantes sont gardées.",
            },
            { type: 'code', snippet: 'lungMask', caption: 'backend/app/segmentation/segmenter.py' },
            {
              type: 'text',
              content:
                "Ce sont les deux dernières lignes qui comptent. Dilater de trois itérations rattrape les nodules collés à la plèvre, qu’un masque serré aurait coupés ; éroder de cinq repousse ensuite la paroi thoracique, assez dense pour être prise plus tard pour un nodule.",
            },
          ],
        },
        {
          id: 'candidates',
          kicker: '03',
          title: 'Deux détecteurs plutôt qu’un',
          blocks: [
            {
              type: 'text',
              content:
                'Les nodules ne se ressemblent pas tous : deux segmentations tournent en parallèle sur le volume pulmonaire recadré, et leurs masques sont fusionnés.',
            },
            {
              type: 'list',
              items: [
                "Un seuillage d’Otsu, calculé sur les seuls voxels de poumon, attrape les objets nets et bien contrastés.",
                'Une croissance de région SimpleITK, amorcée aux maxima locaux et bornée à [−200, 400] HU, attrape ceux qui se fondent dans leur voisinage.',
                'Les composantes de moins de 20 voxels sont jetées ; chaque survivante donne un cube de 32³ centré sur son barycentre, sa boîte englobante et son pas de voxel.',
              ],
            },
            {
              type: 'text',
              content:
                "Cette étape est volontairement trop généreuse : rater un nodule ici est irrattrapable, alors qu’un faux positif a encore un modèle devant lui.",
            },
          ],
        },
        {
          id: 'classify',
          kicker: '04',
          title: 'Filtrer, puis scorer',
          blocks: [
            {
              type: 'text',
              content:
                "Chaque cube est décrit par des descripteurs radiomiques — forme, statistiques d’ordre un, texture GLCM — calculés par PyRadiomics sur le cube et son masque de segmentation. Deux modèles XGBoost lisent ensuite le même vecteur : le premier rejette les faux positifs, le second score la malignité. Seuls les candidats que le premier note à 0,7 ou plus atteignent le second.",
            },
            { type: 'code', snippet: 'twoPasses', caption: 'backend/app/classification/pipeline.py' },
            {
              type: 'text',
              content:
                "Les deux modèles sont entraînés sur 100 patients de LIDC-IDRI. Le réducteur de faux positifs apprend de candidats appariés aux annotations des radiologues, un appariement ne comptant qu’au-delà d’une IoU de 0,1 ; le modèle de malignité apprend directement du XML d’annotation, où une note moyenne de 3,5 et plus fait la classe positive. 200 arbres, profondeur 6, poids de classe tirés du déséquilibre, jugés en validation croisée à 5 plis.",
            },
            { type: 'media', shot: 'anomalies' },
          ],
        },
        {
          id: 'browser',
          kicker: '05',
          title: 'Faire tenir le volume dans le navigateur',
          blocks: [
            {
              type: 'text',
              content:
                "Un scanner thoracique est bien trop lourd pour être tendu tel quel à une page web. Le backend le sous-échantillonne — une coupe sur deux, un pixel sur quatre dans le plan — borne la plage Hounsfield à [−1000, 400] et la ramène sur 8 bits, en corrigeant le pas de voxel pour que le volume garde ses vraies proportions. Ce qui passe sur le fil : une liste plate d’échantillons 8 bits, ses dimensions, son pas, et les anomalies scorées.",
            },
            {
              type: 'text',
              content:
                "Le frontend confie tout cela à VTK.js pour le rendu volumique et à Plotly pour la coupe, où un radiologue peut tracer un contour fermé à la main. Contours manuels et détections automatiques cohabitent ensuite dans la même liste, chacun portant sa provenance.",
            },
            { type: 'media', shot: 'viewer' },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      tagline: 'Ein Thorax-CT geht hinein, eine bewertete Liste von Lungenknoten kommt heraus',
      description:
        'Ein DICOM-Thorax-CT wird segmentiert, seine Knotenkandidaten werden gefiltert und auf Malignität bewertet, und das ganze Volumen wird im Browser dargestellt. Klassische Bildverarbeitung liefert radiomische Merkmale an zwei XGBoost-Modelle — Deep Learning kommt in der Kette nicht vor.',
      shots: {
        overview: {
          alt: 'Die Anwendung im Browser: Patientenliste links, interaktives 3D-Volumen und 2D-Schicht in der Mitte, Liste der erkannten Anomalien rechts.',
          caption: 'Die ganze Anwendung: Patienten, 3D-Volumen, 2D-Schicht, bewertete Anomalien.',
        },
        viewer: {
          alt: 'Detail der beiden Ansichten: eine Volumendarstellung eines Thorax-CT mit ihrem Transferfunktions-Editor, daneben eine axiale Schicht.',
          caption: 'Das Volumen rendert VTK.js; die Schicht daneben nimmt Freihandzeichnungen an.',
        },
        anomalies: {
          alt: 'Rechtes Panel mit zwei erkannten Anomalien, jeweils mit Schichtnummer, Volumen in Kubikmillimetern und Herkunft.',
          caption: 'Eine Karte je verbliebenem Kandidaten: Schicht, Volumen und wie er gefunden wurde.',
        },
      },
      sections: [
        {
          id: 'stack',
          kicker: '01',
          title: 'Drei Dienste, eine Compose-Datei',
          blocks: [
            {
              type: 'text',
              content:
                'Drei Container, nicht drei Schichten eines einzigen Programms. Jeder hat eigene Abhängigkeiten, und das zählt hier: allein der Bildverarbeitungs-Stack braucht eine C++-Toolchain zum Bauen.',
            },
            {
              type: 'list',
              items: [
                'Ein Dash-Frontend, das die Oberfläche trägt und nie eine DICOM-Datei anfasst.',
                'Ein FastAPI-Backend, das beide Modelle beim Start lädt und Segmentierung und Bewertung übernimmt.',
                'Ein FastAPI-Dienst vor PostgreSQL, der Patienten, Untersuchungen, Segmentierungen und Knoten über eine Repository-Schicht bereitstellt.',
              ],
            },
            {
              type: 'text',
              content:
                'Eine GitHub-Actions-Pipeline baut die drei Images, prüft, dass kein Container von selbst stehen bleibt, führt die Backend-Tests und die Datenbanktests gegen einen echten PostgreSQL-Dienst aus und veröffentlicht die Images schließlich in der Registry — nur vom Hauptbranch aus.',
            },
          ],
        },
        {
          id: 'lungs',
          kicker: '02',
          title: 'Die Lungen freilegen',
          blocks: [
            {
              type: 'text',
              content:
                'Alles Weitere hängt an dieser Maske, und sie ist reine Morphologie — ohne jedes Lernen. Luft ist alles unter −400 Hounsfield-Einheiten; nur gehört die Luft um den Patienten eben auch dazu: Sie wird als die Zusammenhangskomponente entfernt, die die Ecke des Volumens berührt. Löcher werden Schicht für Schicht gefüllt, damit Gefäße und Bronchien die Lungen nicht durchstoßen, und nur die zwei größten Komponenten bleiben übrig.',
            },
            { type: 'code', snippet: 'lungMask', caption: 'backend/app/segmentation/segmenter.py' },
            {
              type: 'text',
              content:
                'Auf die letzten beiden Zeilen kommt es an. Drei Dilatationsschritte holen die Knoten herein, die an der Pleura kleben und einer knappen Maske zum Opfer fielen; fünf Erosionsschritte schieben danach die Brustwand wieder hinaus, die dicht genug ist, um später für einen Knoten gehalten zu werden.',
            },
          ],
        },
        {
          id: 'candidates',
          kicker: '03',
          title: 'Zwei Detektoren statt einem',
          blocks: [
            {
              type: 'text',
              content:
                'Knoten sehen nicht alle gleich aus: Zwei Segmentierungen laufen parallel auf dem zugeschnittenen Lungenvolumen, ihre Masken werden vereinigt.',
            },
            {
              type: 'list',
              items: [
                'Ein Otsu-Schwellwert, nur auf den Lungenvoxeln berechnet, fängt die sauberen, kontrastreichen Objekte.',
                'Ein Region-Growing aus SimpleITK, an den lokalen Maxima gesät und auf [−200, 400] HU begrenzt, fängt die, die in ihrer Umgebung verschwimmen.',
                'Komponenten unter 20 Voxeln fallen weg; jede verbleibende liefert einen 32³-Würfel um ihren Schwerpunkt, ihre Bounding-Box und ihren Voxelabstand.',
              ],
            },
            {
              type: 'text',
              content:
                'Diese Stufe ist bewusst zu großzügig: Einen Knoten hier zu verpassen ist nicht mehr gutzumachen, während vor einem Fehlalarm noch ein Modell steht.',
            },
          ],
        },
        {
          id: 'classify',
          kicker: '04',
          title: 'Filtern, dann bewerten',
          blocks: [
            {
              type: 'text',
              content:
                'Jeder Würfel wird durch radiomische Merkmale beschrieben — Form, Statistiken erster Ordnung, GLCM-Textur —, die PyRadiomics auf dem Würfel und seiner Segmentierungsmaske berechnet. Zwei XGBoost-Modelle lesen dann denselben Merkmalsvektor: Das erste verwirft Fehlalarme, das zweite bewertet die Malignität. Nur Kandidaten, die das erste mit 0,7 oder mehr bewertet, erreichen das zweite.',
            },
            { type: 'code', snippet: 'twoPasses', caption: 'backend/app/classification/pipeline.py' },
            {
              type: 'text',
              content:
                'Beide Modelle sind auf 100 LIDC-IDRI-Patienten trainiert. Der Fehlalarm-Filter lernt von Kandidaten, die den Annotationen der Radiologen zugeordnet wurden, wobei eine Zuordnung erst ab einer IoU von 0,1 zählt; das Malignitätsmodell lernt direkt aus dem Annotations-XML, in dem eine mittlere Bewertung ab 3,5 die positive Klasse bildet. 200 Bäume, Tiefe 6, Klassengewichte aus der Schieflage, bewertet per 5-facher Kreuzvalidierung.',
            },
            { type: 'media', shot: 'anomalies' },
          ],
        },
        {
          id: 'browser',
          kicker: '05',
          title: 'Das Volumen in den Browser bringen',
          blocks: [
            {
              type: 'text',
              content:
                'Ein Thorax-CT ist viel zu groß, um es einer Webseite unverändert zu reichen. Das Backend tastet es herunter — jede zweite Schicht, jedes vierte Pixel in der Ebene —, begrenzt den Hounsfield-Bereich auf [−1000, 400] und skaliert ihn auf 8 Bit, wobei es den Voxelabstand nachzieht, damit das Volumen seine echten Proportionen behält. Über die Leitung geht eine flache Liste von 8-Bit-Werten, ihre Dimensionen, ihr Abstand und die bewerteten Anomalien.',
            },
            {
              type: 'text',
              content:
                'Das Frontend übergibt das an VTK.js für die Volumendarstellung und an Plotly für die Schichtansicht, in der ein Radiologe einen geschlossenen Pfad von Hand ziehen kann. Handzeichnungen und automatische Funde stehen danach in derselben Liste nebeneinander, jeder mit seiner Herkunft.',
            },
            { type: 'media', shot: 'viewer' },
          ],
        },
      ],
    },
  },
};

const unet: ProjectDef = {
  slug: 'unet-coco',
  category: 'vision',
  title: 'U-Net from Scratch',
  tone: 'pink',
  tech: ['Python', 'PyTorch', 'U-Net', 'COCO'],
  tags: ['python', 'deep-learning', 'vision'],
  metrics: ['Dice 0.643', 'IoU 0.518', '18.7 min'],

  shots: {
    predictions: { image: unetPredictionsImage, background: 'light' },
    curves: { image: unetCurvesImage, background: 'light' },
    best: { image: unetBestImage, background: 'light' },
    worst: { image: unetWorstImage, background: 'light' },
  },
  cover: 'predictions',
  gallery: ['curves', 'best', 'worst'],

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      tagline: 'A U-Net written by hand in PyTorch, trained from scratch to separate object from background',
      description:
        'No pre-trained weights, no existing implementation, no Lightning: the encoder, the decoder and the skip connections are written directly against torch.nn. Trained on COCO images to answer one question per pixel — object, or not.',
      shots: {
        predictions: {
          alt: 'Grid of test images with, for each, the ground-truth mask, the predicted mask and the prediction overlaid in red: a surfer, a bear, teddy bears, a pickup truck and a heron.',
          caption: 'Test images the model never saw. Left to right: input, ground truth, prediction, overlay.',
        },
        curves: {
          alt: 'Two plots: the combined BCE and Dice loss over 20 epochs, and the Dice coefficient, both for training and validation, with the best epoch marked.',
          caption: 'The curves part company around epoch 10 — the checkpoint kept is epoch 12, where validation Dice peaks.',
        },
        best: {
          alt: 'Three of the best-scoring test predictions: a plush toy, two suitcases and a pizza, each cut out almost exactly.',
          caption: 'Best cases, Dice above 0.97: one large object, clean against its background.',
        },
        worst: {
          alt: 'Four of the worst-scoring test predictions: a hotel room, a snowy crossing, a street sign and a toilet, all scoring zero.',
          caption: 'Worst cases, Dice at zero: the model finds a foreground where COCO annotated none, or the reverse.',
        },
      },
      sections: [
        {
          id: 'data',
          kicker: '01',
          title: 'Foreground, as COCO defines it',
          blocks: [
            {
              type: 'text',
              content:
                'The task is binary, so the ground truth for an image is the union of all its annotated instances — everything else is background. COCO’s val2017 split provides 4 952 images that carry at least one annotation, which is small enough to work with and diverse enough to teach a general notion of “objectness”. About 30 % of all pixels end up foreground.',
            },
            {
              type: 'text',
              content:
                'Everything is resized to 128×128 — a multiple of 16, which the four pooling stages require — and decoded once into uint8 tensors held in RAM. Rasterising COCO polygons is the slow part of the pipeline, and doing it per epoch would dominate the training time. Masks are resized by nearest neighbour: interpolating a binary mask invents values that are neither 0 nor 1.',
            },
            {
              type: 'list',
              items: [
                '3 961 images to train, 495 to validate, 496 held out for the final test.',
                'The test split is untouched until the very end, so model selection cannot leak into the reported numbers.',
                'The only augmentation is a horizontal flip, applied jointly to image and mask — foreground is symmetric under mirroring.',
              ],
            },

            {
              type: 'code',
              snippet: 'unetDataset',
              caption: 'One draw for both tensors. Flipping the image without its mask teaches the opposite of the task.',
            },          ],
        },
        {
          id: 'net',
          kicker: '02',
          title: 'The network, by hand',
          blocks: [
            {
              type: 'text',
              content:
                'Four downsampling stages, 32 channels doubling to a 512-channel bottleneck, then four upsampling stages back. What makes it a U-Net is the concatenation: each decoder stage is handed the encoder feature map of the same resolution, re-injecting the spatial detail that pooling threw away. That is what gives the mask its sharp boundaries.',
            },
            { type: 'code', snippet: 'unetUp', caption: 'the decoder stage and its skip connection' },
            {
              type: 'list',
              items: [
                'Padded convolutions, so the output mask has exactly the size of the input — the 2015 paper crops instead, which buys nothing at this resolution.',
                'BatchNorm after every convolution — not part of the original architecture, and it makes training from random initialisation noticeably faster.',
                'Base width 32 rather than 64 — 7.76 M parameters instead of 31 M, better matched to 4 000 training images.',
              ],
            },
          ],
        },
        {
          id: 'loss',
          kicker: '03',
          title: 'Two losses, added',
          blocks: [
            {
              type: 'text',
              content:
                'Cross-entropy optimises per-pixel accuracy, which the easy background pixels can dominate. Soft Dice optimises the region overlap we actually care about, but its gradients are noisy early on. Summing them gets both: BCE keeps the gradients smooth and well scaled, Dice pushes the overlap.',
            },
            { type: 'code', snippet: 'diceLoss', caption: 'the combined objective' },
            {
              type: 'text',
              content:
                'Dice and IoU are computed per image and then averaged, not pooled over the batch, so a small object in a mostly-empty image counts as much as a large one.',
            },
            { type: 'media', shot: 'curves' },
          ],
        },
        {
          id: 'results',
          kicker: '04',
          title: 'What it learned, and what it did not',
          blocks: [
            {
              type: 'text',
              content:
                'Twenty epochs with Adam at 3·10⁻⁴, the learning rate divided by five whenever validation Dice stalls for two epochs. Training takes 18.7 minutes on an Apple GPU; the kept checkpoint is epoch 12. On the held-out test set: Dice 0.643, IoU 0.518, pixel accuracy 0.805.',
            },
            {
              type: 'text',
              content:
                'Training and validation run through the same function, told apart by nothing but whether an optimizer was handed to it — there is no second loop to keep in step with the first. The kept weights are those of the best validation Dice, copied to the CPU on the spot, not those of the last epoch.',
            },
            {
              type: 'code',
              snippet: 'unetEpoch',
              caption: 'One loop for both modes, and a checkpoint taken on the metric that is being reported.',
            },
            {
              type: 'text',
              content:
                'The extremes are more informative than the average. The best predictions all look alike — one large, salient object, cleanly separated from its background. The failures come in two kinds: foreground so small or so ambiguous that the network puts its mask somewhere else entirely, and images where “foreground” is ill-defined by the annotations themselves, since only COCO’s 80 categories are labelled and an unannotated but perfectly salient object counts as background.',
            },
            { type: 'media', shot: 'best' },
            { type: 'media', shot: 'worst' },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      tagline: "Un U-Net écrit à la main en PyTorch, entraîné de zéro à séparer l’objet du fond",
      description:
        "Pas de poids pré-entraînés, pas d’implémentation existante, pas de Lightning : l’encodeur, le décodeur et les connexions de saut sont écrits directement sur torch.nn. Entraîné sur des images COCO pour répondre à une question par pixel — objet, ou pas.",
      shots: {
        predictions: {
          alt: "Grille d’images de test avec, pour chacune, le masque de référence, le masque prédit et la prédiction superposée en rouge : un surfeur, un ours, des peluches, un pick-up et un héron.",
          caption: "Des images de test que le modèle n’a jamais vues. De gauche à droite : entrée, référence, prédiction, superposition.",
        },
        curves: {
          alt: "Deux graphiques : la perte combinée BCE et Dice sur 20 epochs, et le coefficient de Dice, en apprentissage et en validation, la meilleure epoch marquée.",
          caption: "Les courbes se séparent vers la dixième epoch — le point gardé est l’epoch 12, où le Dice de validation culmine.",
        },
        best: {
          alt: 'Trois des meilleures prédictions du jeu de test : une peluche, deux valises et une pizza, découpées presque exactement.',
          caption: 'Les meilleurs cas, Dice au-dessus de 0,97 : un grand objet, net sur son fond.',
        },
        worst: {
          alt: "Quatre des pires prédictions du jeu de test : une chambre d’hôtel, un passage piéton enneigé, un panneau et des toilettes, toutes à zéro.",
          caption: "Les pires cas, Dice à zéro : le modèle voit un avant-plan là où COCO n’en annote aucun, ou l’inverse.",
        },
      },
      sections: [
        {
          id: 'data',
          kicker: '01',
          title: "L’avant-plan, tel que COCO le définit",
          blocks: [
            {
              type: 'text',
              content:
                "La tâche est binaire : la référence d’une image est l’union de toutes ses instances annotées, le reste est du fond. Le découpage val2017 de COCO fournit 4 952 images portant au moins une annotation, assez peu nombreuses pour travailler vite et assez variées pour apprendre une notion générale d’« objet ». Environ 30 % des pixels finissent en avant-plan.",
            },
            {
              type: 'text',
              content:
                "Tout est ramené à 128×128 — un multiple de 16, ce qu’exigent les quatre étages de pooling — et décodé une fois pour toutes en tenseurs uint8 gardés en RAM. Rastériser les polygones COCO est la partie lente du pipeline, et le refaire à chaque epoch dominerait le temps d’entraînement. Les masques sont redimensionnés au plus proche voisin : interpoler un masque binaire invente des valeurs qui ne sont ni 0 ni 1.",
            },
            {
              type: 'list',
              items: [
                "3 961 images pour l’apprentissage, 495 pour la validation, 496 mises de côté pour le test final.",
                "Le test n’est ouvert qu’à la toute fin : la sélection du modèle ne peut pas fuiter dans les chiffres annoncés.",
                "La seule augmentation est une symétrie horizontale, appliquée conjointement à l’image et à son masque — l’avant-plan est symétrique au miroir.",
              ],
            },

            {
              type: 'code',
              snippet: 'unetDataset',
              caption: "Un seul tirage pour les deux tenseurs. Retourner l’image sans son masque apprend l’inverse de la tâche.",
            },          ],
        },
        {
          id: 'net',
          kicker: '02',
          title: 'Le réseau, à la main',
          blocks: [
            {
              type: 'text',
              content:
                "Quatre étages de descente, 32 canaux qui doublent jusqu’à un goulot à 512, puis quatre étages de remontée. Ce qui en fait un U-Net, c’est la concaténation : chaque étage du décodeur reçoit la carte de l’encodeur à la même résolution, ce qui réinjecte le détail spatial que le pooling avait jeté. C’est ce qui donne au masque ses bords nets.",
            },
            { type: 'code', snippet: 'unetUp', caption: "l’étage de décodeur et sa connexion de saut" },
            {
              type: 'list',
              items: [
                "Des convolutions avec padding, pour que le masque de sortie fasse exactement la taille de l’entrée — l’article de 2015 recadre à la place, ce qui n’apporte rien à cette résolution.",
                "Une BatchNorm après chaque convolution — absente de l’architecture d’origine, elle accélère nettement un entraînement parti d’une initialisation aléatoire.",
                'Une largeur de base de 32 plutôt que 64 — 7,76 M de paramètres au lieu de 31 M, mieux ajusté à 4 000 images d’entraînement.',
              ],
            },
          ],
        },
        {
          id: 'loss',
          kicker: '03',
          title: 'Deux pertes, additionnées',
          blocks: [
            {
              type: 'text',
              content:
                "L’entropie croisée optimise la justesse pixel à pixel, que les pixels de fond, faciles, peuvent dominer. Le Dice doux optimise le recouvrement de régions, celui qui nous intéresse vraiment, mais ses gradients sont bruités au début. Les additionner donne les deux : la BCE garde des gradients lisses et bien calibrés, le Dice pousse le recouvrement.",
            },
            { type: 'code', snippet: 'diceLoss', caption: "l’objectif combiné" },
            {
              type: 'text',
              content:
                "Dice et IoU sont calculés par image puis moyennés, et non agrégés sur le lot : un petit objet dans une image presque vide compte autant qu’un grand.",
            },
            { type: 'media', shot: 'curves' },
          ],
        },
        {
          id: 'results',
          kicker: '04',
          title: "Ce qu’il a appris, et ce qu’il n’a pas appris",
          blocks: [
            {
              type: 'text',
              content:
                "Vingt epochs avec Adam à 3·10⁻⁴, le pas d’apprentissage divisé par cinq dès que le Dice de validation stagne deux epochs. L’entraînement prend 18,7 minutes sur un GPU Apple ; le point gardé est l’epoch 12. Sur le jeu de test mis de côté : Dice 0,643, IoU 0,518, justesse par pixel 0,805.",
            },
            {
              type: 'text',
              content:
                "L’entraînement et la validation passent par la même fonction, que rien ne distingue sinon qu’on lui a tendu un optimiseur ou non — il n’y a pas de seconde boucle à tenir d’accord avec la première. Les poids retenus sont ceux du meilleur Dice de validation, recopiés sur le CPU au passage, pas ceux de la dernière epoch.",
            },
            {
              type: 'code',
              snippet: 'unetEpoch',
              caption: "Une boucle pour les deux modes, et une sauvegarde prise sur la mesure qui sera annoncée.",
            },
            {
              type: 'text',
              content:
                "Les extrêmes en disent plus que la moyenne. Les meilleures prédictions se ressemblent toutes : un grand objet saillant, proprement détaché de son fond. Les échecs sont de deux sortes : un avant-plan si petit ou si ambigu que le réseau pose son masque ailleurs, et des images où « avant-plan » est mal défini par les annotations elles-mêmes, puisque seules les 80 catégories de COCO sont étiquetées et qu’un objet non annoté mais parfaitement saillant compte comme du fond.",
            },
            { type: 'media', shot: 'best' },
            { type: 'media', shot: 'worst' },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      tagline: 'Ein U-Net von Hand in PyTorch geschrieben, von Grund auf trainiert, Objekt von Hintergrund zu trennen',
      description:
        'Keine vortrainierten Gewichte, keine fertige Implementierung, kein Lightning: Encoder, Decoder und Skip-Verbindungen stehen direkt auf torch.nn. Auf COCO-Bildern trainiert, um pro Pixel eine Frage zu beantworten — Objekt oder nicht.',
      shots: {
        predictions: {
          alt: 'Raster von Testbildern mit je der Referenzmaske, der vorhergesagten Maske und der rot überlagerten Vorhersage: ein Surfer, ein Bär, Teddybären, ein Pick-up und ein Reiher.',
          caption: 'Testbilder, die das Modell nie gesehen hat. Von links: Eingabe, Referenz, Vorhersage, Überlagerung.',
        },
        curves: {
          alt: 'Zwei Diagramme: der kombinierte BCE-und-Dice-Verlust über 20 Epochen und der Dice-Koeffizient, jeweils für Training und Validierung, mit markierter bester Epoche.',
          caption: 'Die Kurven trennen sich um Epoche 10 — behalten wird Epoche 12, wo der Validierungs-Dice sein Maximum hat.',
        },
        best: {
          alt: 'Drei der besten Testvorhersagen: ein Plüschtier, zwei Koffer und eine Pizza, jeweils fast exakt freigestellt.',
          caption: 'Beste Fälle, Dice über 0,97: ein großes Objekt, sauber vor seinem Hintergrund.',
        },
        worst: {
          alt: 'Vier der schlechtesten Testvorhersagen: ein Hotelzimmer, ein verschneiter Übergang, ein Straßenschild und eine Toilette, alle bei null.',
          caption: 'Schlechteste Fälle, Dice bei null: Das Modell sieht Vordergrund, wo COCO keinen annotiert — oder umgekehrt.',
        },
      },
      sections: [
        {
          id: 'data',
          kicker: '01',
          title: 'Vordergrund, wie COCO ihn definiert',
          blocks: [
            {
              type: 'text',
              content:
                'Die Aufgabe ist binär: Die Referenz eines Bildes ist die Vereinigung all seiner annotierten Instanzen, alles andere ist Hintergrund. COCOs val2017 liefert 4 952 Bilder mit mindestens einer Annotation — klein genug, um zügig zu arbeiten, und vielfältig genug, um einen allgemeinen Begriff von „Objekt“ zu lernen. Rund 30 % aller Pixel landen im Vordergrund.',
            },
            {
              type: 'text',
              content:
                'Alles wird auf 128×128 gebracht — ein Vielfaches von 16, das die vier Pooling-Stufen verlangen — und einmalig in uint8-Tensoren im RAM dekodiert. Das Rastern der COCO-Polygone ist der langsame Teil, und es je Epoche zu wiederholen würde die Trainingszeit beherrschen. Masken werden per Nächster-Nachbar skaliert: Eine binäre Maske zu interpolieren erfindet Werte, die weder 0 noch 1 sind.',
            },
            {
              type: 'list',
              items: [
                '3 961 Bilder zum Trainieren, 495 zur Validierung, 496 für den Schlusstest zurückgelegt.',
                'Der Testteil bleibt bis ganz zum Schluss unberührt, damit die Modellauswahl nicht in die berichteten Zahlen sickert.',
                'Die einzige Augmentierung ist eine horizontale Spiegelung, gemeinsam auf Bild und Maske angewandt — Vordergrund ist spiegelsymmetrisch.',
              ],
            },

            {
              type: 'code',
              snippet: 'unetDataset',
              caption: 'Ein Zug für beide Tensoren. Das Bild ohne seine Maske zu spiegeln lehrt das Gegenteil der Aufgabe.',
            },          ],
        },
        {
          id: 'net',
          kicker: '02',
          title: 'Das Netz, von Hand',
          blocks: [
            {
              type: 'text',
              content:
                'Vier Abwärtsstufen, 32 Kanäle, die sich bis zu einem 512-Kanal-Flaschenhals verdoppeln, dann vier Aufwärtsstufen zurück. Zum U-Net wird es durch die Verkettung: Jede Decoder-Stufe bekommt die Encoder-Karte gleicher Auflösung gereicht und damit das räumliche Detail zurück, das das Pooling weggeworfen hatte. Genau das gibt der Maske ihre scharfen Ränder.',
            },
            { type: 'code', snippet: 'unetUp', caption: 'die Decoder-Stufe und ihre Skip-Verbindung' },
            {
              type: 'list',
              items: [
                'Faltungen mit Padding, damit die Ausgabemaske exakt die Größe der Eingabe hat — die Arbeit von 2015 schneidet stattdessen zu, was bei dieser Auflösung nichts bringt.',
                'BatchNorm nach jeder Faltung — in der ursprünglichen Architektur nicht vorgesehen, und sie beschleunigt ein Training aus zufälliger Initialisierung deutlich.',
                'Basisbreite 32 statt 64 — 7,76 Mio. Parameter statt 31 Mio., besser auf 4 000 Trainingsbilder abgestimmt.',
              ],
            },
          ],
        },
        {
          id: 'loss',
          kicker: '03',
          title: 'Zwei Verluste, addiert',
          blocks: [
            {
              type: 'text',
              content:
                'Kreuzentropie optimiert die Genauigkeit je Pixel, die von den leichten Hintergrundpixeln beherrscht werden kann. Weicher Dice optimiert die Flächenüberlappung, um die es eigentlich geht, hat aber anfangs verrauschte Gradienten. Beide zu addieren liefert beides: BCE hält die Gradienten glatt und gut skaliert, Dice treibt die Überlappung.',
            },
            { type: 'code', snippet: 'diceLoss', caption: 'das kombinierte Ziel' },
            {
              type: 'text',
              content:
                'Dice und IoU werden je Bild berechnet und dann gemittelt, nicht über den Batch zusammengefasst: Ein kleines Objekt in einem fast leeren Bild zählt so viel wie ein großes.',
            },
            { type: 'media', shot: 'curves' },
          ],
        },
        {
          id: 'results',
          kicker: '04',
          title: 'Was es gelernt hat — und was nicht',
          blocks: [
            {
              type: 'text',
              content:
                'Zwanzig Epochen mit Adam bei 3·10⁻⁴, die Lernrate durch fünf geteilt, sobald der Validierungs-Dice zwei Epochen lang stehen bleibt. Das Training dauert 18,7 Minuten auf einer Apple-GPU; behalten wird Epoche 12. Auf dem zurückgelegten Testteil: Dice 0,643, IoU 0,518, Pixelgenauigkeit 0,805.',
            },
            {
              type: 'text',
              content:
                'Training und Validierung laufen durch dieselbe Funktion, unterschieden allein dadurch, ob ihr ein Optimierer übergeben wurde — es gibt keine zweite Schleife, die mit der ersten im Gleichschritt gehalten werden müsste. Behalten werden die Gewichte des besten Validierungs-Dice, dabei sofort auf die CPU kopiert, nicht die der letzten Epoche.',
            },
            {
              type: 'code',
              snippet: 'unetEpoch',
              caption: 'Eine Schleife für beide Modi, und ein Prüfpunkt auf genau der Kennzahl, die berichtet wird.',
            },
            {
              type: 'text',
              content:
                'Die Extreme sagen mehr als der Mittelwert. Die besten Vorhersagen sehen alle gleich aus: ein großes, auffälliges Objekt, sauber vom Hintergrund getrennt. Die Fehlschläge sind von zweierlei Art: ein Vordergrund, der so klein oder so mehrdeutig ist, dass das Netz seine Maske ganz woanders hinlegt, und Bilder, in denen „Vordergrund“ schon von den Annotationen schlecht definiert ist — nur COCOs 80 Kategorien sind etikettiert, und ein nicht annotiertes, aber völlig auffälliges Objekt zählt als Hintergrund.',
            },
            { type: 'media', shot: 'best' },
            { type: 'media', shot: 'worst' },
          ],
        },
      ],
    },
  },
};

const sudoku: ProjectDef = {
  slug: 'raiders-sudoku',
  category: 'vision',
  title: 'Raiders Sudoku',
  tone: 'orange',
  tech: ['C99', 'GTK 3', 'SDL2', 'Hough', 'MLP', 'MNIST'],
  tags: ['c', 'imaging', 'vision', 'machine-learning'],
  metrics: ['92.9 % MNIST', '784-256-10'],
  /*
   * Les trois figures de la chaîne — photo, seuillage, contours — montrent la
   * même grille : c’est ce qui permet de comparer une étape à la suivante au
   * lieu de comparer deux grilles différentes.
   */
  shots: {
    app: { image: sudokuAppImage, background: 'dark' },
    scan: { image: sudokuScanImage, background: 'dark' },
    binary: { image: sudokuBinaryImage, background: 'light' },
    hough: { image: sudokuHoughImage, background: 'dark' },
    cell: { image: sudokuCellImage, background: 'light' },
    training: { image: sudokuTrainingImage, background: 'dark' },
    solved: { image: sudokuSolvedImage, background: 'dark' },
  },
  cover: 'app',
  gallery: ['scan', 'binary', 'hough', 'cell', 'training', 'solved'],
  text: {
    en: {
      tagline: 'A photo of a sudoku goes in, the solved grid comes out — in C, with no vision library',
      description:
        'Fifteen steps separate the photograph from the grid: adaptive thresholding, Sobel, a Hough transform, straightening, a cut into 81 cells, then a multilayer perceptron written by hand. A GTK window shows every step, which is what makes a failure findable.',
      shots: {
        app: {
          alt: 'The Raiders Sudoku window showing a grid after the Sobel filter, step 7 of 15, with Previous, Next and Solve buttons.',
          caption: 'Every intermediate image is saved and can be stepped through. A bad threshold is not a mystery, it is step 5.',
        },
        scan: {
          alt: 'A newspaper photograph in greyscale: a printed sudoku grid, paper grain visible.',
          caption: 'The input: a photograph, not a scan — uneven lighting, paper grain, a grid that is never quite straight. The next figure is this same photograph.',
        },
        binary: {
          alt: 'The same grid after adaptive thresholding: pure black and white, the digits and rules intact, the paper grain surviving as speckle.',
          caption: 'The same photograph after the adaptive threshold. Digits and rules come through, and so does part of the paper grain — that speckle is what the median filter and the isolated-pixel pass take out next.',
        },
        hough: {
          alt: 'The same grid reduced to its edges by the Sobel filter, with the lines found by the Hough transform drawn in red.',
          caption: 'The same photograph after Sobel: only edges are left. In red, the lines the Hough transform found in them.',
        },
        cell: {
          alt: 'One cut cell before and after clean-up: a printed 5 surrounded by fragments of rules, then the same 5 alone on white.',
          caption: 'One of the 81 cells, before and after clean-up. What the cut leaves at the edges — bits of rule, the neighbour’s ink — is removed before the cell is handed to the network, because the network was trained on digits alone.',
        },
        training: {
          alt: 'Training log: test accuracy rises from 0.1163 at epoch 0 to 0.9287 at epoch 9 000.',
          caption: 'The network’s own log. Train accuracy jumps early and then wanders, because it is measured on one batch of 100.',
        },
        solved: {
          alt: 'Two 9×9 grids side by side: on the left the 39 digits read from the photograph, on the right the complete grid, the 42 solved cells picked out in colour.',
          caption: 'The end of the chain, on the grid from the figures above: 39 digits read from the photograph on the left, the 42 the solver filled in on the right. The project’s own solver, compiled and run on that grid.',
        },
      },
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'Fifteen steps, one grid',
          blocks: [
            {
              type: 'text',
              content:
                'A four-person team project. The application is a GTK window, but what matters is what it writes: the fifteen intermediate images of the chain, which you can walk through one by one. When a photograph fails to read, you can see at which step it went wrong.',
            },
            {
              type: 'list',
              items: [
                'Clean-up: greyscale, contrast, light normalisation, median filter, adaptive threshold, isolated-pixel removal.',
                'Geometry: Sobel, Hough transform, line filtering, straightening, square detection, biggest square, crop.',
                'Reading: the crop is cut into 81 cells, each one passed to the network.',
                'Solving: backtracking, then the filled grid is written out.',
              ],
            },
          ],
        },
        {
          id: 'clean',
          kicker: '02',
          title: 'Getting the paper out of the way',
          blocks: [
            { type: 'media', shot: 'scan' },
            {
              type: 'text',
              content:
                'A single global threshold fails on a photograph: one corner is in shadow, the other catches the lamp. The threshold is therefore local — each pixel is compared to the mean of the window around it, and a summed-area table makes that mean cost four reads whatever the window size.',
            },
            {
              type: 'code',
              snippet: 'adaptThreshold',
              caption: 'The margin `t` is not fixed: the image is measured first, and a noisier photograph gets a wider margin.',
            },
            { type: 'media', shot: 'binary' },
          ],
        },
        {
          id: 'grid',
          kicker: '03',
          title: 'Finding the grid again',
          blocks: [
            {
              type: 'text',
              content:
                'Sobel reduces the photograph to its edges. The Hough transform then turns every edge pixel into a curve in (ρ, θ) space; where enough curves cross, there is a line. The peaks of that accumulator are the rules of the grid.',
            },
            { type: 'media', shot: 'hough' },
            {
              type: 'text',
              content:
                'The accumulator is voted into by every edge pixel, for every angle — which is why the threshold that turns a peak into a line is relative rather than absolute: a dim photograph would lose all its lines to a fixed cutoff.',
            },
            {
              type: 'code',
              snippet: 'houghVote',
              caption: 'The angle of those peaks is also the tilt of the photograph, so straightening costs one rotation and no extra pass.',
            },
            {
              type: 'text',
              content:
                'What remains is the largest square: it is cropped, cut into 81 cells, and each cell written out as its own image — which is what the network reads.',
            },
          ],
        },
        {
          id: 'digits',
          kicker: '04',
          title: 'Reading the digits',
          blocks: [
            { type: 'media', shot: 'cell' },
            {
              type: 'text',
              content:
                'The network is a two-layer perceptron written directly in C, on top of a hand-rolled matrix type: 784 inputs, 256 hidden units under a sigmoid, 10 outputs under a softmax. No framework, so the backward pass is written out too — forward, error, and one matrix product per layer to get the gradient back.',
            },
            {
              type: 'code',
              snippet: 'forwardBackward',
              caption: 'The whole of learning, in one function: the transposes are there because the gradient of a product runs the other way round.',
            },
            {
              type: 'text',
              content:
                'Those transposes are the reason the matrix type is worth a look. Transposing a matrix here moves nothing: it swaps the two dimensions and raises a flag. The cost is deferred to every read, which changes the way it walks the same buffer — the right trade when a transpose is followed by one product and then thrown away, which is exactly what a backward pass does.',
            },
            {
              type: 'code',
              snippet: 'matTranspose',
              caption: 'A transpose in constant time, paid back one element at a time.',
            },
            {
              type: 'text',
              content:
                'Weight initialization is hand-rolled too. C has no normal distribution, so the weights come out of the Marsaglia polar method: draw in the square until you land in the disc, and one accepted draw yields two normal values — one for each half of the buffer.',
            },
            {
              type: 'code',
              snippet: 'matNormal',
              caption: 'The final division by two is not in the method: it was added because the draws came out too wide, and it stayed.',
            },
            {
              type: 'text',
              content:
                'It is trained on MNIST — 60 000 training images, 10 000 more held out for testing — with a learning rate of 1 and batches of 100 drawn at random, for 10 000 iterations.',
            },
            { type: 'media', shot: 'training' },
            {
              type: 'text',
              content:
                'Test accuracy settles just under 93 %, which is enough for printed digits — far cleaner than the handwriting MNIST is made of. The errors that remain come from the cut rather than the classifier: a cell clipped one pixel too tight loses the bar of a 7.',
            },
          ],
        },
        {
          id: 'solve',
          kicker: '05',
          title: 'Solving',
          blocks: [
            {
              type: 'text',
              content:
                'The solver is the short part of the project: plain backtracking, one recursive call per empty cell. On a 9×9 grid it returns instantly, so nothing here needed to be cleverer.',
            },
            { type: 'code', snippet: 'sudokuSolve' },
            { type: 'media', shot: 'solved' },
            {
              type: 'text',
              content:
                'End to end: a photograph goes in, fifteen steps later 39 digits come out of it, and the solver returns the 42 that were missing. The filled grid is written back to disk next to the input — which is where the chain stops.',
            },
          ],
        },
      ],
    },

    fr: {
      tagline: 'Une photo de sudoku entre, la grille résolue sort — en C, sans bibliothèque de vision',
      description:
        'Quinze étapes séparent la photo de la grille : seuillage adaptatif, Sobel, transformée de Hough, redressement, découpe en 81 cases, puis un perceptron multicouche écrit à la main. Une fenêtre GTK montre chaque étape, et c’est ce qui rend un échec trouvable.',
      shots: {
        app: {
          alt: 'La fenêtre Raiders Sudoku affichant une grille après filtre de Sobel, étape 7 sur 15, avec les boutons Previous, Next et Solve.',
          caption: 'Chaque image intermédiaire est écrite et se parcourt pas à pas. Un mauvais seuil n’est plus un mystère : c’est l’étape 5.',
        },
        scan: {
          alt: 'Photo de journal en niveaux de gris : une grille de sudoku imprimée, avec le grain du papier.',
          caption: 'L’entrée : une photo, pas un scan — éclairage inégal, grain du papier, grille jamais tout à fait droite. La figure suivante part de cette même photo.',
        },
        binary: {
          alt: 'La même grille après seuillage adaptatif : du noir et du blanc purs, chiffres et traits intacts, le grain du papier restant sous forme de mouchetis.',
          caption: 'La même photo après le seuillage adaptatif. Les chiffres et les traits passent, une partie du grain du papier aussi — ce mouchetis, c’est ce que retirent ensuite le filtre médian et la passe sur les pixels isolés.',
        },
        hough: {
          alt: 'La même grille réduite à ses contours par le filtre de Sobel, avec les droites trouvées par la transformée de Hough tracées en rouge.',
          caption: 'La même photo après Sobel : il ne reste que les contours. En rouge, les droites que la transformée de Hough y a trouvées.',
        },
        cell: {
          alt: 'Une case découpée avant et après nettoyage : un 5 imprimé entouré de morceaux de traits, puis le même 5 seul sur fond blanc.',
          caption: 'Une des 81 cases, avant et après nettoyage. Ce que la découpe laisse sur les bords — bouts de traits, encre de la case voisine — est retiré avant de passer la case au réseau, qui n’a appris que sur des chiffres seuls.',
        },
        training: {
          alt: 'Journal d’entraînement : la précision de test passe de 0,1163 à l’époque 0 à 0,9287 à l’époque 9 000.',
          caption: 'Le journal du réseau lui-même. La précision d’entraînement grimpe tôt puis flotte, parce qu’elle se mesure sur un seul lot de 100.',
        },
        solved: {
          alt: 'Deux grilles 9×9 côte à côte : à gauche les 39 chiffres lus sur la photo, à droite la grille complète, les 42 cases résolues ressortant en couleur.',
          caption: 'Le bout de la chaîne, sur la grille des figures précédentes : à gauche les 39 chiffres lus sur la photo, à droite les 42 que le solveur a remplis. Le solveur du projet, compilé et lancé sur cette grille.',
        },
      },
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'Quinze étapes, une grille',
          blocks: [
            {
              type: 'text',
              content:
                'Projet d’équipe, à quatre. L’application est une fenêtre GTK, mais l’essentiel est ce qu’elle écrit : les quinze images intermédiaires de la chaîne, qu’on parcourt une par une. Quand une photo se lit mal, on voit à quelle étape ça s’est joué.',
            },
            {
              type: 'list',
              items: [
                'Nettoyage : niveaux de gris, contraste, normalisation des lumières, filtre médian, seuillage adaptatif, retrait des pixels isolés.',
                'Géométrie : Sobel, transformée de Hough, filtrage des droites, redressement, détection des carrés, plus grand carré, découpe.',
                'Lecture : le recadrage est découpé en 81 cases, chacune passée au réseau.',
                'Résolution : backtracking, puis la grille remplie est écrite.',
              ],
            },
          ],
        },
        {
          id: 'clean',
          kicker: '02',
          title: 'Faire disparaître le papier',
          blocks: [
            { type: 'media', shot: 'scan' },
            {
              type: 'text',
              content:
                'Un seuil global échoue sur une photo : un coin est dans l’ombre, l’autre prend la lampe. Le seuil est donc local — chaque pixel se compare à la moyenne de la fenêtre autour de lui, et une image intégrale fait coûter cette moyenne quatre lectures, quelle que soit la taille de la fenêtre.',
            },
            {
              type: 'code',
              snippet: 'adaptThreshold',
              caption: 'La marge `t` n’est pas fixe : l’image est mesurée d’abord, et une photo plus bruitée reçoit une marge plus large.',
            },
            { type: 'media', shot: 'binary' },
          ],
        },
        {
          id: 'grid',
          kicker: '03',
          title: 'Retrouver la grille',
          blocks: [
            {
              type: 'text',
              content:
                'Sobel réduit la photo à ses contours. La transformée de Hough envoie ensuite chaque pixel de contour sur une courbe de l’espace (ρ, θ) ; là où assez de courbes se croisent, il y a une droite. Les pics de cet accumulateur sont les traits de la grille.',
            },
            { type: 'media', shot: 'hough' },
            {
              type: 'text',
              content:
                'Chaque pixel de contour vote, pour tous les angles : c’est pourquoi le seuil qui fait d’un pic une droite est relatif et non absolu — une photo terne perdrait toutes ses droites derrière une valeur fixe.',
            },
            {
              type: 'code',
              snippet: 'houghVote',
              caption: 'L’angle de ces pics est aussi l’inclinaison de la photo : redresser ne coûte donc qu’une rotation, sans passe supplémentaire.',
            },
            {
              type: 'text',
              content:
                'Reste le plus grand carré, qu’on recadre, découpe en 81 cases, et dont chaque case est écrite comme sa propre image — c’est ce que lit le réseau.',
            },
          ],
        },
        {
          id: 'digits',
          kicker: '04',
          title: 'Lire les chiffres',
          blocks: [
            { type: 'media', shot: 'cell' },
            {
              type: 'text',
              content:
                'Le réseau est un perceptron à deux couches écrit directement en C, au-dessus d’un type matrice fait maison : 784 entrées, 256 unités cachées sous une sigmoïde, 10 sorties sous un softmax. Pas de bibliothèque, donc la rétropropagation s’écrit aussi — l’aller, l’erreur, et un produit de matrices par couche pour faire redescendre le gradient.',
            },
            {
              type: 'code',
              snippet: 'forwardBackward',
              caption: 'Tout l’apprentissage tient dans une fonction : les transpositions sont là parce que le gradient d’un produit se lit dans l’autre sens.',
            },
            {
              type: 'text',
              content:
                'Ces transpositions sont la raison pour laquelle le type matrice mérite un coup d’œil. Transposer, ici, ne déplace rien : on échange les deux dimensions et on lève un drapeau. Le coût est reporté sur chaque lecture, qui change de parcours dans le même tampon — le bon marché quand une transposition est suivie d’un seul produit puis jetée, ce que fait exactement un passage arrière.',
            },
            {
              type: 'code',
              snippet: 'matTranspose',
              caption: 'Une transposition en temps constant, remboursée un élément à la fois.',
            },
            {
              type: 'text',
              content:
                'L’initialisation des poids est écrite à la main elle aussi. Le C n’a pas de loi normale : les poids sortent de la méthode polaire de Marsaglia — tirer dans le carré jusqu’à tomber dans le disque, un tirage accepté donnant deux valeurs normales, une pour chaque moitié du tampon.',
            },
            {
              type: 'code',
              snippet: 'matNormal',
              caption: 'La division finale par deux n’est pas dans la méthode : elle a été ajoutée parce que les tirages sortaient trop larges, et elle est restée.',
            },
            {
              type: 'text',
              content:
                'Il s’entraîne sur MNIST — 60 000 images d’entraînement, 10 000 autres gardées pour le test — avec un pas de 1 et des lots de 100 tirés au hasard, sur 10 000 itérations.',
            },
            { type: 'media', shot: 'training' },
            {
              type: 'text',
              content:
                'La précision de test se stabilise juste sous 93 %, ce qui suffit pour des chiffres imprimés — bien plus propres que l’écriture manuscrite dont MNIST est fait. Les erreurs qui restent viennent de la découpe plutôt que du classifieur : une case rognée d’un pixel de trop perd la barre du 7.',
            },
          ],
        },
        {
          id: 'solve',
          kicker: '05',
          title: 'Résoudre',
          blocks: [
            {
              type: 'text',
              content:
                'Le solveur est la partie courte du projet : du backtracking simple, un appel récursif par case vide. Sur une grille 9×9 il répond instantanément, donc rien ici n’avait besoin d’être plus malin.',
            },
            { type: 'code', snippet: 'sudokuSolve' },
            { type: 'media', shot: 'solved' },
            {
              type: 'text',
              content:
                'Bout à bout : une photo entre, quinze étapes plus tard il en sort 39 chiffres, et le solveur rend les 42 qui manquaient. La grille remplie est réécrite sur le disque à côté de l’entrée — c’est là que la chaîne s’arrête.',
            },
          ],
        },
      ],
    },

    de: {
      tagline: 'Ein Foto eines Sudokus geht hinein, das gelöste Gitter kommt heraus — in C, ohne Vision-Bibliothek',
      description:
        'Fünfzehn Schritte trennen das Foto vom Gitter: adaptive Schwellwertbildung, Sobel, Hough-Transformation, Begradigung, Zerlegung in 81 Zellen, dann ein von Hand geschriebenes mehrschichtiges Perzeptron. Ein GTK-Fenster zeigt jeden Schritt — und genau das macht einen Fehlschlag auffindbar.',
      shots: {
        app: {
          alt: 'Das Fenster von Raiders Sudoku mit einem Gitter nach dem Sobel-Filter, Schritt 7 von 15, mit den Schaltflächen Previous, Next und Solve.',
          caption: 'Jedes Zwischenbild wird gespeichert und lässt sich Schritt für Schritt durchgehen. Ein schlechter Schwellwert ist kein Rätsel mehr, sondern Schritt 5.',
        },
        scan: {
          alt: 'Ein Zeitungsfoto in Graustufen: ein gedrucktes Sudoku-Gitter, die Papierkörnung sichtbar.',
          caption: 'Die Eingabe: ein Foto, kein Scan — ungleiche Beleuchtung, Papierkörnung, ein nie ganz gerades Gitter. Die nächste Abbildung geht von demselben Foto aus.',
        },
        binary: {
          alt: 'Dasselbe Gitter nach der adaptiven Schwellwertbildung: reines Schwarz und Weiß, Ziffern und Linien erhalten, die Papierkörnung als Sprenkel.',
          caption: 'Dasselbe Foto nach der adaptiven Schwellwertbildung. Ziffern und Linien kommen durch, ein Teil der Papierkörnung ebenfalls — diese Sprenkel entfernen anschließend der Medianfilter und der Durchgang über einzelne Pixel.',
        },
        hough: {
          alt: 'Dasselbe Gitter, vom Sobel-Filter auf seine Kanten reduziert, mit den von der Hough-Transformation gefundenen Geraden in Rot.',
          caption: 'Dasselbe Foto nach Sobel: nur Kanten bleiben. In Rot die Geraden, die die Hough-Transformation darin gefunden hat.',
        },
        cell: {
          alt: 'Eine ausgeschnittene Zelle vor und nach der Reinigung: eine gedruckte 5, umgeben von Linienresten, dann dieselbe 5 allein auf Weiß.',
          caption: 'Eine der 81 Zellen, vor und nach der Reinigung. Was der Schnitt an den Rändern stehen lässt — Linienreste, Tinte der Nachbarzelle — wird entfernt, bevor die Zelle ans Netz geht, das nur auf einzelnen Ziffern gelernt hat.',
        },
        training: {
          alt: 'Trainingsprotokoll: die Testgenauigkeit steigt von 0,1163 in Epoche 0 auf 0,9287 in Epoche 9 000.',
          caption: 'Das Protokoll des Netzes selbst. Die Trainingsgenauigkeit springt früh hoch und schwankt dann, weil sie an einem einzigen Batch von 100 gemessen wird.',
        },
        solved: {
          alt: 'Zwei 9×9-Gitter nebeneinander: links die 39 vom Foto gelesenen Ziffern, rechts das vollständige Gitter, die 42 gelösten Zellen farblich hervorgehoben.',
          caption: 'Das Ende der Kette, auf dem Gitter der vorigen Abbildungen: links die 39 vom Foto gelesenen Ziffern, rechts die 42, die der Löser ergänzt hat. Der Löser des Projekts, kompiliert und auf dieses Gitter angewandt.',
        },
      },
      sections: [
        {
          id: 'pipeline',
          kicker: '01',
          title: 'Fünfzehn Schritte, ein Gitter',
          blocks: [
            {
              type: 'text',
              content:
                'Ein Teamprojekt zu viert. Die Anwendung ist ein GTK-Fenster, entscheidend ist aber, was sie schreibt: die fünfzehn Zwischenbilder der Kette, die man einzeln durchgehen kann. Wird ein Foto schlecht gelesen, sieht man, an welchem Schritt es lag.',
            },
            {
              type: 'list',
              items: [
                'Bereinigung: Graustufen, Kontrast, Lichtnormalisierung, Medianfilter, adaptive Schwellwertbildung, Entfernen isolierter Pixel.',
                'Geometrie: Sobel, Hough-Transformation, Filtern der Geraden, Begradigung, Quadraterkennung, größtes Quadrat, Zuschnitt.',
                'Lesen: der Zuschnitt wird in 81 Zellen zerlegt, jede geht ans Netz.',
                'Lösen: Backtracking, dann wird das gefüllte Gitter geschrieben.',
              ],
            },
          ],
        },
        {
          id: 'clean',
          kicker: '02',
          title: 'Das Papier verschwinden lassen',
          blocks: [
            { type: 'media', shot: 'scan' },
            {
              type: 'text',
              content:
                'Ein globaler Schwellwert versagt bei einem Foto: eine Ecke liegt im Schatten, die andere fängt die Lampe. Der Schwellwert ist deshalb lokal — jedes Pixel wird mit dem Mittel seines Fensters verglichen, und eine Integralbildtabelle macht dieses Mittel zu vier Lesezugriffen, unabhängig von der Fenstergröße.',
            },
            {
              type: 'code',
              snippet: 'adaptThreshold',
              caption: 'Die Marge `t` ist nicht fest: das Bild wird zuerst vermessen, und ein verrauschteres Foto bekommt eine größere Marge.',
            },
            { type: 'media', shot: 'binary' },
          ],
        },
        {
          id: 'grid',
          kicker: '03',
          title: 'Das Gitter wiederfinden',
          blocks: [
            {
              type: 'text',
              content:
                'Sobel reduziert das Foto auf seine Kanten. Die Hough-Transformation bildet dann jedes Kantenpixel auf eine Kurve im (ρ, θ)-Raum ab; wo sich genug Kurven schneiden, liegt eine Gerade. Die Maxima dieses Akkumulators sind die Linien des Gitters.',
            },
            { type: 'media', shot: 'hough' },
            {
              type: 'text',
              content:
                'Jedes Kantenpixel stimmt ab, für jeden Winkel: deshalb ist die Schwelle, die aus einem Maximum eine Gerade macht, relativ und nicht absolut — ein flaues Foto verlöre hinter einem festen Wert alle seine Geraden.',
            },
            {
              type: 'code',
              snippet: 'houghVote',
              caption: 'Der Winkel dieser Maxima ist zugleich die Neigung des Fotos: Begradigen kostet daher eine Drehung und keinen zusätzlichen Durchgang.',
            },
            {
              type: 'text',
              content:
                'Übrig bleibt das größte Quadrat — zugeschnitten, in 81 Zellen zerlegt, jede Zelle als eigenes Bild geschrieben. Das liest das Netz.',
            },
          ],
        },
        {
          id: 'digits',
          kicker: '04',
          title: 'Die Ziffern lesen',
          blocks: [
            { type: 'media', shot: 'cell' },
            {
              type: 'text',
              content:
                'Das Netz ist ein zweischichtiges Perzeptron, direkt in C geschrieben, auf einem selbst gebauten Matrixtyp: 784 Eingänge, 256 versteckte Einheiten unter einer Sigmoide, 10 Ausgänge unter einem Softmax. Keine Bibliothek, also wird auch der Rückwärtsdurchlauf ausgeschrieben — Vorwärtsschritt, Fehler und ein Matrixprodukt je Schicht, um den Gradienten zurückzuführen.',
            },
            {
              type: 'code',
              snippet: 'forwardBackward',
              caption: 'Das ganze Lernen in einer Funktion: die Transponierungen stehen dort, weil der Gradient eines Produkts andersherum läuft.',
            },
            {
              type: 'text',
              content:
                'Wegen dieser Transpositionen lohnt sich ein Blick auf den Matrixtyp. Transponieren verschiebt hier nichts: es vertauscht die beiden Dimensionen und setzt ein Flag. Die Kosten verschieben sich auf jeden Lesezugriff, der denselben Puffer anders durchläuft — der richtige Handel, wenn auf eine Transposition ein einziges Produkt folgt und sie dann weggeworfen wird, also genau das, was ein Rückwärtsdurchlauf tut.',
            },
            {
              type: 'code',
              snippet: 'matTranspose',
              caption: 'Eine Transposition in konstanter Zeit, Element für Element abbezahlt.',
            },
            {
              type: 'text',
              content:
                'Auch die Initialisierung der Gewichte ist handgeschrieben. C kennt keine Normalverteilung: die Gewichte stammen aus der Polarmethode von Marsaglia — im Quadrat ziehen, bis man in der Scheibe landet, wobei ein angenommener Zug zwei normalverteilte Werte liefert, je einen für jede Hälfte des Puffers.',
            },
            {
              type: 'code',
              snippet: 'matNormal',
              caption: 'Die abschließende Division durch zwei gehört nicht zur Methode: sie kam dazu, weil die Züge zu breit ausfielen, und blieb.',
            },
            {
              type: 'text',
              content:
                'Trainiert wird auf MNIST — 60 000 Trainingsbilder, 10 000 weitere für den Test zurückgehalten — mit Lernrate 1 und zufällig gezogenen Batches von 100, über 10 000 Iterationen.',
            },
            { type: 'media', shot: 'training' },
            {
              type: 'text',
              content:
                'Die Testgenauigkeit pendelt sich knapp unter 93 % ein, was für gedruckte Ziffern reicht — weit sauberer als die Handschrift, aus der MNIST besteht. Die verbleibenden Fehler kommen eher vom Zuschnitt als vom Klassifikator: eine Zelle, die ein Pixel zu eng geschnitten ist, verliert den Balken der 7.',
            },
          ],
        },
        {
          id: 'solve',
          kicker: '05',
          title: 'Lösen',
          blocks: [
            {
              type: 'text',
              content:
                'Der Löser ist der kurze Teil des Projekts: schlichtes Backtracking, ein rekursiver Aufruf pro leerer Zelle. Auf einem 9×9-Gitter antwortet er sofort, hier musste also nichts cleverer sein.',
            },
            { type: 'code', snippet: 'sudokuSolve' },
            { type: 'media', shot: 'solved' },
            {
              type: 'text',
              content:
                'Von Anfang bis Ende: ein Foto geht hinein, fünfzehn Schritte später kommen 39 Ziffern heraus, und der Löser liefert die 42 fehlenden nach. Das gefüllte Gitter wird neben der Eingabe auf die Platte geschrieben — dort endet die Kette.',
            },
          ],
        },
      ],
    },
  },
};

const sh42: ProjectDef = {
  slug: '42sh',
  category: 'systems',
  title: '42sh',
  tone: 'cyan',
  tech: ['C99', 'POSIX', 'Autotools'],
  tags: ['c', 'systems'],
  metrics: ['175 / 182'],
  shots: {
    session: { image: shSessionImage, background: 'dark' },
    tests: { image: shTestsImage, background: 'dark' },
  },
  cover: 'session',
  gallery: ['tests'],
  text: {
    en: {
      tagline: 'A POSIX shell in C: lexer, parser, tree, and the forks that run it',
      description:
        'No readline, no yacc: the tokens, the grammar and the execution are hand-written. Every feature is judged the same way — the same command given to 42sh and to bash --posix, and the two outputs have to match.',
      shots: {
        session: {
          alt: 'Terminal window: seven commands given to 42sh — a condition, a for loop, && and ||, a pipe, a redirection, a subshell, a negation — each followed by its output.',
          caption: 'A session run against the current build: control flow, pipes, redirections and subshells, all from the hand-written grammar.',
        },
        tests: {
          alt: 'Output of the test suite: seven failing cases listed in red, then the total, 175 out of 182.',
          caption: 'The project’s own suite, replayed. The seven failures are all variable expansion or duplicating redirections — the rest of the grammar holds.',
        },
      },
      sections: [
        {
          id: 'grammar',
          kicker: '01',
          title: 'Thirty tokens, thirteen nodes',
          blocks: [
            {
              type: 'text',
              content:
                'The lexer produces thirty token kinds and nothing else — keywords, operators, IO numbers, words. The parser is recursive descent, written by hand against the shell grammar, and it builds a tree of thirteen node kinds. There is no generator anywhere in the chain.',
            },
            {
              type: 'list',
              items: [
                'Conditions: if / then / elif / else / fi.',
                'Loops: while, until, for … in, with break and continue.',
                'Composition: pipes, && and ||, negation, subshells in parentheses, lists separated by ; or a newline.',
                'Redirections: seven operators, with an optional IO number.',
              ],
            },
          ],
        },
        {
          id: 'exec',
          kicker: '02',
          title: 'Running the tree',
          blocks: [
            {
              type: 'text',
              content:
                'Execution walks the same tree the parser built, one function per node kind. A pipeline forks both sides and calls itself on each — which is why `a | b | c` needs no special case: it is a pipeline whose left side is a pipeline.',
            },
            { type: 'code', snippet: 'shPipeline' },
            {
              type: 'text',
              content:
                'Seven builtins run in the shell’s own process, because they have to: cd would be pointless in a child, and so would export. Everything else is fork and execvp, with descriptors saved and restored around each redirection.',
            },
          ],
        },
        {
          id: 'tests',
          kicker: '03',
          title: 'Measured against bash',
          blocks: [
            {
              type: 'text',
              content:
                'The suite has one referee: bash itself. Each of the 182 cases runs the same input through 42sh and through `bash --posix`, then compares standard output and exit code, under a two-second timeout so an infinite loop fails instead of hanging.',
            },
            { type: 'media', shot: 'tests' },
            {
              type: 'text',
              content:
                'Replayed today, 175 of the 182 pass. The seven that do not are worth naming: `$?` and `$IFS`, two variables concatenated, an assignment used as a command prefix, and the duplicating redirections `>&` and `<&`. None of them is a grammar failure.',
            },
          ],
        },
      ],
    },

    fr: {
      tagline: 'Un shell POSIX en C : lexeur, parseur, arbre, et les fork qui l’exécutent',
      description:
        'Ni readline, ni yacc : les jetons, la grammaire et l’exécution sont écrits à la main. Chaque fonctionnalité se juge de la même façon — la même commande passée à 42sh puis à bash --posix, et les deux sorties doivent coïncider.',
      shots: {
        session: {
          alt: 'Fenêtre de terminal : sept commandes passées à 42sh — une condition, une boucle for, && et ||, un tube, une redirection, un sous-shell, une négation — chacune suivie de sa sortie.',
          caption: 'Une session jouée sur la compilation actuelle : structures de contrôle, tubes, redirections et sous-shells, tous issus de la grammaire écrite à la main.',
        },
        tests: {
          alt: 'Sortie de la suite de tests : sept cas en échec listés en rouge, puis le total, 175 sur 182.',
          caption: 'La suite du projet, rejouée. Les sept échecs relèvent tous de l’expansion de variables ou des redirections dupliquantes — le reste de la grammaire tient.',
        },
      },
      sections: [
        {
          id: 'grammar',
          kicker: '01',
          title: 'Trente jetons, treize nœuds',
          blocks: [
            {
              type: 'text',
              content:
                'Le lexeur produit trente sortes de jetons et rien d’autre — mots-clés, opérateurs, numéros de descripteur, mots. Le parseur est une descente récursive écrite à la main d’après la grammaire du shell, et il construit un arbre de treize sortes de nœuds. Aucun générateur dans la chaîne.',
            },
            {
              type: 'list',
              items: [
                'Conditions : if / then / elif / else / fi.',
                'Boucles : while, until, for … in, avec break et continue.',
                'Composition : tubes, && et ||, négation, sous-shells entre parenthèses, listes séparées par ; ou par un saut de ligne.',
                'Redirections : sept opérateurs, avec numéro de descripteur facultatif.',
              ],
            },
          ],
        },
        {
          id: 'exec',
          kicker: '02',
          title: 'Exécuter l’arbre',
          blocks: [
            {
              type: 'text',
              content:
                'L’exécution parcourt l’arbre que le parseur a construit, une fonction par sorte de nœud. Un tube fork ses deux côtés et se rappelle sur chacun — c’est pourquoi `a | b | c` ne demande aucun cas particulier : c’est un tube dont le côté gauche est un tube.',
            },
            { type: 'code', snippet: 'shPipeline' },
            {
              type: 'text',
              content:
                'Sept commandes intégrées tournent dans le processus du shell, parce qu’elles le doivent : un cd dans un fils ne servirait à rien, un export non plus. Tout le reste est fork et execvp, avec les descripteurs sauvés puis rendus autour de chaque redirection.',
            },
          ],
        },
        {
          id: 'tests',
          kicker: '03',
          title: 'Se mesurer à bash',
          blocks: [
            {
              type: 'text',
              content:
                'La suite n’a qu’un arbitre : bash lui-même. Chacun des 182 cas passe la même entrée dans 42sh puis dans `bash --posix`, et compare la sortie standard et le code de retour, sous un délai de deux secondes — une boucle infinie échoue au lieu de bloquer.',
            },
            { type: 'media', shot: 'tests' },
            {
              type: 'text',
              content:
                'Rejouée aujourd’hui, la suite passe 175 cas sur 182. Les sept autres méritent d’être nommés : `$?` et `$IFS`, deux variables collées, une affectation utilisée comme préfixe de commande, et les redirections dupliquantes `>&` et `<&`. Aucun n’est un échec de la grammaire.',
            },
          ],
        },
      ],
    },

    de: {
      tagline: 'Eine POSIX-Shell in C: Lexer, Parser, Baum und die Forks, die ihn ausführen',
      description:
        'Kein readline, kein yacc: Tokens, Grammatik und Ausführung sind von Hand geschrieben. Jede Funktion wird gleich geprüft — derselbe Befehl an 42sh und an bash --posix, und beide Ausgaben müssen übereinstimmen.',
      shots: {
        session: {
          alt: 'Terminalfenster: sieben Befehle an 42sh — eine Bedingung, eine for-Schleife, && und ||, eine Pipe, eine Umleitung, eine Subshell, eine Negation — jeweils mit ihrer Ausgabe.',
          caption: 'Eine Sitzung auf dem aktuellen Build: Kontrollfluss, Pipes, Umleitungen und Subshells, alle aus der von Hand geschriebenen Grammatik.',
        },
        tests: {
          alt: 'Ausgabe der Testsuite: sieben fehlgeschlagene Fälle in Rot, dann die Summe, 175 von 182.',
          caption: 'Die Suite des Projekts, erneut ausgeführt. Die sieben Fehlschläge betreffen alle Variablenexpansion oder duplizierende Umleitungen — die Grammatik hält.',
        },
      },
      sections: [
        {
          id: 'grammar',
          kicker: '01',
          title: 'Dreißig Tokens, dreizehn Knoten',
          blocks: [
            {
              type: 'text',
              content:
                'Der Lexer erzeugt dreißig Tokenarten und sonst nichts — Schlüsselwörter, Operatoren, Deskriptornummern, Wörter. Der Parser ist ein von Hand geschriebener rekursiver Abstieg entlang der Shell-Grammatik und baut einen Baum aus dreizehn Knotenarten. Kein Generator in der ganzen Kette.',
            },
            {
              type: 'list',
              items: [
                'Bedingungen: if / then / elif / else / fi.',
                'Schleifen: while, until, for … in, mit break und continue.',
                'Komposition: Pipes, && und ||, Negation, Subshells in Klammern, Listen getrennt durch ; oder Zeilenumbruch.',
                'Umleitungen: sieben Operatoren, mit optionaler Deskriptornummer.',
              ],
            },
          ],
        },
        {
          id: 'exec',
          kicker: '02',
          title: 'Den Baum ausführen',
          blocks: [
            {
              type: 'text',
              content:
                'Die Ausführung läuft über denselben Baum, den der Parser gebaut hat, eine Funktion je Knotenart. Eine Pipeline forkt beide Seiten und ruft sich auf jeder erneut auf — deshalb braucht `a | b | c` keinen Sonderfall: es ist eine Pipeline, deren linke Seite eine Pipeline ist.',
            },
            { type: 'code', snippet: 'shPipeline' },
            {
              type: 'text',
              content:
                'Sieben eingebaute Befehle laufen im Prozess der Shell selbst, weil sie es müssen: ein cd im Kindprozess wäre sinnlos, ein export ebenso. Alles andere ist fork und execvp, mit gesicherten und wiederhergestellten Deskriptoren um jede Umleitung.',
            },
          ],
        },
        {
          id: 'tests',
          kicker: '03',
          title: 'An bash gemessen',
          blocks: [
            {
              type: 'text',
              content:
                'Die Suite hat nur einen Schiedsrichter: bash selbst. Jeder der 182 Fälle schickt dieselbe Eingabe durch 42sh und durch `bash --posix` und vergleicht Standardausgabe und Rückgabewert, mit zwei Sekunden Zeitlimit — eine Endlosschleife scheitert, statt zu hängen.',
            },
            { type: 'media', shot: 'tests' },
            {
              type: 'text',
              content:
                'Heute erneut ausgeführt, bestehen 175 der 182 Fälle. Die sieben anderen seien genannt: `$?` und `$IFS`, zwei aneinandergehängte Variablen, eine Zuweisung als Befehlspräfix, sowie die duplizierenden Umleitungen `>&` und `<&`. Keiner davon ist ein Grammatikfehler.',
            },
          ],
        },
      ],
    },
  },
};

const tiger: ProjectDef = {
  slug: 'tiger',
  category: 'systems',
  title: 'Tiger',
  tone: 'pink',
  tech: ['C++', 'Compilation', 'AST'],
  tags: ['cpp', 'systems'],
  shots: {
    pipeline: { image: tigerPipelineImage, background: 'dark' },
    ast: { image: tigerAstImage, background: 'dark' },
  },
  cover: 'pipeline',
  gallery: ['ast'],
  text: {
    en: {
      tagline: 'A compiler for the Tiger language, designed and taken from source text to executable',
      description:
        'Designing and building a compiler, in C++: lexing, parsing, name binding, type checking, objects and overloading, desugaring and escape analysis — the whole chain from the source text down to where LLVM takes over.',
      shots: {
        pipeline: {
          alt: 'Diagram of the Tiger compilation chain: source.tig, front end, semantic analysis, tree rewriting, code generation, executable.',
          caption: 'The chain, end to end: every stage consumes what the previous one produced. Assembly and linking are LLVM’s job; everything upstream of it is the compiler itself.',
        },
        ast: {
          alt: 'A one-line Tiger expression above the tree a parser builds from it: an If node over a comparison, an integer and a multiplication.',
          caption: 'What parsing produces: the same expression, as a tree. A schematic — the project’s own code is not shown here.',
        },
      },
      sections: [
        {
          id: 'front',
          kicker: '01',
          title: 'From text to a tree',
          blocks: [
            {
              type: 'text',
              content:
                'The lexer turns characters into tokens and drops what carries no meaning — spaces, comments — while keeping the position of everything, because that position is what every later error message will point at.',
            },
            {
              type: 'text',
              content:
                'The parser then decides what the tokens mean together. `if a = 0 then 1 else a * 2` is unambiguous to a reader, but a grammar has to state that `*` binds tighter than `=`, and that an `else` belongs to the nearest `if`. What comes out is a tree that no longer contains a single parenthesis: the shape holds the priorities.',
            },
            { type: 'media', shot: 'ast' },
          ],
        },
        {
          id: 'bind',
          kicker: '02',
          title: 'Binding and typing',
          blocks: [
            {
              type: 'text',
              content:
                'Binding answers one question per identifier: which declaration does this name refer to? Scopes open and close, shadowing is legal, and a mistake here is silent — the program still compiles, it just does the wrong thing.',
            },
            {
              type: 'text',
              content:
                'Type checking is where a compiler is judged, and not on the programs it accepts. Anyone can reject a bad program; the work is to say where it went wrong and why, on the line the user actually wrote, without turning one error into twenty.',
            },
            {
              type: 'text',
              content:
                'Objects and overloading extend that pass rather than follow it: choosing between two methods of the same name means knowing the types of the arguments, which means binding and typing already have to be right.',
            },
          ],
        },
        {
          id: 'rewrite',
          kicker: '03',
          title: 'Rewriting the tree',
          blocks: [
            {
              type: 'text',
              content:
                'Desugaring removes constructs by turning them into simpler ones that already work — the back end then has fewer cases to handle, and every one of them is already tested.',
            },
            {
              type: 'text',
              content:
                'Escape analysis asks which variables cannot live in a register: those a nested function reads or writes, since it reaches them through the enclosing frame. Being wrong is expensive in both directions — too strict and everything spills to memory, too loose and the nested function reads a slot in the frame that the variable, kept in a register, never reached.',
            },
          ],
        },
        {
          id: 'inherited',
          kicker: '04',
          title: 'Writing inside code that already exists',
          blocks: [
            {
              type: 'text',
              content:
                'The project started from the course skeleton rather than a blank page: an architecture, a set of conventions and a tree representation were already there, and the first job was to find where a new pass plugs in. It is the more realistic exercise — almost no professional code starts empty.',
            },
            {
              type: 'text',
              content:
                'What I wrote runs from lexing to escape analysis; the lowering to LLVM was already in place. The code itself is not shown here — it belongs to the course.',
            },
          ],
        },
      ],
    },

    fr: {
      tagline: 'Un compilateur pour le langage Tiger, conçu et mené du texte source à l’exécutable',
      description:
        'Concevoir et produire un compilateur, en C++ : analyse lexicale, analyse syntaxique, liaison des noms, typage, objets et surcharge, désucrage et analyse des échappements — toute la chaîne, depuis le texte source jusqu’à l’endroit où LLVM prend le relais.',
      shots: {
        pipeline: {
          alt: 'Schéma de la chaîne de compilation Tiger : source.tig, analyse lexicale et syntaxique, analyse sémantique, réécriture de l’arbre, génération de code, exécutable.',
          caption: 'La chaîne d’un bout à l’autre : chaque étape consomme ce qu’a produit la précédente. L’assemblage et l’édition de liens reviennent à LLVM ; tout ce qui est en amont, c’est le compilateur lui-même.',
        },
        ast: {
          alt: 'Une expression Tiger d’une ligne, au-dessus de l’arbre qu’un analyseur syntaxique en tire : un nœud If sur une comparaison, un entier et une multiplication.',
          caption: 'Ce que produit l’analyse syntaxique : la même expression, en arbre. Figure de principe — le code du projet n’est pas montré ici.',
        },
      },
      sections: [
        {
          id: 'front',
          kicker: '01',
          title: 'Du texte à un arbre',
          blocks: [
            {
              type: 'text',
              content:
                'L’analyse lexicale transforme des caractères en jetons et jette ce qui ne porte pas de sens — espaces, commentaires — tout en gardant la position de chaque chose, parce que c’est cette position que désignera plus tard chaque message d’erreur.',
            },
            {
              type: 'text',
              content:
                'L’analyse syntaxique décide ensuite de ce que les jetons veulent dire ensemble. `if a = 0 then 1 else a * 2` n’a rien d’ambigu pour un lecteur, mais une grammaire doit énoncer que `*` lie plus fort que `=`, et qu’un `else` appartient au `if` le plus proche. Ce qui en sort est un arbre où il ne reste pas une parenthèse : la forme porte les priorités.',
            },
            { type: 'media', shot: 'ast' },
          ],
        },
        {
          id: 'bind',
          kicker: '02',
          title: 'Lier et typer',
          blocks: [
            {
              type: 'text',
              content:
                'La liaison répond à une question par identifiant : à quelle déclaration ce nom renvoie-t-il ? Les portées s’ouvrent et se ferment, le masquage est licite, et une erreur ici est silencieuse — le programme compile toujours, il fait simplement autre chose.',
            },
            {
              type: 'text',
              content:
                'Le typage est l’endroit où l’on juge un compilateur, et pas sur les programmes qu’il accepte. Refuser un mauvais programme est à la portée de tout le monde ; le travail consiste à dire où il se trompe et pourquoi, sur la ligne que l’utilisateur a écrite, sans transformer une erreur en vingt.',
            },
            {
              type: 'text',
              content:
                'Les objets et la surcharge prolongent cette passe plus qu’ils ne la suivent : choisir entre deux méthodes de même nom suppose de connaître le type des arguments, donc que la liaison et le typage soient déjà justes.',
            },
          ],
        },
        {
          id: 'rewrite',
          kicker: '03',
          title: 'Réécrire l’arbre',
          blocks: [
            {
              type: 'text',
              content:
                'Le désucrage supprime des constructions en les ramenant à d’autres, plus simples, qui marchent déjà — la suite de la chaîne a alors moins de cas à traiter, et chacun d’eux est déjà éprouvé.',
            },
            {
              type: 'text',
              content:
                'L’analyse des échappements demande quelles variables ne peuvent pas vivre dans un registre : celles qu’une fonction imbriquée lit ou écrit, puisqu’elle les atteint à travers le bloc d’activation englobant. Se tromper coûte cher dans les deux sens — trop strict, tout part en mémoire ; trop laxiste, la fonction imbriquée lit dans le bloc une case que la variable, gardée en registre, n’a jamais atteinte.',
            },
          ],
        },
        {
          id: 'inherited',
          kicker: '04',
          title: 'Écrire dans du code qui existe déjà',
          blocks: [
            {
              type: 'text',
              content:
                'Le projet part du squelette du cours plutôt que d’une page blanche : une architecture, des conventions et une représentation de l’arbre étaient là, et le premier travail consiste à trouver où une nouvelle passe se branche. C’est l’exercice le plus réaliste — presque aucun code professionnel ne démarre vide.',
            },
            {
              type: 'text',
              content:
                'Ce que j’ai écrit va de l’analyse lexicale à l’analyse des échappements ; la descente vers LLVM était déjà en place. Le code, lui, n’est pas montré ici : il appartient au cours.',
            },
          ],
        },
      ],
    },

    de: {
      tagline: 'Ein Compiler für die Sprache Tiger, entworfen und vom Quelltext bis zum Programm geführt',
      description:
        'Einen Compiler entwerfen und bauen, in C++: lexikalische und syntaktische Analyse, Namensbindung, Typprüfung, Objekte und Überladung, Entzuckerung und Escape-Analyse — die ganze Kette vom Quelltext bis dorthin, wo LLVM übernimmt.',
      shots: {
        pipeline: {
          alt: 'Schema der Tiger-Übersetzungskette: source.tig, Frontend, semantische Analyse, Umschreiben des Baums, Codeerzeugung, ausführbares Programm.',
          caption: 'Die Kette von Anfang bis Ende: jede Stufe verarbeitet, was die vorige erzeugt hat. Assemblieren und Binden übernimmt LLVM; alles davor ist der Compiler selbst.',
        },
        ast: {
          alt: 'Ein einzeiliger Tiger-Ausdruck über dem Baum, den ein Parser daraus baut: ein If-Knoten über einem Vergleich, einer ganzen Zahl und einer Multiplikation.',
          caption: 'Was die syntaktische Analyse erzeugt: derselbe Ausdruck als Baum. Ein Prinzipschema — der Code des Projekts wird hier nicht gezeigt.',
        },
      },
      sections: [
        {
          id: 'front',
          kicker: '01',
          title: 'Vom Text zum Baum',
          blocks: [
            {
              type: 'text',
              content:
                'Die lexikalische Analyse macht aus Zeichen Tokens und wirft weg, was keine Bedeutung trägt — Leerraum, Kommentare — behält aber die Position von allem, denn auf diese Position zeigt später jede Fehlermeldung.',
            },
            {
              type: 'text',
              content:
                'Die syntaktische Analyse entscheidet dann, was die Tokens zusammen bedeuten. `if a = 0 then 1 else a * 2` ist für einen Leser eindeutig, aber eine Grammatik muss festlegen, dass `*` stärker bindet als `=` und dass ein `else` zum nächstgelegenen `if` gehört. Heraus kommt ein Baum ohne eine einzige Klammer: die Form trägt die Vorrangregeln.',
            },
            { type: 'media', shot: 'ast' },
          ],
        },
        {
          id: 'bind',
          kicker: '02',
          title: 'Binden und typen',
          blocks: [
            {
              type: 'text',
              content:
                'Die Bindung beantwortet je Bezeichner eine Frage: auf welche Deklaration verweist dieser Name? Gültigkeitsbereiche öffnen und schließen sich, Verdecken ist erlaubt, und ein Fehler hier bleibt stumm — das Programm übersetzt weiterhin, es tut nur etwas anderes.',
            },
            {
              type: 'text',
              content:
                'An der Typprüfung wird ein Compiler gemessen, und nicht an den Programmen, die er annimmt. Ein schlechtes Programm abzulehnen kann jeder; die Arbeit besteht darin zu sagen, wo es schiefgeht und warum, in der Zeile, die der Benutzer geschrieben hat, ohne aus einem Fehler zwanzig zu machen.',
            },
            {
              type: 'text',
              content:
                'Objekte und Überladung verlängern diesen Durchlauf eher, als dass sie ihm folgen: zwischen zwei gleichnamigen Methoden zu wählen setzt voraus, die Typen der Argumente zu kennen — also dass Bindung und Typprüfung bereits stimmen.',
            },
          ],
        },
        {
          id: 'rewrite',
          kicker: '03',
          title: 'Den Baum umschreiben',
          blocks: [
            {
              type: 'text',
              content:
                'Die Entzuckerung entfernt Konstrukte, indem sie sie auf einfachere zurückführt, die bereits funktionieren — das Backend hat dann weniger Fälle zu behandeln, und jeder davon ist schon erprobt.',
            },
            {
              type: 'text',
              content:
                'Die Escape-Analyse fragt, welche Variablen nicht in einem Register leben können: jene, die eine verschachtelte Funktion liest oder schreibt, denn sie erreicht sie über den umgebenden Rahmen. Ein Fehlurteil kostet in beide Richtungen — zu streng, und alles landet im Speicher; zu locker, und die verschachtelte Funktion liest im Rahmen einen Platz, den die im Register gehaltene Variable nie erreicht hat.',
            },
          ],
        },
        {
          id: 'inherited',
          kicker: '04',
          title: 'In bestehendem Code schreiben',
          blocks: [
            {
              type: 'text',
              content:
                'Das Projekt beginnt beim Gerüst aus dem Kurs statt beim leeren Blatt: eine Architektur, Konventionen und eine Baumdarstellung waren bereits da, und die erste Aufgabe besteht darin herauszufinden, wo ein neuer Durchlauf ansetzt. Das ist die realistischere Übung: kaum ein professionelles Projekt beginnt leer.',
            },
            {
              type: 'text',
              content:
                'Was ich geschrieben habe, reicht von der lexikalischen Analyse bis zur Escape-Analyse; die Übersetzung nach LLVM war bereits vorhanden. Der Code selbst wird hier nicht gezeigt — er gehört zum Kurs.',
            },
          ],
        },
      ],
    },
  },
};
const neuralTexture: ProjectDef = {
  slug: 'neural-texture',
  category: 'rendering',
  title: 'Neural Texture Compression',
  tone: 'purple',
  status: 'wip',
  tech: ['PyTorch', 'WebGPU', 'WGSL', 'Python', 'NumPy'],
  tags: ['python', 'gpu', 'rendering', 'deep-learning'],
  metrics: ['2.59 bpp', '38.9 dB', '×24.7'],
  repo: 'https://github.com/adprogit/mini_neural_texture_compr',

  shots: {
    viewer: { image: ntcViewerImage },
    rate: { image: ntcRateImage, background: 'light' },
  },
  cover: 'viewer',
  gallery: ['viewer', 'rate'],

  text: {
    /* ── English ─────────────────────────────────────────────────── */
    en: {
      tagline: 'A whole PBR material in two latent grids and one tiny MLP, decoded per pixel on the GPU',
      description:
        'Albedo, normal, roughness and ambient occlusion are compressed together instead of one by one, then decoded in a WebGPU compute pass — one MLP evaluation per screen pixel. At 2.59 bpp it holds 38.9 dB, 4.7 dB above a resampling baseline at the same rate.',
      shots: {
        viewer: {
          alt: 'Two renders of a wooden floor side by side, nearly identical: original maps on the left, neural decode on the right.',
          caption: 'Lit view, zoom ×2. Left of the seam: the original maps. Right: the neural decode at 2.59 bpp.',
        },
        rate: {
          alt: 'Scatter plot of PSNR against bit rate: six neural configurations well above the rising baseline curve.',
          caption: 'Six configurations against the baseline. The gap widens with latent precision, not with latent count.',
        },
      },
      sections: [
        {
          id: 'latents',
          kicker: '01',
          title: 'Two grids, one MLP',
          blocks: [
            {
              type: 'text',
              content:
                'BC7 encodes every map of a material separately, always at 8 bpp — even though the albedo, the normal and the roughness of one wood floor describe the same planks. Here the eight channels are stacked and learned together.',
            },
            {
              type: 'list',
              items: [
                'Two feature grids, at a quarter and an eighth of the texture resolution, eight features each, sampled bilinearly.',
                'One decoder shared by every texel: an MLP of 16 → 64 → 64 → 8 with ReLU.',
                'Quantization-aware training: float first, then one quantization step of uniform noise injected into the grids over the last 40 % of the run, and a hard quantization to 2, 4 or 8 bits at the end.',
              ],
            },
            {
              type: 'text',
              content:
                'What leaves the trainer is two grids and about 5,600 weights — for a 1024² material, 2.59 bits per pixel, a factor of 24.7 against the raw maps.',
            },
          ],
        },
        {
          id: 'gpu',
          kicker: '02',
          title: 'Decoding per pixel',
          blocks: [
            {
              type: 'text',
              content:
                'A GPU samples a texture wherever it wants, whenever it wants. A codec is only usable if a single texel can be decoded without touching its neighbours — so the decode runs in a compute pass, one MLP evaluation per screen pixel.',
            },
            { type: 'code', snippet: 'ntcDispatch', caption: 'The compute pass: screen pixel, view transform, MLP, storage texture.' },
            {
              type: 'text',
              content:
                'The MLP is not read from memory but written into the shader. A JavaScript generator bakes the layer sizes and the weight offsets in as constants, and packs the weights as vec4 rows so that one row of the matrix is four dot products.',
            },
            { type: 'code', snippet: 'ntcLayer', caption: 'One generated layer. The loop bounds are literals: the compiler can unroll them.' },
            {
              type: 'text',
              content:
                'Both sides had to agree to the texel. With exact bilinear interpolation the WGSL decoder matches the PyTorch reconstruction to within 1/255 — rounding only. Handed to the GPU’s hardware filter, whose interpolation weights carry fewer bits, the gap opens to 2–4 levels out of 255.',
            },
          ],
        },
        {
          id: 'quality',
          kicker: '03',
          title: 'What it costs',
          blocks: [
            {
              type: 'chart',
              dataset: 'ntcRate',
              title: 'Bit rate',
              note: 'BC7 is here for its fixed rate only: the pipeline has no BC7 encoder, so nothing is claimed about its quality.',
            },
            {
              type: 'chart',
              dataset: 'ntcQuality',
              title: 'PSNR over all eight channels',
              note: 'The baseline downsamples every map to the same rate and upsamples it bilinearly.',
            },
            {
              type: 'text',
              content:
                'At four bits the codec gains 4.7 dB over the baseline. At two, the gain falls to 0.7 dB: that is where this quantization scheme gives out.',
            },
            { type: 'media', shot: 'rate' },
            {
              type: 'text',
              content:
                'The rate–distortion plot says which knob to turn. At a fixed budget, precision beats quantity: at 1.33 bpp, four features at four bits reach 38.4 dB where eight features at two bits stop at 34.3.',
            },
            {
              type: 'text',
              content:
                'Decoding a 1080p frame costs 67.3 ms on an integrated Iris Xe — 2.07 M pixels × 5,632 multiply-adds, about 23 GFLOP. The viewer stays usable because it caches the decode and re-runs it only on zoom, pan or resize; lighting and the A/B split read that cache.',
            },
          ],
        },
        {
          id: 'limits',
          kicker: '04',
          title: 'What is missing',
          blocks: [
            {
              type: 'text',
              content:
                'This is a reduced re-implementation of Vaidyanathan et al., SIGGRAPH 2023. What the paper has and this does not:',
            },
            {
              type: 'list',
              items: [
                'No mip levels — one latent pyramid for the whole chain in the paper, level 0 only here.',
                'No positional encoding of the position inside a latent cell.',
                'Weights kept in fp32 in the demo, fp16 assumed in the bit-rate count; no cooperative-vector inference.',
                'Latents stored in 8-bit textures: the values sit exactly on the 2- and 4-bit grid, but they are not packed.',
                'One material, and no BC7 encoder to compare against at matched rates.',
              ],
            },
          ],
        },
      ],
    },

    /* ── Français ────────────────────────────────────────────────── */
    fr: {
      tagline: 'Un matériau PBR entier dans deux grilles latentes et un MLP minuscule, décodé par pixel sur le GPU',
      description:
        'Albédo, normale, rugosité et occlusion ambiante sont compressés ensemble plutôt qu’un par un, puis décodés dans une passe de calcul WebGPU — une évaluation de MLP par pixel écran. À 2,59 bpp, le codec tient 38,9 dB, soit 4,7 dB au-dessus d’un rééchantillonnage au même débit.',
      shots: {
        viewer: {
          alt: 'Deux rendus d’un parquet côte à côte, presque identiques : les cartes d’origine à gauche, le décodage neural à droite.',
          caption: 'Vue éclairée, zoom ×2. À gauche de la couture : les cartes d’origine. À droite : le décodage neural à 2,59 bpp.',
        },
        rate: {
          alt: 'Nuage de points du PSNR en fonction du débit : six configurations neurales nettement au-dessus de la courbe montante de la référence.',
          caption: 'Six configurations contre la référence. L’écart se creuse avec la précision des latents, pas avec leur nombre.',
        },
      },
      sections: [
        {
          id: 'latents',
          kicker: '01',
          title: 'Deux grilles, un MLP',
          blocks: [
            {
              type: 'text',
              content:
                'BC7 encode chaque carte d’un matériau séparément, toujours à 8 bpp — alors que l’albédo, la normale et la rugosité d’un même parquet décrivent les mêmes lames. Ici, les huit canaux sont empilés et appris ensemble.',
            },
            {
              type: 'list',
              items: [
                'Deux grilles de caractéristiques, au quart et au huitième de la résolution de la texture, huit canaux chacune, échantillonnées bilinéairement.',
                'Un décodeur partagé par tous les texels : un MLP 16 → 64 → 64 → 8, activation ReLU.',
                'Entraînement conscient de la quantification : en flottant d’abord, puis un pas de quantification de bruit uniforme injecté dans les grilles sur les 40 derniers pour cent, et une quantification dure à 2, 4 ou 8 bits à la fin.',
              ],
            },
            {
              type: 'text',
              content:
                'Ce qui sort de l’entraînement, ce sont deux grilles et environ 5 600 poids — pour un matériau en 1024², 2,59 bits par pixel, un facteur 24,7 contre les cartes brutes.',
            },
          ],
        },
        {
          id: 'gpu',
          kicker: '02',
          title: 'Décoder pixel par pixel',
          blocks: [
            {
              type: 'text',
              content:
                'Un GPU échantillonne une texture où il veut, quand il veut. Un codec ne lui sert que si un texel se décode seul, sans rien devoir à ses voisins — d’où une passe de calcul, une évaluation de MLP par pixel écran.',
            },
            { type: 'code', snippet: 'ntcDispatch', caption: 'La passe de calcul : pixel écran, transformation de vue, MLP, texture de stockage.' },
            {
              type: 'text',
              content:
                'Le MLP n’est pas lu en mémoire, il est écrit dans le shader. Un générateur JavaScript y fige les tailles de couches et les décalages de poids en constantes, et range les poids en lignes de vec4 : une ligne de la matrice devient quatre produits scalaires.',
            },
            { type: 'code', snippet: 'ntcLayer', caption: 'Une couche générée. Les bornes de boucle sont des littéraux : le compilateur peut les dérouler.' },
            {
              type: 'text',
              content:
                'Restait à faire tomber les deux implémentations d’accord au texel près. Avec une interpolation bilinéaire exacte, le décodeur WGSL retrouve la reconstruction PyTorch à 1/255 — de l’arrondi, rien d’autre. Confié au filtre matériel du GPU, dont les poids d’interpolation portent moins de bits, l’écart monte à 2 à 4 niveaux sur 255.',
            },
          ],
        },
        {
          id: 'quality',
          kicker: '03',
          title: 'Ce que ça coûte',
          blocks: [
            {
              type: 'chart',
              dataset: 'ntcRate',
              title: 'Débit',
              note: 'BC7 ne figure ici que pour son débit fixe : la chaîne n’a pas d’encodeur BC7, donc rien n’est avancé sur sa qualité.',
            },
            {
              type: 'chart',
              dataset: 'ntcQuality',
              title: 'PSNR sur les huit canaux',
              note: 'La référence rééchantillonne chaque carte au même débit, puis la rétablit par interpolation bilinéaire.',
            },
            {
              type: 'text',
              content:
                'À quatre bits, le codec gagne 4,7 dB sur la référence. À deux, le gain retombe à 0,7 dB : c’est là que ce schéma de quantification lâche.',
            },
            { type: 'media', shot: 'rate' },
            {
              type: 'text',
              content:
                'La courbe débit–distorsion dit sur quel bouton appuyer. À budget fixé, la précision l’emporte sur la quantité : à 1,33 bpp, quatre canaux à quatre bits atteignent 38,4 dB là où huit canaux à deux bits s’arrêtent à 34,3.',
            },
            {
              type: 'text',
              content:
                'Décoder une image en 1080p coûte 67,3 ms sur un Iris Xe intégré — 2,07 M de pixels × 5 632 multiplications-additions, environ 23 GFLOP. La visionneuse reste utilisable parce qu’elle met le décodage en cache et ne le rejoue qu’au zoom, au déplacement ou au redimensionnement ; l’éclairage et la coupe A/B relisent ce cache.',
            },
          ],
        },
        {
          id: 'limits',
          kicker: '04',
          title: 'Ce qui manque',
          blocks: [
            {
              type: 'text',
              content:
                'C’est une réimplémentation réduite de Vaidyanathan et al., SIGGRAPH 2023. Ce que l’article a et que celle-ci n’a pas :',
            },
            {
              type: 'list',
              items: [
                'Pas de niveaux de mip — une pyramide de latents pour toute la chaîne dans l’article, le niveau 0 seulement ici.',
                'Pas d’encodage positionnel de la position dans une cellule latente.',
                'Poids gardés en fp32 dans la démo, fp16 supposé dans le calcul du débit ; pas d’inférence par vecteurs coopératifs.',
                'Latents stockés dans des textures 8 bits : les valeurs tombent exactement sur la grille 2 et 4 bits, mais elles ne sont pas empaquetées.',
                'Un seul matériau, et pas d’encodeur BC7 pour comparer à débit égal.',
              ],
            },
          ],
        },
      ],
    },

    /* ── Deutsch ─────────────────────────────────────────────────── */
    de: {
      tagline: 'Ein ganzes PBR-Material in zwei latenten Gittern und einem winzigen MLP, pro Pixel auf der GPU dekodiert',
      description:
        'Albedo, Normale, Rauheit und Umgebungsverdeckung werden gemeinsam komprimiert statt einzeln und dann in einem WebGPU-Compute-Pass dekodiert — eine MLP-Auswertung pro Bildschirmpixel. Bei 2,59 bpp hält der Codec 38,9 dB, 4,7 dB über einer Neuabtastung bei gleicher Rate.',
      shots: {
        viewer: {
          alt: 'Zwei Darstellungen eines Holzbodens nebeneinander, fast identisch: links die Originalkarten, rechts die neuronale Dekodierung.',
          caption: 'Beleuchtete Ansicht, Zoom ×2. Links der Naht: die Originalkarten. Rechts: die neuronale Dekodierung bei 2,59 bpp.',
        },
        rate: {
          alt: 'Streudiagramm PSNR über Bitrate: sechs neuronale Konfigurationen deutlich über der ansteigenden Referenzkurve.',
          caption: 'Sechs Konfigurationen gegen die Referenz. Der Abstand wächst mit der Präzision der Latents, nicht mit ihrer Anzahl.',
        },
      },
      sections: [
        {
          id: 'latents',
          kicker: '01',
          title: 'Zwei Gitter, ein MLP',
          blocks: [
            {
              type: 'text',
              content:
                'BC7 kodiert jede Karte eines Materials einzeln, immer mit 8 bpp — obwohl Albedo, Normale und Rauheit desselben Holzbodens dieselben Dielen beschreiben. Hier werden die acht Kanäle gestapelt und gemeinsam gelernt.',
            },
            {
              type: 'list',
              items: [
                'Zwei Merkmalsgitter, bei einem Viertel und einem Achtel der Texturauflösung, je acht Merkmale, bilinear abgetastet.',
                'Ein Dekoder für alle Texel: ein MLP 16 → 64 → 64 → 8 mit ReLU.',
                'Quantisierungsbewusstes Training: zuerst in Gleitkomma, dann ein Quantisierungsschritt gleichverteilten Rauschens in den Gittern über die letzten 40 Prozent, am Ende harte Quantisierung auf 2, 4 oder 8 Bit.',
              ],
            },
            {
              type: 'text',
              content:
                'Aus dem Training kommen zwei Gitter und rund 5 600 Gewichte — für ein Material in 1024² sind das 2,59 Bit pro Pixel, Faktor 24,7 gegenüber den rohen Karten.',
            },
          ],
        },
        {
          id: 'gpu',
          kicker: '02',
          title: 'Pixel für Pixel dekodieren',
          blocks: [
            {
              type: 'text',
              content:
                'Eine GPU tastet eine Textur ab, wo und wann sie will. Ein Codec nützt ihr nur, wenn sich ein Texel allein dekodieren lässt, ohne seine Nachbarn — daher ein Compute-Pass, eine MLP-Auswertung pro Bildschirmpixel.',
            },
            { type: 'code', snippet: 'ntcDispatch', caption: 'Der Compute-Pass: Bildschirmpixel, Sichttransformation, MLP, Speichertextur.' },
            {
              type: 'text',
              content:
                'Das MLP wird nicht aus dem Speicher gelesen, sondern in den Shader geschrieben. Ein JavaScript-Generator friert Schichtgrößen und Gewichtsversätze als Konstanten ein und legt die Gewichte als vec4-Zeilen ab: eine Matrixzeile wird zu vier Skalarprodukten.',
            },
            { type: 'code', snippet: 'ntcLayer', caption: 'Eine generierte Schicht. Die Schleifengrenzen sind Literale — der Compiler kann sie ausrollen.' },
            {
              type: 'text',
              content:
                'Blieb, beide Implementierungen texelgenau zur Deckung zu bringen. Mit exakter bilinearer Interpolation trifft der WGSL-Dekoder die PyTorch-Rekonstruktion auf 1/255 genau — reine Rundung. Überlässt man das dem Hardwarefilter der GPU, dessen Interpolationsgewichte weniger Bits tragen, wächst der Abstand auf 2 bis 4 Stufen von 255.',
            },
          ],
        },
        {
          id: 'quality',
          kicker: '03',
          title: 'Was es kostet',
          blocks: [
            {
              type: 'chart',
              dataset: 'ntcRate',
              title: 'Bitrate',
              note: 'BC7 steht hier nur für seine feste Rate: die Pipeline hat keinen BC7-Kodierer, über seine Qualität wird also nichts behauptet.',
            },
            {
              type: 'chart',
              dataset: 'ntcQuality',
              title: 'PSNR über alle acht Kanäle',
              note: 'Die Referenz tastet jede Karte auf dieselbe Rate herunter und bilinear wieder herauf.',
            },
            {
              type: 'text',
              content:
                'Bei vier Bit gewinnt der Codec 4,7 dB gegenüber der Referenz. Bei zwei fällt der Gewinn auf 0,7 dB — dort gibt dieses Quantisierungsschema auf.',
            },
            { type: 'media', shot: 'rate' },
            {
              type: 'text',
              content:
                'Die Raten-Verzerrungs-Kurve sagt, an welcher Schraube zu drehen ist. Bei festem Budget schlägt Präzision die Menge: bei 1,33 bpp erreichen vier Merkmale mit vier Bit 38,4 dB, acht Merkmale mit zwei Bit bleiben bei 34,3.',
            },
            {
              type: 'text',
              content:
                'Ein Bild in 1080p zu dekodieren kostet 67,3 ms auf einer integrierten Iris Xe — 2,07 Mio. Pixel × 5 632 Multiplikationen-Additionen, etwa 23 GFLOP. Der Betrachter bleibt benutzbar, weil er die Dekodierung zwischenspeichert und nur bei Zoom, Verschiebung oder Größenänderung neu rechnet; Beleuchtung und A/B-Schnitt lesen diesen Zwischenspeicher.',
            },
          ],
        },
        {
          id: 'limits',
          kicker: '04',
          title: 'Was fehlt',
          blocks: [
            {
              type: 'text',
              content:
                'Dies ist eine reduzierte Neuimplementierung von Vaidyanathan et al., SIGGRAPH 2023. Was die Arbeit hat und diese nicht:',
            },
            {
              type: 'list',
              items: [
                'Keine Mip-Stufen — im Paper eine Latent-Pyramide für die ganze Kette, hier nur Stufe 0.',
                'Keine Positionskodierung der Lage innerhalb einer Latent-Zelle.',
                'Gewichte in der Demo in fp32, fp16 in der Ratenrechnung angenommen; keine Inferenz über kooperative Vektoren.',
                'Latents in 8-Bit-Texturen abgelegt: die Werte liegen exakt auf dem 2- und 4-Bit-Raster, gepackt sind sie aber nicht.',
                'Ein einziges Material, und kein BC7-Kodierer für einen Vergleich bei gleicher Rate.',
              ],
            },
          ],
        },
      ],
    },
  },
};

const definitions: ProjectDef[] = [
  /*
   * L'ordre d'affichage, et sa seule source. Les projets sortent d'ici tels
   * quels — `getProjects` ne trie plus rien, `getProjectGroups` se contente de
   * les répartir par famille en conservant leur rang.
   *
   * Il se lit donc comme la page : rendu d'abord, vision ensuite, langages
   * pour finir ; et dans chaque famille, du plus abouti au plus ouvert.
   */

  // Rendu & GPU
  raymarcher,
  toongl,
  cudaMotion,
  neuralTexture, // en cours : il ferme la marche

  // Vision & imagerie
  pulmonix,
  unet,
  automata,
  sudoku,

  // Langages & systèmes
  tiger,
  sh42,
];

/* ── Résolution : définition + langue → objet prêt à afficher ──────── */

/** Un visuel, texte inclus. */
export interface ResolvedShot extends Shot {
  alt: string;
  caption: string;
  /** GIF animé : à servir tel quel, sans passer par le pipeline d’images. */
  animated: boolean;
}

/** Une vidéo, texte inclus. */
export interface ResolvedClip extends Clip {
  alt: string;
  caption: string;
}

export interface ResolvedChart {
  title: string;
  note?: string;
  unit: string;
  better: 'high' | 'low';
  bars: readonly { label: string; value: number }[];
}

export type ResolvedBlock =
  | { type: 'text'; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; lang: string; code: string; caption?: string; source?: string }
  | { type: 'media'; shot: ResolvedShot }
  | { type: 'video'; clip: ResolvedClip }
  | { type: 'chart'; chart: ResolvedChart }
  | { type: 'live' }
  | { type: 'diagram'; diagram: DiagramKey; caption: string }
  | { type: 'placeholder' };

export interface ResolvedSection {
  id: string;
  kicker: string;
  title: string;
  blocks: ResolvedBlock[];
}

export interface ResolvedProject {
  slug: string;
  title: string;
  category: Category;
  tone: Tone;
  status?: 'wip';
  tech: string[];
  tags: Tag[];
  metrics?: string[];
  repo?: string;
  tagline: string;
  description: string;
  cover: ResolvedShot;
  /** Vidéo d’ouverture de la page projet, si le projet en a une. */
  lead?: ResolvedClip;
  gallery: ResolvedShot[];
  sections: ResolvedSection[];
}

function resolveShot(def: ProjectDef, key: string, locale: Locale): ResolvedShot {
  const shot = def.shots[key];
  const text = def.text[locale].shots[key];
  if (!shot || !text) {
    throw new Error(`Visuel « ${key} » incomplet pour ${def.slug} (${locale}).`);
  }
  return { ...shot, ...text, animated: shot.image.format === 'gif' };
}

function resolveClip(def: ProjectDef, key: string, locale: Locale): ResolvedClip {
  const clip = def.clips?.[key];
  const text = def.text[locale].shots[key];
  if (!clip || !text) {
    throw new Error(`Vidéo « ${key} » incomplète pour ${def.slug} (${locale}).`);
  }
  return { ...clip, ...text };
}

/** Un bloc de code : l'extrait partagé, sa langue, et d'où il vient. */
function resolveCode(block: Extract<Block, { type: 'code' }>): ResolvedBlock {
  const snippet: { lang: string; code: string; source?: string } = snippets[block.snippet];
  return {
    type: 'code',
    lang: snippet.lang,
    code: snippet.code,
    caption: block.caption,
    source: snippet.source,
  };
}

/**
 * Les sections d'une note. Une note peut porter des images — celles d'un
 * rapport, par exemple —, mais pas de vidéo ni de rendu en direct. Les images
 * lui viennent par `resolveShot`, que la note fournit avec sa propre table de
 * visuels ; sans lui, un bloc `media` est une erreur d'écriture, qui casse la
 * compilation plutôt que la page.
 */
export function resolveSections(
  sections: Section[],
  where: string,
  resolveShot?: (key: string) => ResolvedShot
): ResolvedSection[] {
  return sections.map((section) => ({
    ...section,
    blocks: section.blocks.map((block): ResolvedBlock => {
      if (block.type === 'code') return resolveCode(block);
      if (block.type === 'chart') {
        const { unit, better, bars } = datasets[block.dataset];
        return {
          type: 'chart',
          chart: { title: block.title, note: block.note, unit, better, bars },
        };
      }
      if (block.type === 'media' && resolveShot) {
        return { type: 'media', shot: resolveShot(block.shot) };
      }
      if (block.type === 'media' || block.type === 'video' || block.type === 'live') {
        throw new Error(`Bloc « ${block.type} » interdit dans ${where}.`);
      }
      return block;
    }),
  }));
}

function resolveProject(def: ProjectDef, locale: Locale): ResolvedProject {
  const text = def.text[locale];

  return {
    slug: def.slug,
    title: def.title,
    category: def.category,
    tone: def.tone,
    status: def.status,
    tech: def.tech,
    tags: def.tags,
    metrics: def.metrics,
    repo: def.repo,
    tagline: text.tagline,
    description: text.description,
    cover: resolveShot(def, def.cover, locale),
    lead: def.leadClip ? resolveClip(def, def.leadClip, locale) : undefined,
    gallery: def.gallery.map((key) => resolveShot(def, key, locale)),
    sections: text.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block): ResolvedBlock => {
        if (block.type === 'code') return resolveCode(block);
        if (block.type === 'media') {
          return { type: 'media', shot: resolveShot(def, block.shot, locale) };
        }
        if (block.type === 'video') {
          return { type: 'video', clip: resolveClip(def, block.clip, locale) };
        }
        if (block.type === 'chart') {
          const { unit, better, bars } = datasets[block.dataset];
          return {
            type: 'chart',
            chart: { title: block.title, note: block.note, unit, better, bars },
          };
        }
        return block;
      }),
    })),
  };
}

/**
 * Tous les projets d’une langue, **dans l’ordre du tableau `definitions`**.
 *
 * Il n’y a plus de tri du tout. Les projets étaient rangés par année, mais les
 * années ne s’affichent plus : un ordre qu’on ne peut pas lire sur la page est
 * un ordre qu’on ne peut pas corriger. Réordonner la liste, c’est déplacer une
 * ligne dans `definitions`, et le résultat est exactement ce qu’on y lit.
 */
export function getProjects(locale: Locale): ResolvedProject[] {
  return definitions.map((def) => resolveProject(def, locale));
}

/**
 * Range une liste déjà résolue par famille. Elle prend la liste plutôt que la
 * langue pour que les objets rendus soient exactement ceux de `getProjects` —
 * l’accueil y cherche le rang de chaque projet, ce qu’une seconde résolution
 * rendrait faux. Une famille sans projet ne ressort pas.
 *
 * `filter` conserve l’ordre : dans chaque famille, les projets sortent donc
 * dans l’ordre de `definitions`, et nulle part ailleurs.
 */
export function getProjectGroups(projects: ResolvedProject[]) {
  return categoryOrder
    .map((category) => ({
      category,
      projects: projects.filter((project) => project.category === category),
    }))
    .filter((group) => group.projects.length > 0);
}

/** Une entrée par projet et par langue — sert aux `getStaticPaths`. */
export const projectRoutes = definitions.flatMap((def) =>
  locales.map((locale) => ({ slug: def.slug, locale, project: resolveProject(def, locale) }))
);

/**
 * L’accent d’un ton, sous deux formes — la même couleur, deux usages.
 *
 * `toneText` est une classe Tailwind, écrite en toutes lettres : sans cela le
 * compilateur ne la voit pas et ne l’émet pas. `toneVar` est la variable CSS
 * elle-même, à passer en style inline là où c’est une *valeur* qu’il faut et
 * pas une classe — `--row-accent` sur une ligne de projet, par exemple.
 */
export const toneText: Record<Tone, string> = {
  cyan: 'text-accent-cyan',
  green: 'text-accent-green',
  orange: 'text-accent-orange',
  pink: 'text-accent-pink',
  purple: 'text-accent-purple',
  yellow: 'text-accent-yellow',
};

export const toneVar: Record<Tone, string> = {
  cyan: 'var(--color-accent-cyan)',
  green: 'var(--color-accent-green)',
  orange: 'var(--color-accent-orange)',
  pink: 'var(--color-accent-pink)',
  purple: 'var(--color-accent-purple)',
  yellow: 'var(--color-accent-yellow)',
};
